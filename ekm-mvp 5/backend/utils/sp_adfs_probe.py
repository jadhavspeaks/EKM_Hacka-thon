"""
SharePoint Internal Host Probe
================================
Internal SharePoint is at: share.nam.nsroot.net:443
NTLM domain: nam  (use NAM\\username)

This probe:
  1. Tests raw TCP reachability of share.nam.nsroot.net
  2. Tests NTLM auth with NAM\\username format
  3. Tests REST API on both sites
  4. Discovers actual site paths if cc-ee / AutoCon differ internally

Usage (from Anaconda Prompt, inside backend folder):
    python utils/sp_adfs_probe.py
"""

import os, sys, re, requests, urllib3
from pathlib import Path
urllib3.disable_warnings()

def _load_dotenv():
    for candidate in [
        Path(__file__).parent.parent / ".env",
        Path(__file__).parent.parent.parent / ".env",
        Path.cwd() / ".env",
        Path.cwd().parent / ".env",
    ]:
        if candidate.exists():
            print(f"  [INFO] Loading .env from: {candidate}")
            for line in candidate.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, _, val = line.partition("=")
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = val
            return
    print("  [WARN] No .env file found")

_load_dotenv()

USERNAME = os.environ.get("SHAREPOINT_USERNAME", "")
PASSWORD = os.environ.get("SHAREPOINT_PASSWORD", "")

SP_HOST  = "share.nam.nsroot.net"
SP_BASE  = f"https://{SP_HOST}"
DOMAIN   = "nam"
TIMEOUT  = 20

SITES = [
    f"{SP_BASE}/sites/cc-ee",
    f"{SP_BASE}/teams/AutoCon",
]

def banner(t): print(f"\n{'='*65}\n  {t}\n{'='*65}")
def ok(m):     print(f"  [OK]   {m}")
def fail(m):   print(f"  [FAIL] {m}")
def warn(m):   print(f"  [WARN] {m}")
def info(m):   print(f"  [INFO] {m}")


def probe_host():
    banner(f"Step 1: TCP reachability -> {SP_HOST}:443")
    try:
        r = requests.get(SP_BASE, verify=False, timeout=TIMEOUT, allow_redirects=False)
        ok(f"Host reachable: HTTP {r.status_code}")
        auth = r.headers.get("WWW-Authenticate", "")
        if auth:
            ok(f"WWW-Authenticate: {auth[:100]}")
            if "NTLM" in auth:     ok("NTLM supported - requests_ntlm will work")
            if "Negotiate" in auth: info("Negotiate also listed (Kerberos/NTLM)")
            if "Bearer" in auth:    warn("Bearer listed - may still require Azure AD")
        loc = r.headers.get("Location","")
        if loc: info(f"Redirect to: {loc[:120]}")
        return True
    except requests.exceptions.ConnectionError as e:
        fail(f"Cannot reach {SP_HOST}: {e}")
        fail("Host not reachable - check VPN / corporate network")
        return False
    except Exception as e:
        fail(f"Error: {e}")
        return False


def build_session(usr, pwd):
    """Build NTLM session with NAM\\username."""
    from requests_ntlm import HttpNtlmAuth
    # Normalise to NAM\username
    if "@" in usr:
        short = usr.split("@")[0]
        ntlm_user = f"{DOMAIN}\\{short}"
    elif "\\" not in usr:
        ntlm_user = f"{DOMAIN}\\{usr}"
    else:
        ntlm_user = usr
    info(f"NTLM user: {ntlm_user}")
    session = requests.Session()
    session.auth   = requests.auth.HTTPDigestAuth.__new__(requests.auth.HTTPDigestAuth)
    from requests_ntlm import HttpNtlmAuth
    session.auth   = HttpNtlmAuth(ntlm_user, pwd)
    session.verify = False
    session.headers["Accept"] = "application/json;odata=verbose"
    return session, ntlm_user


