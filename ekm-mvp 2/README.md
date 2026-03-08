<div align="center">

<img src="https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white"/>
<img src="https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white"/>
<img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black"/>
<img src="https://img.shields.io/badge/MongoDB-7.0-47A248?style=for-the-badge&logo=mongodb&logoColor=white"/>
<img src="https://img.shields.io/badge/Status-MVP_v3.1-0D9488?style=for-the-badge"/>

# 🧠 Enterprise Knowledge Management (EKM)

**One Search. Every Source. Zero Silos.**

EKM unifies **SharePoint**, **Confluence**, **Jira**, and **GitHub Enterprise** into a single MongoDB-backed search engine — with BM25 relevance ranking, SME identification, entity extraction, code intelligence, and a full intelligence layer covering risk, velocity, gaps, handovers and learning paths.

[Features](#-features) · [Intelligence Layer](#-intelligence-layer) · [Architecture](#-architecture) · [Quick Start](#-quick-start) · [Configuration](#-configuration) · [API Reference](#-api-reference) · [Changelog](#-changelog) · [Roadmap](#-roadmap)

</div>

---

## 💡 Why EKM?

> Employees at large organisations spend **up to 20% of their working week** searching for information — one full day per person, per week, wasted.

Knowledge lives in silos. Engineers work in Jira. Processes live in Confluence. Policies sit in SharePoint. Code history is buried in GitHub. When someone needs an answer, they search four tools, skim dozens of results, and still might not find it.

**The hidden costs:**
- **£104K+/year** per 10-person team at fully loaded cost rates
- **3–6 months** new joiner ramp time with no structured learning path
- **2 days** to compile audit evidence that EKM delivers in one click
- **60% of knowledge** lost when an SME or vendor exits

**EKM fixes this** — one query, every source, instant results, with intelligence on top.

---

## ✨ Features

### Core Search
- 🔍 **BM25 full-text search** — relevance-ranked results across all sources
- 🏷️ **Source filtering** — narrow to SharePoint / Confluence / Jira / GitHub instantly
- 📖 **Confluence-first results** — Official Documentation section rendered above Related Activity
- 🔄 **Incremental + Force Full sync** — incremental by default; Force Full toggle in UI
- 📊 **Live dashboard** — per-source doc counts, sync status, activity log
- 🔎 **Fuzzy fallback** — word-level regex fallback when exact match returns nothing
- ⌨️ **Global `/` keyboard search** — press `/` anywhere to open search modal
- 👤 **Person-intent detection** — "what Jadhav has worked on" → profile banner + related docs

### SME Panel
- Compact right sidebar (never full-page) showing top 5 experts ranked by relevance
- Vendor / Internal / Unknown classification based on `[TECH NE]`, `[ICG-IT NE]`, `[ICG NE]` name suffixes
- Contribution breakdown: authored, assigned, commented, resolved
- Recency-weighted scoring (×1.5 within 30d, ×1.2 within 90d, ×0.7 older)

### Code Intelligence (GitHub)
- 📦 Commit indexing, source file crawl, PR indexing
- 🔍 **Explain this code** — 4-signal analysis: Jira cross-link, PR body, diff analysis, architecture docs

---

## 🧠 Intelligence Layer

10 tabs built entirely on existing indexed data, accessible via left sidebar:

| Tab | What it shows |
|-----|---------------|
| 📊 **Analytics** | Search volume chart, top queries with bars, zero-result gaps, source usage, day-of-week distribution, live recent searches feed |
| 📈 **Velocity** | 12-month stacked bar chart per source, trend up/down/flat, debug endpoint for date format diagnosis |
| 🔴 **Risk & Vendors** | Vendor dependency alerts, concentration risk levels 🔴🟠🟡🟢 |
| ❤️ **Health** | Freshness %, Jira↔Confluence link audit, stale docs |
| 🕳️ **Knowledge Gaps** | Systems active in Jira/GitHub with zero documentation |
| ⚠️ **Experts At Risk** | SMEs inactive 90d+ or vendor knowledge concentration |
| 📋 **Coverage Score** | 0–100 score per system, grade A–F, missing sources |
| 📦 **Handover Tracker** | Full pack + auto-saved checklist + Teams button |
| 👤 **People** | Contributor profiles, clickable topic chips trigger search |
| 🎓 **Learning Path** | Shareable new joiner URLs, Confluence-first ordering |

### Intelligence → Dashboard shortcuts
Dashboard shortcuts cards navigate directly to the correct Intelligence tab using React Router state (`{ state: { tab: 'risk' } }`).

---

## 📊 Dashboard (v3.x — Bloomberg-style dark theme)

| KPI Card | Source |
|----------|--------|
| Total Documents | `db.documents.count_documents({})` |
| Searches / 30d | `db.search_logs` |
| Zero-Result Gaps | Unique zero-result queries in last 30d |
| At-Risk Experts | Distinct `[NE]`-named authors (vendor concentration) |

Other panels: Source Composition segmented bar · 7-day Search Volume bar chart · Top Queries list · Docs by Source horizontal bars · 6 Intelligence shortcut cards.

---

## 🎓 New Joiner Shareable URL

```
http://localhost:3000/join/payments-pipeline
```

No login required. Progress checkboxes. Completion banner. Copy link button.

---

## ⌨️ Global Search

Press `/` from anywhere → modal opens → type to search → `↑↓` navigate → `Enter` open → `Esc` close.

---

## 🔄 Force Full Sync

Dashboard has an **Incremental ↔ Force Full** toggle. Flip before Sync All to re-pull everything.

---

## 🏷️ Vendor Classification Logic

Names are classified using the following regex:

```python
# Vendor (NE = Near/External)
VENDOR_PATTERN = re.compile(r'\[[^\]]*\bNE\]\s*NE$', re.IGNORECASE)
# Examples: Singh, Abhay2 [TECH NE] → Vendor
#           Pagidela, Goutham Reddy [TECH NE] → Vendor

# Internal
INTERNAL_PATTERN = re.compile(r'\[[^\]]*\bTECH\b[^\]]*\]', re.IGNORECASE)
# Examples: Chavan, Jyoti Dinkar [TECH] → Internal
#           Gandhi, Mihir [TECH] → Internal
```

Used in: `sme_ranker.py`, `intelligence.py` (`_classify()`), `api.py` (dashboard at-risk count).

---

## Data Sources

| Source | Auth | Content | Status |
|--------|------|---------|--------|
| **Jira** (on-premise) | PAT token | Issues, comments, ADF bodies, metadata | ✅ 4,979+ docs |
| **Confluence** (on-premise) | PAT token | Pages, spaces, HTML → plain text | ✅ 88+ docs |
| **SharePoint Online** | Azure AD app | SitePages, document libraries | 🔜 Q2 2026 |
| **GitHub Enterprise** | PAT token | Commits, code files, pull requests | ✅ 90 docs |

### Source Boosts (BM25 re-ranking)
```python
SOURCE_BOOST = {
    "confluence":  1.20,
    "sharepoint":  1.10,
    "github":      1.00,
    "jira":        0.95,
}
```

---

## 🏗️ Architecture

```
DATA SOURCES → CONNECTORS → CORE ENGINE → INTELLIGENCE (10 tabs)

🎫 Jira ──────── jira.py ──────┐
📖 Confluence ── confluence.py ─┤  🍃 MongoDB       📊 Analytics
📋 SharePoint ── sharepoint.py ─┤  BM25 Full-text   📈 Velocity
💻 GitHub GHE ── github.py ─────┘  FastAPI           🔴 Risk & Vendors
                                    APScheduler       🕳️ Knowledge Gaps
                  bm25.py           /api/search       ⚠️ Experts At Risk
                  sme_ranker.py     /api/intelligence  📋 Coverage Score
                  extractor.py                        📦 Handover Tracker
                  code_explainer.py                   👤 People
                                                      🎓 Learning Path
```

> **Editable architecture diagrams**: `docs/EKM-Architecture.pptx` · `docs/EKM-Technical-Architecture.pptx` · `docs/EKM-Business-Architecture.pptx`

---

## 📁 Project Structure

```
ekm-mvp/
├── docs/
│   ├── EKM-Executive-Deck-v3.1.pptx     ← Latest exec deck
│   ├── EKM-Architecture.pptx            ← System component / data flow
│   ├── EKM-Technical-Architecture.pptx  ← Layered swim-lane technical arch
│   └── EKM-Business-Architecture.pptx   ← TOGAF-style business arch
├── backend/
│   ├── main.py                          ← FastAPI app, router mounts
│   ├── config.py                        ← Settings from .env
│   ├── database.py                      ← Motor async MongoDB client
│   ├── models.py                        ← Pydantic models
│   ├── connectors/
│   │   ├── jira.py                      ← Jira REST API + ADF parser
│   │   ├── confluence.py                ← Confluence REST + HTML→text
│   │   ├── sharepoint.py                ← SharePoint (Azure AD)
│   │   └── github.py                    ← GHE commits/PRs/files
│   ├── routes/
│   │   ├── search.py                    ← BM25, SME ranking, person-intent
│   │   ├── api.py                       ← Dashboard stats, sync, documents
│   │   ├── analytics.py                 ← Search logs, volume, gaps
│   │   ├── intelligence.py              ← All 10 intelligence endpoints
│   │   ├── people.py                    ← Contributor profiles
│   │   └── explain.py                   ← Code intelligence
│   └── utils/
│       ├── sync_service.py              ← Orchestrates connector runs
│       ├── bm25.py                      ← BM25 re-ranker + source boost
│       ├── sme_ranker.py                ← SME scoring + vendor classification
│       ├── extractor.py                 ← NLP entity extraction
│       ├── file_extractor.py            ← PDF/DOCX text extraction
│       └── code_explainer.py            ← 4-signal code analysis
└── frontend/src/
    ├── App.jsx                          ← Router, GlobalSearch, /join/:topic
    ├── api.js                           ← All API calls
    ├── index.html                       ← DM Sans + DM Mono + Bebas Neue fonts
    ├── pages/
    │   ├── Dashboard.jsx                ← Bloomberg dark theme, KPIs, shortcuts
    │   ├── Search.jsx                   ← Enterprise layout, profile banner, SME sidebar
    │   ├── Documents.jsx                ← Paginated document browser
    │   ├── Intelligence.jsx             ← 10-tab intelligence page + sidebar nav
    │   └── NewJoiner.jsx               ← Public /join/:topic page
    └── components/
        ├── UI.jsx                       ← Shared components, TeamsButton
        └── GlobalSearch.jsx             ← Global / keyboard search modal
```

---

## ⚡ Quick Start

```bash
# 1. Configure
cp .env.example backend/.env
# Edit backend/.env — see Configuration section below

# 2. Backend
conda activate ekm
cd backend
uvicorn main:app --reload
# → http://localhost:8000

# 3. Frontend (separate terminal)
cd frontend
npm run dev
# → http://localhost:3000

# 4. Initial sync
# Dashboard → Incremental/Force Full toggle → Sync All
# Or via API: POST /api/sync {"source_type": null, "force_full": true}
```

> ⚠️ **After any backend code change**: restart uvicorn to clear the 10-minute in-memory cache used by intelligence endpoints.

---

## ⚙️ Configuration (`backend/.env`)

```env
MONGO_URI=mongodb://user:pass@host:port/db
MONGO_DB=your_database

JIRA_URL=https://jira.company.com
JIRA_USERNAME=your.name@company.com
JIRA_API_TOKEN=your-pat-token

CONFLUENCE_URL=https://confluence.company.com/confluence
CONFLUENCE_USERNAME=your.name@company.com
CONFLUENCE_API_TOKEN=your-pat-token

GITHUB_HOST=github.yourcompany.com
GITHUB_TOKEN=your-ghe-pat-token
GITHUB_REPOS=org/repo1,org/repo2

SHAREPOINT_SITE_URLS=https://company.sharepoint.com/sites/site1

SYNC_INTERVAL_MINUTES=60
TEAMS_DOMAIN=citi.com
```

---

## 📡 API Reference

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/search?q={query}&source_type={src}&page={n}` | BM25 search, SME ranking, person-intent detection |

**Response includes:**
```json
{
  "query": "ingestion pipeline",
  "total": 72,
  "results": [...],
  "smes": [{ "name": "...", "score": 18.5, "type": "internal", "roles": [...] }],
  "best_answer": "...",
  "person_query": "Jadhav, Nishantchandra",
  "fuzzy": false
}
```

### Sync
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sync` | `{"source_type": "jira" \| null, "force_full": false}` |
| `GET` | `/api/sync/logs` | Recent sync history |
| `GET` | `/api/sources` | Dashboard stats per source |
| `GET` | `/api/documents?source_type=&page=` | Paginated document browser |

### Analytics
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/stats?days=30` | Volume, top queries, zero-result gaps, DoW, hourly, recent feed |
| `GET` | `/api/analytics/searches` | Raw recent search history |

### Intelligence
| Method | Endpoint | Cache | Description |
|--------|----------|-------|-------------|
| `GET` | `/api/intelligence/health` | 10 min | Content freshness, stale docs |
| `GET` | `/api/intelligence/risk` | 10 min | Vendor dependency risk |
| `GET` | `/api/intelligence/velocity?topic=` | — | 12-month activity chart |
| `GET` | `/api/intelligence/velocity/debug` | — | Diagnose date format issues |
| `GET` | `/api/intelligence/gaps` | 10 min | Undocumented systems |
| `GET` | `/api/intelligence/experts-at-risk` | 10 min | Inactive / vendor SMEs |
| `GET` | `/api/intelligence/coverage` | 10 min | Coverage score per topic |
| `GET` | `/api/intelligence/onboarding?topic=` | — | Structured learning path |
| `GET` | `/api/intelligence/handover/{name}` | — | Full handover pack |
| `POST` | `/api/intelligence/handover/{name}/progress` | — | Save checklist progress |
| `GET` | `/api/intelligence/handover/{name}/progress` | — | Load saved checklist |

### People
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/people/search?q={name}` | Search contributors |
| `GET` | `/api/people/{name}` | Full contribution profile |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/config` | App config (teams_domain etc.) |
| `GET` | `/api/explain/{doc_id}` | 4-signal code intelligence |

---

## 🔌 Intelligence Endpoint Details

### `/api/intelligence/velocity/debug`
Diagnose why the velocity chart shows empty data:
```json
{
  "total_docs": 2789,
  "with_updated_at": 2789,
  "updated_at_bson_date": 0,
  "updated_at_string": 2789,
  "bson_dates_in_last_12mo": 0,
  "note": "If updated_at_string > 0 and bson_dates_in_last_12mo == 0, velocity uses string parsing fallback",
  "sample": [...]
}
```
If `updated_at_string > 0` — velocity will still work (Python parses ISO strings directly).  
If both are 0 — documents have no date fields, run a Force Full sync.

### `/api/intelligence/risk` — risk levels
```
🔴 Critical  >50% of topic docs from vendor authors
🟠 High      >30%
🟡 Medium    >10%
🟢 Low       ≤10%
```

---

## 📈 Changelog

### v3.3 (March 2026)
- **SharePoint NTLM connector** — `requests-ntlm` added to requirements; connector handles both `/sites/` (Wiki pages) and `/teams/` (document libraries) automatically
- **`GET /api/sync/sharepoint-test`** — new endpoint tests NTLM connectivity per-site without running a full sync; returns site title, page count, and library list per URL
- **SharePointTile on Dashboard** — dedicated tile with **Test Connection** button; shows live result panel: ✅ site title + page count + libraries, ❌ auth failure with credential format hints, ⚠️ no credentials with exact `.env` instructions; Sync button only appears after a successful test
- **`sp_auth_probe.py` rewritten** — full credential probe script: raw reachability, NTLM auth test, Site Pages count, library listing, clear ✅/❌/⚠️ output with troubleshooting steps
- **`sharepoint_sites.txt`** — pre-configured with `sites/cc-ee` (Wiki) and `teams/AutoCon` (Teams Documents)

### v3.3 (March 2026)
- **SharePoint — ready to connect** — NTLM auth path proven; `requests-ntlm` added to requirements; connector tags wiki pages (`sites/`) and team documents (`teams/`) distinctly in search
- **`sp_setup.py`** — one-shot setup script: installs dep, tests reachability, runs NTLM auth against both sites, shows page + library counts, prints exact `.env` lines — `python utils/sp_setup.py`
- **`sp_auth_probe.py`** — rewritten: tests raw reachability, NTLM handshake, site pages + libraries per site; clear ✅/❌ output with fix instructions
- **`/api/sync/sharepoint-test`** — new backend endpoint: connection test without running a full sync; returns per-site status, title, page count, library list
- **Dashboard → SharePoint tile** — new `SharePointTile` component: shows "Test Connection" button, expands to show per-site pass/fail, page counts, library list; "Sync" only appears after successful test
- **Site-type awareness** — `/sites/` URLs = Wiki mode (Site Pages + Libraries); `/teams/` URLs = Docs mode (Libraries only); tagged accordingly in MongoDB and surfaced correctly in search filters
- **`sharepoint_sites.txt`** — updated comments clarifying which URL is Wiki vs Team docs

### v3.2 (March 2026)
- **Document Preview Drawer** — click any result in Search or Documents to open a full slide-in panel; source-specific layouts for Jira (status/priority/assignee/comments), Confluence (breadcrumb ancestors, content), GitHub (commit/PR/file with mono code view); shows extracted entities, tags, Teams button, copy URL; close with Esc or backdrop click
- **Confluence Space selector** — SourceTile on Dashboard now has a ⚙️ Configure button that expands a panel listing all accessible spaces (fetched live via `/api/sync/sources-meta`); multi-select checkboxes; "Sync C147873A" instead of generic "Sync"; clears to "All" for full sync
- **Jira Project selector** — same pattern for Jira; shows all accessible projects with key, name, type badges
- **Backend `/api/sync/sources-meta`** — new endpoint that calls Confluence `list_spaces()` and Jira `list_projects()` in parallel and returns `{confluence_spaces, jira_projects}`
- **`SyncRequest` model** — new `spaces_override` and `projects_override` fields; connectors accept these as override lists, falling back to `.env` config when empty
- **`api.js`** — `triggerSync(src, forceFull, spacesOverride, projectsOverride)` updated; `getSyncSourcesMeta()` added

### v3.1 (March 2026)
- **Search redesign** — enterprise clean light theme; compact SME sidebar (≤224px, not full-page); person-intent shows profile banner instead of SME panel; suggested searches on empty state; Confluence "Official Documentation" section
- **SME type fix** — `sme_ranker.py` now classifies Vendor/Internal/Unknown on every result; `[TECH NE]` was wrongly showing "Internal" in all previous versions
- **Analytics overhaul** — rich multi-panel layout: daily volume filled-gap chart, top queries with mini-bars, zero-result gap list, source filter bars, day-of-week chart, live recent searches feed
- **Analytics backend** — `analytics.py` now returns `dow_distribution`, `hourly_distribution`, filled `daily_volume` (every day in range), `recent_searches`
- **At-Risk Experts KPI** — fixed broken async in `api.py` `_experts_at_risk_count()` (was calling `run_in_executor` incorrectly, silently returning 0)
- **Velocity** — full rewrite handles both ISO string dates and BSON Date types; new `/api/intelligence/velocity/debug` diagnostic endpoint; expanded all-time fallback
- **Dashboard shortcuts** — clicking shortcut cards navigates to exact Intelligence tab via `navigate('/intelligence', { state: { tab: '...' } })`
- **Exec Deck** bumped to v3.1

### v3.0 (March 2026)
- **Dashboard** — full executive rebuild: Bloomberg/Palantir dark theme (`#07111f` bg, `#0d1f35` cards), DM Mono numbers, KPI strip with sparklines, 7-day bar chart, teal accent lines, pulsing beacon dots
- **Intelligence sidebar** — dark navy theme (`#0a1628`), 4 grouped sections, teal active state
- **NE vendor detection fix** — regex rewritten: `r'\[[^\]]*\bNE\]|\s+NE$'` — catches `[ICG-IT NE]`, `[ICG NE]`, `[TECH NE]`, bare trailing `NE`
- **Confluence section split** — Official Documentation (purple header) rendered before Related Activity in search
- **People tab** — "Top Topics" chips clickable (trigger search); "Contributions by Source" static
- **Fonts** — DM Sans + DM Mono + Bebas Neue via Google Fonts in `index.html`
- **Intelligence tab routing** — dashboard shortcuts + `useEffect` on `location.state` for direct tab navigation

### v2.0 (February 2026)
- Intelligence layer: 10 tabs (Analytics, Velocity, Risk, Health, Gaps, Experts At Risk, Coverage, Handover, People, Learning Path)
- Knowledge Velocity 12-month chart
- Handover Tracker with auto-saved checklist
- New Joiner shareable URLs (`/join/:topic`)
- Global `/` keyboard search modal
- Force Full Sync UI toggle
- Teams deep-link buttons throughout
- Coverage Score A–F grading per system

### v1.0 (January 2026)
- Unified BM25 search across Jira + Confluence + GitHub
- SME ranking + entity extraction
- Code intelligence (4-signal explain)
- Dashboard with sync controls

---

## 🗺️ Roadmap

### ✅ Phase 1 — MVP v3.1 (Complete)
- [x] Unified BM25 search — 4 sources
- [x] SME ranking, entity extraction, code intelligence
- [x] 10-tab intelligence layer
- [x] Knowledge Velocity, Gaps, Experts At Risk, Coverage, Handover
- [x] New Joiner shareable URLs
- [x] Global `/` keyboard search
- [x] Force Full Sync UI toggle
- [x] Teams deep-link buttons
- [x] Bloomberg-style executive dashboard
- [x] Correct Vendor/Internal classification ([TECH NE] = Vendor)
- [x] Rich Analytics with DoW / hourly / recent feed
- [x] Person-intent search with profile banner
- [x] Velocity debug endpoint

### Phase 2 — Workflow & Alerts
- [ ] Saved searches + email alerts
- [ ] Weekly knowledge digest email
- [ ] Jira webhook → auto-doc-check
- [ ] Export analytics to PDF / CSV

### Phase 3 — Enterprise Security
- [ ] SSO (Azure AD / Okta)
- [ ] SharePoint Azure AD registration (Q2 2026)
- [ ] Role-based access control
- [ ] Audit log (GDPR)

### Phase 4 — Additional Sources
- [ ] ServiceNow, Slack, Google Drive

### Phase 5 — AI Layer
- [ ] RAG-based Q&A (Claude API)
- [ ] Knowledge graph visualisation
- [ ] Duplicate detection + merge suggestions
- [ ] Auto-generated documentation stubs for gaps

---

<div align="center">
Built as an enterprise MVP · Python + FastAPI + React + MongoDB · v3.1 · March 2026
</div>
