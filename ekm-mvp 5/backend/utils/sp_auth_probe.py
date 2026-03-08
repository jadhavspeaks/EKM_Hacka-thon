"""
SharePoint Auth & Connection Probe
────────────────────────────────────
Diagnoses exactly what is reachable and tests NTLM credentials.

Usage (from Anaconda Prompt, inside backend folder):
    python utils/sp_auth_probe.py

It tests:
  1. Raw network reachability  — can Python reach SharePoint at all?
  2. Auth method detection     — what does SharePoint say it supports?
  3. NTLM credentials test     — do your username+password actually work?
  4. REST API access           — can we read site pages and document libraries?
  5. Both sites                — tests cc-ee (Sites/Wiki) and AutoCon (Teams/Docs)

Results tell you exactly what to put in .env.
"""

import sys
import os
import requests
import urllib3
urllib3.disable_warnings()

# ── Fill in your Windows credentials ─────────────────────────────────────────
USERNAME = os.environ.get("SHAREPOINT_USERNAME", "")   # firstname.lastname@citi.com
PASSWORD = os.environ.get("SHAREPOINT_PASSWORD", "")   # Windows/AD password

SITES = [
    "https://citi.sharepoint.com/sites/cc-ee",     # Wiki / Sites
    "https://citi.sharepoint.com/teams/AutoCon",   # Teams / Documents
]

# ─────────────────────────────────────────────────────────────────────────────