def probe_auth(usr, pwd):
    banner("Step 2: NTLM authentication")
    if not usr or not pwd:
        fail("Credentials not set. Add to backend/.env:")
        fail("  SHAREPOINT_USERNAME=nj38296@citi.com")
        fail("  SHAREPOINT_PASSWORD=your-windows-password")
        return None

    try:
        from requests_ntlm import HttpNtlmAuth
    except ImportError:
        fail("requests-ntlm not installed")
        fail("Run: pip install requests-ntlm --break-system-packages")
        return None

    session, ntlm_user = build_session(usr, pwd)

    # Test against root first
    test_url = f"{SP_BASE}/_api/web/Title"
    info(f"Testing: {test_url}")
    try:
        r = session.get(test_url, timeout=TIMEOUT)
        info(f"HTTP {r.status_code}")
        if r.status_code == 200:
            title = r.json().get("d", {}).get("value", "?")
            ok(f"Root auth SUCCESS - title: '{title}'")
            return session
        elif r.status_code == 401:
            fail("401 - credentials rejected")
            info("Try these formats in .env:")
            info(f"  SHAREPOINT_USERNAME={usr.split('@')[0]}  (short form)")
            info(f"  SHAREPOINT_USERNAME=NAM\\{usr.split('@')[0]}  (domain form)")
            info(f"  SHAREPOINT_USERNAME={usr}  (email form)")
        elif r.status_code == 404:
            warn("404 on root /_api/web/Title - trying site-specific URLs")
            return session  # may still work per-site
        else:
            warn(f"HTTP {r.status_code}: {r.text[:200]}")
    except Exception as e:
        fail(f"Request error: {e}")

    return None



SITE_PATH_PATTERNS = [
    "/sites/{name}", "/teams/{name}",
    "/sites/{name_lower}", "/teams/{name_lower}",
    "/sites/{name_upper}", "/teams/{name_upper}",
    "/{name}", "/sites/EE", "/sites/cc",
]

def _test_site_url(session, url):
    for path in ["/_api/web/Title", "/_api/web?$select=Title"]:
        try:
            r = session.get(url + path, timeout=TIMEOUT)
            if r.status_code == 200:
                d = r.json().get("d", {})
                title = d.get("value") or d.get("Title") or url.split("/")[-1]
                r2 = session.get(
                    url + "/_api/web/lists?$filter=BaseTemplate eq 101"
                    " and Hidden eq false&$select=Title", timeout=TIMEOUT)
                libs = []
                if r2.status_code == 200:
                    libs = [l.get("Title","?") for l in r2.json().get("d",{}).get("results",[])]
                return title, libs
        except Exception:
            pass
    return None


