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
urllib3.disable_warnings()

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


def probe_sites(session):
    banner("Step 3: Site-by-site REST API test")
    for site_url in SITES:
        info(f"\nTesting: {site_url}")
        endpoints = [
            ("/_api/web/Title",       lambda d: f"title='{d.get('d',{}).get('value','?')}'"),
            ("/_api/web?$select=Title", lambda d: f"title='{d.get('d',{}).get('Title','?')}'"),
            ("/_api/web",             lambda d: f"title='{d.get('d',{}).get('Title','?')}'"),
        ]
        connected = False
        for path, extract in endpoints:
            url = site_url + path
            try:
                r = session.get(url, timeout=TIMEOUT)
                if r.status_code == 200:
                    try:
                        result = extract(r.json())
                        ok(f"Connected: {result}  [{path}]")
                    except Exception:
                        ok(f"Connected: HTTP 200  [{path}]")
                    connected = True

                    # List document libraries
                    libs_url = site_url + "/_api/web/lists?$filter=BaseTemplate eq 101 and Hidden eq false&$select=Title"
                    r2 = session.get(libs_url, timeout=TIMEOUT)
                    if r2.status_code == 200:
                        libs = r2.json().get("d",{}).get("results",[])
                        ok(f"Document libraries ({len(libs)}):")
                        for lib in libs[:8]:
                            info(f"   -> {lib.get('Title','?')}")
                    break
                else:
                    info(f"  HTTP {r.status_code} <- {path}")
            except Exception as e:
                info(f"  Error: {e} <- {path}")

        if not connected:
            fail(f"Could not connect to {site_url}")
            info("The site path may differ on the internal host.")
            info("Check your browser URL when accessing this site on VPN.")

    # Try to list all top-level sites
    banner("Step 4: Discover available sites on this host")
    try:
        r = session.get(f"{SP_BASE}/_api/web/webs?$select=Title,Url", timeout=TIMEOUT)
        if r.status_code == 200:
            webs = r.json().get("d",{}).get("results",[])
            if webs:
                ok(f"Found {len(webs)} sub-sites:")
                for w in webs[:20]:
                    info(f"  -> {w.get('Url','?')}  ({w.get('Title','?')})")
            else:
                info("No sub-sites listed (may need site collection admin)")
        else:
            info(f"Site listing: HTTP {r.status_code}")
    except Exception as e:
        info(f"Site listing error: {e}")


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