def banner(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def ok(msg):   print(f"  ✅  {msg}")
def fail(msg): print(f"  ❌  {msg}")
def warn(msg): print(f"  ⚠️   {msg}")
def info(msg): print(f"  ℹ️   {msg}")


def probe_raw(site_url: str):
    """Test basic TCP/HTTP reachability — no auth."""
    banner(f"1. Raw reachability: {site_url.split('/')[2]}")
    try:
        r = requests.get(
            f"{site_url}/_api/web",
            verify=False, timeout=15,
            allow_redirects=False,
        )
        if r.status_code in (200, 301, 302, 401, 403):
            ok(f"HTTP {r.status_code} — SharePoint is reachable")
        else:
            warn(f"HTTP {r.status_code} — unexpected, may still work")

        # Show auth challenge headers — key diagnostic info
        auth_header = r.headers.get("WWW-Authenticate", "")
        if auth_header:
            ok(f"WWW-Authenticate: {auth_header[:120]}")
            if "NTLM" in auth_header:
                ok("NTLM is listed → requests-ntlm will work")
            if "Negotiate" in auth_header:
                ok("Negotiate is listed → Kerberos or NTLM both possible")
            if "Bearer" in auth_header or "OAuth" in auth_header:
                warn("Bearer/OAuth in header — Azure AD auth, may need token")
        else:
            info("No WWW-Authenticate header (site may be open or already authenticated)")

        forms_auth = r.headers.get("X-Forms_Based_Auth_Required", "")
        if forms_auth:
            warn(f"Forms-based auth: {forms_auth}")

        return r.status_code

    except requests.exceptions.ConnectionError as e:
        fail(f"Connection refused / DNS failure: {e}")
        fail("SharePoint is not reachable from this machine / network")
        return None
    except requests.exceptions.Timeout:
        fail("Timed out — SharePoint not responding (Zscaler blocking?)")
        return None
    except Exception as e:
        fail(f"Unexpected error: {e}")
        return None


def probe_ntlm(site_url: str, username: str, password: str):
    """Test NTLM auth with real credentials."""
    banner(f"2. NTLM authentication: {site_url.split('/')[-1]}")

    if not username or not password:
        fail("USERNAME and PASSWORD not set")
        info("Set them in .env OR edit USERNAME/PASSWORD at the top of this script")
        return False

    try:
        from requests_ntlm import HttpNtlmAuth
    except ImportError:
        fail("requests-ntlm not installed")
        info("Run: pip install requests-ntlm  (or: pip install requests-ntlm --break-system-packages)")
        return False

    info(f"Testing as: {username}")

    # --- Test 1: Get site title (most basic API call)
    try:
        session = requests.Session()
        session.auth   = HttpNtlmAuth(username, password)
        session.verify = False
        session.headers.update({"Accept": "application/json;odata=verbose"})

        r = session.get(f"{site_url}/_api/web/Title", timeout=30)

        if r.status_code == 200:
            try:
                title = r.json().get("d", {}).get("value", "?")
                ok(f"NTLM auth SUCCESS — site title: '{title}'")
            except Exception:
                ok(f"NTLM auth SUCCESS — HTTP 200 (couldn't parse title)")
        elif r.status_code == 401:
            fail("401 Unauthorized — credentials rejected")
            info("Try alternative formats:")
            info("  firstname.lastname@citi.com  (email format)")
            info("  CITI\\firstname.lastname      (domain\\username)")
            info("  firstname.lastname           (short username)")
            return False
        elif r.status_code == 403:
            warn("403 Forbidden — authenticated but no read permission on this site")
            warn("Request site access from the site owner")
            return False
        else:
            warn(f"HTTP {r.status_code} — unexpected response")
            info(f"Body: {r.text[:200]}")
            return False

    except Exception as e:
        fail(f"NTLM request failed: {e}")
        return False

    # --- Test 2: List site pages
    print()
    info("Testing Site Pages access...")
    try:
        r = session.get(
            f"{site_url}/_api/web/lists/getbytitle('Site Pages')/items"
            "?$select=Title,Modified&$top=5",
            timeout=30
        )
        if r.status_code == 200:
            items = r.json().get("d", {}).get("results", [])
            ok(f"Site Pages: {len(items)} pages visible (showing up to 5)")
            for item in items:
                info(f"  → {item.get('Title', 'Untitled')} (modified {item.get('Modified','?')[:10]})")
        else:
            warn(f"Site Pages returned HTTP {r.status_code}")
    except Exception as e:
        warn(f"Site Pages test failed: {e}")

    # --- Test 3: List document libraries
    print()
    info("Testing Document Libraries access...")
    try:
        r = session.get(
            f"{site_url}/_api/web/lists"
            "?$filter=BaseTemplate eq 101 and Hidden eq false"
            "&$select=Title",
            timeout=30
        )
        if r.status_code == 200:
            libs = r.json().get("d", {}).get("results", [])
            skip = {"style library","site assets","form templates","site collection documents","site pages"}
            visible = [l for l in libs if l.get("Title","").lower() not in skip]
            ok(f"Document Libraries: {len(visible)} found")
            for lib in visible:
                info(f"  → {lib.get('Title','?')}")
        else:
            warn(f"Libraries returned HTTP {r.status_code}")
    except Exception as e:
        warn(f"Libraries test failed: {e}")

    return True


def check_env():
    banner("0. Pre-flight checks")
    # requests-ntlm
    try:
        import requests_ntlm
        ok("requests-ntlm is installed")
    except ImportError:
        fail("requests-ntlm NOT installed")
        info("Fix: pip install requests-ntlm --break-system-packages")
        print()

    # .env credentials
    import pathlib
    env_path = pathlib.Path(__file__).parent.parent / ".env"
    has_user = has_pass = False
    if env_path.exists():
        env_text = env_path.read_text()
        has_user = "SHAREPOINT_USERNAME=" in env_text and \
                   not env_text.split("SHAREPOINT_USERNAME=")[-1].split("\n")[0].strip() == ""
        has_pass = "SHAREPOINT_PASSWORD=" in env_text and \
                   not env_text.split("SHAREPOINT_PASSWORD=")[-1].split("\n")[0].strip() == ""
        ok(".env found") if env_path.exists() else fail(".env not found")
        ok("SHAREPOINT_USERNAME set in .env") if has_user else warn("SHAREPOINT_USERNAME empty in .env")
        ok("SHAREPOINT_PASSWORD set in .env") if has_pass else warn("SHAREPOINT_PASSWORD empty in .env")
    else:
        warn(".env not found at expected location")

    # sharepoint_sites.txt
    sites_path = pathlib.Path(__file__).parent.parent.parent / "sharepoint_sites.txt"
    if sites_path.exists():
        urls = [l.strip() for l in sites_path.read_text().splitlines()
                if l.strip() and not l.startswith("#")]
        ok(f"sharepoint_sites.txt found with {len(urls)} URL(s):")
        for u in urls:
            info(f"  → {u}")
    else:
        warn("sharepoint_sites.txt not found")


# ─────────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "="*60)
    print("  EKM — SharePoint Auth & Connection Probe")
    print("="*60)

    check_env()

    # Use env vars, then fall back to script-level USERNAME/PASSWORD
    usr = os.environ.get("SHAREPOINT_USERNAME", USERNAME).strip()
    pwd = os.environ.get("SHAREPOINT_PASSWORD", PASSWORD).strip()

    if not usr or not pwd:
        banner("⚠️  Credentials not set")
        print("""
  Option A — add to backend/.env:
    SHAREPOINT_USERNAME=firstname.lastname@citi.com
    SHAREPOINT_PASSWORD=your-windows-password

  Option B — edit this script directly:
    USERNAME = "firstname.lastname@citi.com"
    PASSWORD = "your-windows-password"

  Then re-run:
    python utils/sp_auth_probe.py
""")
        # Still test raw reachability
        for site in SITES:
            probe_raw(site)
        sys.exit(1)

    all_ok = True
    for site in SITES:
        print(f"\n{'─'*60}")
        print(f"  SITE: {site}")
        print(f"{'─'*60}")
        status = probe_raw(site)
        if status:
            result = probe_ntlm(site, usr, pwd)
            all_ok = all_ok and result

    banner("Summary")
    if all_ok:
        ok("Both sites authenticated successfully!")
        ok("SharePoint sync is ready to run.")
        print("""
  Next steps:
    1. Make sure backend/.env has:
         SHAREPOINT_USERNAME=firstname.lastname@citi.com
         SHAREPOINT_PASSWORD=your-windows-password
    2. Restart uvicorn
    3. Dashboard → SharePoint tile → Sync
""")
    else:
        fail("One or more sites failed authentication.")
        print("""
  Troubleshooting:
    1. Try different username formats:
         firstname.lastname@citi.com
         CITI\\firstname.lastname
    2. Confirm your Windows password (same one for VPN/laptop login)
    3. Check you have read access to both sites in your browser first
    4. Re-run this script after fixing credentials
""")
