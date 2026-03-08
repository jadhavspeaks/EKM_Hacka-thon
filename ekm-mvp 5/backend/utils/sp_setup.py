"""
SharePoint Setup & Test — Run This First
─────────────────────────────────────────
One script that installs the dependency, tests connectivity,
and tells you exactly what to add to .env.

Usage (Anaconda Prompt, inside backend folder):
    python utils/sp_setup.py

What it does:
  Step 1 — installs requests-ntlm if missing
  Step 2 — tests raw network reachability (no auth)
  Step 3 — reads credentials from .env (prompts if missing)
  Step 4 — tests NTLM auth on both sites
  Step 5 — shows what it can see (pages, libraries, file counts)
  Step 6 — prints exactly what to add to .env if not already set
"""

import sys
import os
import subprocess
import pathlib

ROOT    = pathlib.Path(__file__).parent.parent.parent
BACKEND = pathlib.Path(__file__).parent.parent
ENV     = BACKEND / ".env"

SITES = [
    ("https://citi.sharepoint.com/sites/cc-ee",   "Wiki content  (Site Pages)"),
    ("https://citi.sharepoint.com/teams/AutoCon",  "Team documents (Libraries)"),
]

W = "\033[93m"   # yellow
G = "\033[92m"   # green
R = "\033[91m"   # red
B = "\033[94m"   # blue
E = "\033[0m"    # reset
BOLD = "\033[1m"

def h(msg):  print(f"\n{BOLD}{B}{'─'*56}{E}\n{BOLD}  {msg}{E}\n{'─'*56}")
def ok(m):   print(f"  {G}✅  {m}{E}")
def fail(m): print(f"  {R}❌  {m}{E}")
def warn(m): print(f"  {W}⚠️   {m}{E}")
def info(m): print(f"     {m}")

# ── Step 1: Install requests-ntlm ────────────────────────────────────────────
h("Step 1 — Install requests-ntlm")
try:
    import requests_ntlm
    ok("requests-ntlm already installed")
except ImportError:
    warn("requests-ntlm not found — installing now...")
    result = subprocess.run(
        [sys.executable, "-m", "pip", "install", "requests-ntlm", "--break-system-packages", "-q"],
        capture_output=True, text=True
    )
    if result.returncode == 0:
        ok("requests-ntlm installed successfully")
        import requests_ntlm
    else:
        fail("Installation failed")
        info(result.stderr[:300])
        info("Try manually: pip install requests-ntlm --break-system-packages")
        sys.exit(1)

import requests, urllib3
urllib3.disable_warnings()
from requests_ntlm import HttpNtlmAuth

# ── Step 2: Network reachability ─────────────────────────────────────────────
h("Step 2 — Network reachability (no auth)")
reachable = True
for url, label in SITES:
    try:
        r = requests.get(f"{url}/_api/web", verify=False, timeout=10, allow_redirects=False)
        auth = r.headers.get("WWW-Authenticate", "")
        if r.status_code in (200, 301, 302, 401, 403):
            ok(f"HTTP {r.status_code} — {url.split('/')[-1]} ({label})")
            if "NTLM" in auth:
                ok("NTLM challenge received → NTLM auth will work")
            elif "Negotiate" in auth:
                ok("Negotiate challenge → NTLM/Kerberos supported")
            elif auth:
                warn(f"Auth header: {auth[:80]}")
        else:
            warn(f"HTTP {r.status_code} — {url}")
    except Exception as e:
        fail(f"{url.split('/')[-1]}: {e}")
        reachable = False

if not reachable:
    fail("One or more sites unreachable — check VPN / network")
    sys.exit(1)

# ── Step 3: Credentials ───────────────────────────────────────────────────────
h("Step 3 — Credentials")

def read_env_var(name: str) -> str:
    # Check environment first
    val = os.environ.get(name, "").strip()
    if val:
        return val
    # Read from .env file
    if ENV.exists():
        for line in ENV.read_text(encoding="utf-8").splitlines():
            if line.startswith(f"{name}="):
                val = line.split("=", 1)[1].strip().strip('"').strip("'")
                if val:
                    return val
    return ""

USERNAME = read_env_var("SHAREPOINT_USERNAME")
PASSWORD = read_env_var("SHAREPOINT_PASSWORD")

if USERNAME:
    ok(f"SHAREPOINT_USERNAME found: {USERNAME}")
else:
    warn("SHAREPOINT_USERNAME not set in .env")
    print()
    USERNAME = input("  Enter your Windows/AD username (firstname.lastname@citi.com): ").strip()

if PASSWORD:
    ok("SHAREPOINT_PASSWORD found: ✓ (hidden)")