def probe_sites(session):
    banner("Step 3: Site path discovery")
    site_names = ["cc-ee", "AutoCon", "autocon", "auto-con", "ee", "cc", "CCEE", "autocon2"]
    info("Probing path variations (~30 seconds)...")
    found_sites = []

    for name in site_names:
        for pattern in SITE_PATH_PATTERNS:
            path = pattern.format(
                name=name,
                name_lower=name.lower(),
                name_upper=name.upper()
            )
            url = SP_BASE + path
            result = _test_site_url(session, url)
            if result:
                title, libs = result
                ok(f"FOUND: {url}")
                ok(f"  Title: {title}")
                if libs:
                    ok(f"  Libraries: {', '.join(libs[:6])}")
                found_sites.append(url)
                break

    if not found_sites:
        fail("No sites found with common path patterns.")
        info("Open the site in your browser on VPN, copy the URL,")
        info("and paste it into sharepoint_sites.txt")
    else:
        print()
        ok(f"Found {len(found_sites)} site(s). Update sharepoint_sites.txt:")
        for u in found_sites:
            print(f"    {u}")


    banner("Step 4: Search API - discover actual site paths")
    # Search API returned 200 - parse it properly to find site URLs
    search_url = f"{SP_BASE}/_api/search/query?querytext='*'&rowlimit=50&selectproperties='Title,Path,SiteName,WebTemplate'"
    try:
        r = session.get(search_url, timeout=TIMEOUT)
        info(f"Search query: HTTP {r.status_code}")
        if r.status_code == 200:
            d = r.json()
            # Navigate SharePoint search result structure
            try:
                rows = (d.get("d",{})
                         .get("query",{})
                         .get("PrimaryQueryResult",{})
                         .get("RelevantResults",{})
                         .get("Table",{})
                         .get("Rows",{})
                         .get("results", []))
                ok(f"Search returned {len(rows)} rows")
                site_urls_found = set()
                for row in rows:
                    cells = {c["Key"]: c["Value"] for c in row.get("Cells",{}).get("results",[])}
                    path  = cells.get("Path","")
                    title = cells.get("Title","")
                    if path and "/_api" not in path and "/Lists/" not in path:
                        # Extract site root from path
                        parts = path.replace(SP_BASE,"").split("/")
                        if len(parts) >= 3:
                            site_root = SP_BASE + "/" + parts[1] + "/" + parts[2]
                        else:
                            site_root = path
                        site_urls_found.add(site_root)
                        info(f"  Path: {path[:80]}  | Title: {title[:40]}")

                if site_urls_found:
                    print()
                    ok(f"Unique site roots found via search ({len(site_urls_found)}):")
                    for u in sorted(site_urls_found):
                        print(f"    {u}")

                    # Auto-write discovered URLs to sharepoint_sites.txt
                    sites_file = None
                    for candidate in [
                        Path(__file__).parent.parent.parent / "sharepoint_sites.txt",
                        Path(__file__).parent.parent / "sharepoint_sites.txt",
                        Path.cwd().parent / "sharepoint_sites.txt",
                        Path.cwd() / "sharepoint_sites.txt",
                    ]:
                        if candidate.exists():
                            sites_file = candidate
                            break

                    if sites_file:
                        lines = [
                            "# SharePoint Sites - auto-discovered by sp_adfs_probe.py",
                            "# Host: " + SP_HOST + " | NTLM domain: " + DOMAIN,
                            "# Edit this file to keep only the sites you want to index.",
                            "#",
                            "# SITE TYPES:",
                            "#   /sites/ -> Wiki mode  - crawls Site Pages + Document Libraries",
                            "#   /teams/ -> Docs mode  - crawls Document Libraries only",
                            "#",
                        ]
                        for u in sorted(site_urls_found):
                            lines.append(u)
                        sites_file.write_text("\n".join(lines) + "\n", encoding="utf-8")
                        print()
                        ok(f"AUTO-WRITTEN: {sites_file}")
                        ok(f"sharepoint_sites.txt updated with {len(site_urls_found)} discovered sites.")
                        ok("Review and remove any sites you don't want to index, then restart uvicorn and sync.")
                    else:
                        warn("Could not find sharepoint_sites.txt to auto-update.")
                        warn("Manually add the URLs above to sharepoint_sites.txt")
            except Exception as e:
                info(f"Search parse error: {e}")
                info(f"Raw response snippet: {str(d)[:500]}")
        else:
            info(f"Search returned: {r.text[:300]}")
    except Exception as e:
        fail(f"Search API error: {e}")

    banner("Step 5: Try search-based site enumeration")
    # Also try querying for SPSite content class
    for query in ["contentclass:STS_Site", "contentclass:STS_Web"]:
        url = f"{SP_BASE}/_api/search/query?querytext='{query}'&rowlimit=20&selectproperties='Title,Path'"
        try:
            r = session.get(url, timeout=TIMEOUT)
            info(f"HTTP {r.status_code} <- {query}")
            if r.status_code == 200:
                rows = (r.json().get("d",{})
                                .get("query",{})
                                .get("PrimaryQueryResult",{})
                                .get("RelevantResults",{})
                                .get("Table",{})
                                .get("Rows",{})
                                .get("results",[]))
                ok(f"  {query}: {len(rows)} results")
                for row in rows[:10]:
                    cells = {c["Key"]: c["Value"] for c in row.get("Cells",{}).get("results",[])}
                    info(f"    {cells.get('Path','?')}  |  {cells.get('Title','?')}")
        except Exception as e:
            info(f"  Error: {e}")

if __name__ == "__main__":
    print("\n" + "="*65)
    print("  EKM -- Internal SharePoint Probe")
    print(f"  Host: {SP_HOST}")
    print(f"  NTLM Domain: {DOMAIN}")
    print("="*65)

    usr = USERNAME.strip()
    pwd = PASSWORD.strip()

    reachable = probe_host()
    if not reachable:
        sys.exit(1)

    session = probe_auth(usr, pwd)
    if not session:
        sys.exit(1)

    probe_sites(session)

    banner("Done - check output above for connectivity results")