else:
    warn("SHAREPOINT_PASSWORD not set in .env")
    import getpass
    print()
    PASSWORD = getpass.getpass("  Enter your Windows password: ").strip()

if not USERNAME or not PASSWORD:
    fail("Username and password required")
    sys.exit(1)

# ── Step 4: NTLM auth test ────────────────────────────────────────────────────
h("Step 4 — NTLM authentication test")

session = requests.Session()
session.auth   = HttpNtlmAuth(USERNAME, PASSWORD)
session.verify = False
session.headers["Accept"] = "application/json;odata=verbose"

all_ok = True
for url, label in SITES:
    site_name = url.split("/")[-1]
    print(f"\n  Testing {site_name} — {label}")
    is_teams = "/teams/" in url

    try:
        r = session.get(f"{url}/_api/web/Title", timeout=30)
        if r.status_code == 200:
            title = r.json().get("d", {}).get("value", site_name)
            ok(f"Auth SUCCESS → '{title}'")
        elif r.status_code == 401:
            fail(f"401 Unauthorized — wrong credentials")
            info("Try formats:")
            info(f"  {USERNAME.split('@')[0]}@citi.com")
            info(f"  CITI\\{USERNAME.split('@')[0]}")
            all_ok = False
            continue
        elif r.status_code == 403:
            warn(f"403 Forbidden — authenticated but no read permission")
            info("Request site access in your browser first")
            all_ok = False
            continue
        else:
            fail(f"HTTP {r.status_code}")
            all_ok = False
            continue

        # ── Step 5: What can we see ───────────────────────────────────────────
        print()
        info("What EKM will index:")

        if not is_teams:
            # Site Pages (Wiki)
            try:
                r2 = session.get(
                    f"{url}/_api/web/lists/getbytitle('Site Pages')/items"
                    "?$select=Title,Modified&$top=500", timeout=30
                )
                if r2.status_code == 200:
                    pages = r2.json().get("d", {}).get("results", [])
                    ok(f"📄 Site Pages (Wiki): {len(pages)} pages")
                    for p in pages[:3]:
                        info(f"    → {p.get('Title','Untitled')}")
                    if len(pages) > 3:
                        info(f"    … and {len(pages)-3} more")
            except Exception as e:
                warn(f"Could not list Site Pages: {e}")

        # Document Libraries
        try:
            r3 = session.get(
                f"{url}/_api/web/lists"
                "?$filter=BaseTemplate eq 101 and Hidden eq false"
                "&$select=Title,ItemCount",
                timeout=30
            )
            if r3.status_code == 200:
                skip = {"style library","site assets","form templates",
                        "site collection documents","site pages"}
                libs = [l for l in r3.json().get("d",{}).get("results",[])
                        if l.get("Title","").lower() not in skip]
                total_files = sum(l.get("ItemCount",0) for l in libs)
                ok(f"📁 Document Libraries: {len(libs)} libs, ~{total_files} files")
                for lib in libs:
                    info(f"    → {lib.get('Title','?')} ({lib.get('ItemCount',0)} items)")
        except Exception as e:
            warn(f"Could not list libraries: {e}")

    except Exception as e:
        fail(f"Request failed: {e}")
        all_ok = False

# ── Step 6: What to add to .env ──────────────────────────────────────────────
h("Step 6 — .env configuration")

if all_ok:
    ok("Both sites authenticated — ready to sync!")
    print()

    env_missing = not read_env_var("SHAREPOINT_USERNAME") or not read_env_var("SHAREPOINT_PASSWORD")
    if env_missing:
        print(f"  Add these lines to {B}backend/.env{E}:")
        print(f"\n  {'─'*50}")
        print(f"  {G}SHAREPOINT_USERNAME={USERNAME}{E}")
        print(f"  {G}SHAREPOINT_PASSWORD=your-windows-password{E}")
        print(f"  {'─'*50}\n")
    else:
        ok(".env already has credentials — no changes needed")

    print(f"""
  {BOLD}Next steps:{E}
    1. Restart uvicorn:  uvicorn main:app --reload
    2. Dashboard → SharePoint tile → Test Connection
    3. If test passes → Sync
    4. SharePoint docs will appear in search within minutes
""")
else:
    fail("One or more sites failed — fix credentials above and re-run")
    print(f"""
  {W}Troubleshooting:{E}
    1. Try different username format:
         firstname.lastname@citi.com   ← most common
         CITI\\firstname.lastname       ← legacy domain format
    2. Same password as Windows login / VPN
    3. Open both sites in your browser first to confirm you have access
    4. Re-run:  python utils/sp_setup.py
""")
