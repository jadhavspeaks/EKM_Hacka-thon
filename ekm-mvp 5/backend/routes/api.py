from fastapi import APIRouter, HTTPException, BackgroundTasks
from database import get_db
from models import SyncRequest, SourceType, DashboardStats, SourceStats, SyncStatus, DocumentOut
from utils.sync_service import run_sync
from bson import ObjectId
from datetime import datetime, timezone, timedelta
import asyncio
import uuid
import time

# ─── Job store ────────────────────────────────────────────────────────────────
# In-memory dict: job_id → state dict.
# Single-process uvicorn — this is safe and avoids Redis/DB overhead.
_JOBS: dict[str, dict] = {}
_JOBS_MAX = 100   # keep last 100 jobs; auto-evict oldest


def _evict_old_jobs():
    if len(_JOBS) > _JOBS_MAX:
        oldest = sorted(_JOBS, key=lambda k: _JOBS[k].get("started_at", 0))
        for k in oldest[:len(_JOBS) - _JOBS_MAX]:
            _JOBS.pop(k, None)


# ─── Sync Router ─────────────────────────────────────────────────────────────
sync_router = APIRouter(prefix="/api/sync", tags=["sync"])


@sync_router.post("")
async def trigger_sync(body: SyncRequest = SyncRequest(), background_tasks: BackgroundTasks = BackgroundTasks()):
    """
    Start a background sync. Returns job_id immediately.
    Poll GET /api/sync/status/{job_id} for live progress.
    """
    job_id = str(uuid.uuid4())
    source_label = body.source_type or "all"

    _JOBS[job_id] = {
        "job_id":     job_id,
        "source":     source_label,
        "status":     "queued",     # queued → fetching → writing → done / failed
        "phase":      "queued",
        "fetched":    0,
        "written":    0,
        "total":      0,
        "pct":        0,
        "added":      0,
        "updated":    0,
        "results":    {},
        "error":      None,
        "started_at": time.time(),
        "finished_at": None,
    }
    _evict_old_jobs()

    async def _run():
        job = _JOBS[job_id]
        job["status"] = "running"

        async def on_progress(phase: str, fetched: int, written: int, total: int):
            job["phase"]   = phase
            job["fetched"] = fetched
            job["written"] = written
            job["total"]   = total
            job["pct"]     = round(written / max(total, 1) * 100) if total > 0 else 0
            if phase == "done":
                job["status"]      = "done"
                job["pct"]         = 100
                job["finished_at"] = time.time()

        try:
            results = await run_sync(
                source_type       = body.source_type,
                force_full        = body.force_full,
                spaces_override   = body.spaces_override or None,
                projects_override = body.projects_override or None,
                on_progress       = on_progress,
            )
            job["results"] = results
            # Tally totals from results
            job["added"]   = sum(r.get("added",   0) for r in results.values())
            job["updated"] = sum(r.get("updated",  0) for r in results.values())
            if job["status"] != "done":
                job["status"]      = "done"
                job["finished_at"] = time.time()

            # Also bust the dashboard cache so GET /api/sources reflects new counts
            _bust_dashboard_cache()

        except Exception as e:
            job["status"]      = "failed"
            job["error"]       = str(e)
            job["finished_at"] = time.time()

    background_tasks.add_task(_run)
    return {"job_id": job_id, "source": source_label, "status": "queued"}


@sync_router.get("/status/{job_id}")
async def sync_status(job_id: str):
    """Live job status — poll every 2s from frontend."""
    job = _JOBS.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job


@sync_router.get("/sharepoint-test")
async def test_sharepoint():
    """
    Test SharePoint NTLM connectivity without running a full sync.
    Returns per-site connection status, title, page count, and library list.
    Fast — no file downloads.
    """
    from connectors.sharepoint import _make_session, _check_connection,         _get_libraries, _load_site_urls
    import asyncio

    site_urls = _load_site_urls()
    if not site_urls:
        return {
            "status": "not_configured",
            "message": "No URLs in sharepoint_sites.txt",
            "sites": []
        }

    session = _make_session()
    if not session:
        return {
            "status": "no_credentials",
            "message": "SHAREPOINT_USERNAME and SHAREPOINT_PASSWORD not set in .env",
            "sites": []
        }

    results = []
    for url in site_urls:
        url = url.strip().rstrip("/")
        name = url.split("/")[-1]
        entry = {"url": url, "name": name, "status": "unknown"}
        try:
            title = _check_connection(session, url)
            if not title:
                entry["status"] = "auth_failed"
                entry["message"] = "401 — credentials rejected or no access"
            else:
                entry["status"] = "ok"
                entry["title"] = title
                # Quick page count
                try:
                    import requests
                    r = session.get(
                        f"{url}/_api/web/lists/getbytitle('Site Pages')/items"
                        "?$select=Title&$top=500", timeout=20
                    )
                    if r.status_code == 200:
                        entry["page_count"] = len(r.json().get("d", {}).get("results", []))
                except Exception:
                    pass
                # Libraries
                try:
                    libs = _get_libraries(session, url)
                    skip = {"style library","site assets","form templates",
                            "site collection documents","site pages"}
                    entry["libraries"] = [
                        l.get("Title") for l in libs
                        if l.get("Title","").lower() not in skip
                    ]
                except Exception:
                    entry["libraries"] = []
        except Exception as e:
            entry["status"] = "error"
            entry["message"] = str(e)
        results.append(entry)

    all_ok = all(r["status"] == "ok" for r in results)
    return {
        "status": "ok" if all_ok else "partial",
        "sites": results,
        "credentials_set": True,
    }


@sync_router.get("/sources-meta")
async def get_sources_meta():
    """
    Returns available Confluence spaces and Jira projects.
    Used by the Dashboard to populate the space/project selector UI.
    Calls live APIs — may take a few seconds on first load.
    """
    from connectors.confluence import list_spaces
    from connectors.jira import list_projects
    import asyncio
    spaces, projects = await asyncio.gather(
        list_spaces(),
        list_projects(),
    )
    return {
        "confluence_spaces": spaces,
        "jira_projects":     projects,
    }


@sync_router.get("/logs")
async def get_sync_logs(limit: int = 20):
    """Get recent sync log entries."""
    db = get_db()
    logs = await db.sync_logs.find(
        {}, {"_id": 0}
    ).sort("started_at", -1).limit(limit).to_list(length=limit)
    return logs


# ─── Sources Router ───────────────────────────────────────────────────────────
# ── Dashboard 30s cache ───────────────────────────────────────────────────────
import logging as _logging
logger = _logging.getLogger(__name__)

_DASH_CACHE: dict = {}
_DASH_CACHE_TTL = 30   # seconds; busted after every sync


def _bust_dashboard_cache():
    """Called by sync job on completion to force fresh data."""
    _DASH_CACHE.clear()
    logger.info("Dashboard cache busted")


sources_router = APIRouter(prefix="/api/sources", tags=["sources"])

KNOWN_SOURCES = [
    SourceType.SHAREPOINT,
    SourceType.CONFLUENCE,
    SourceType.JIRA,
    SourceType.GITHUB,
]

@sources_router.get("", response_model=DashboardStats)
async def get_sources():
    """
    Single endpoint that returns everything the Dashboard needs.
    All queries run in parallel — zero sequential waits.
    Pre-computes percentages, trend, analytics preview so the
    frontend renders with zero math.
    30-second TTL cache — busted instantly after any sync completes.
    """
    # Serve from cache if fresh
    cached = _DASH_CACHE.get("data")
    if cached and time.time() - _DASH_CACHE.get("ts", 0) < _DASH_CACHE_TTL:
        return cached

    db  = get_db()
    now = datetime.now(timezone.utc)
    import re as _re
    vendor_pattern = _re.compile(r'\[[^\]]*\bNE\]|\s+NE$', _re.IGNORECASE)

    # ── 1. Per-source stats ───────────────────────────────────────────────────
    async def _src_stats(src):
        count, last_log = await asyncio.gather(
            db.documents.count_documents({"source_type": str(src.value if hasattr(src,"value") else src)}),
            db.sync_logs.find_one({"source_type": str(src.value if hasattr(src,"value") else src)}, sort=[("started_at", -1)]),
        )
        status    = last_log.get("status", SyncStatus.NEVER) if last_log else SyncStatus.NEVER
        last_sync = (last_log.get("finished_at") or last_log.get("started_at")) if last_log else None
        error_msg = last_log.get("error_message") if last_log else None
        return SourceStats(source_type=src, doc_count=count,
                           last_sync=last_sync, sync_status=status, error_message=error_msg)

    # ── 2. At-risk experts (same logic as intelligence page) ──────────────────
    async def _experts_at_risk_count():
        try:
            pipeline = [
                {"$match": {"author": {"$ne": None}}},
                {"$group": {
                    "_id": "$author",
                    "doc_count": {"$sum": 1},
                    "last_active": {"$max": "$updated_at"},
                }},
                {"$match": {"doc_count": {"$gte": 3}}},
            ]
            people = await db.documents.aggregate(pipeline).to_list(length=5000)
            count = 0
            for p in people:
                name = p["_id"] or ""
                is_vendor = bool(vendor_pattern.search(name))
                last = p.get("last_active")
                if isinstance(last, str):
                    try: last = datetime.fromisoformat(last.replace("Z", "+00:00"))
                    except: last = None
                if last and not last.tzinfo:
                    last = last.replace(tzinfo=timezone.utc)
                days_inactive = (now - last).days if last else 999
                if days_inactive >= 90 or is_vendor:
                    count += 1
            return count
        except Exception:
            return 0

    # ── 3. Analytics preview (last 30 days) ───────────────────────────────────
    async def _analytics_preview():
        try:
            since_30 = now - timedelta(days=30)
            logs = await db.search_logs.find(
                {"timestamp": {"$gte": since_30}},
                {"query": 1, "zero_result": 1, "timestamp": 1}
            ).to_list(length=5000)

            if not logs:
                return 0, 0, 0.0, 0, [], []

            total_s   = len(logs)
            zero_s    = sum(1 for l in logs if l.get("zero_result"))
            zero_rate = round(zero_s / total_s * 100, 1) if total_s else 0.0

            # Top 8 queries
            from collections import Counter
            qc = Counter(l["query"].lower().strip() for l in logs)
            top8 = [{"query": q, "count": c} for q, c in qc.most_common(8)]

            # Last 7 days volume (pre-sliced, all days filled)
            daily: dict = {}
            for i in range(7):
                d = (now - timedelta(days=6-i)).strftime("%Y-%m-%d")
                daily[d] = 0
            for log in logs:
                ts = log.get("timestamp")
                if isinstance(ts, datetime):
                    day = ts.strftime("%Y-%m-%d")
                    if day in daily:
                        daily[day] += 1
            last7 = [{"date": d, "count": c} for d, c in daily.items()]

            # Search trend: last 3 days vs prior 3 days
            counts = [v for v in daily.values()]
            recent_avg  = sum(counts[-3:]) / 3 if len(counts) >= 3 else 0
            prev_avg    = sum(counts[-6:-3]) / 3 if len(counts) >= 6 else 0
            trend_pct   = int((recent_avg - prev_avg) / max(prev_avg, 1) * 100)

            return total_s, zero_s, zero_rate, trend_pct, top8, last7
        except Exception:
            return 0, 0, 0.0, 0, [], []

    # ── Run ALL in parallel ───────────────────────────────────────────────────
    src_results, total, recent_logs, experts_count, analytics = await asyncio.gather(
        asyncio.gather(*[_src_stats(src) for src in KNOWN_SOURCES]),
        db.documents.count_documents({}),
        db.sync_logs.find({}, {"_id": 0}).sort("started_at", -1).limit(10).to_list(length=10),
        _experts_at_risk_count(),
        _analytics_preview(),
    )

    total_s, zero_s, zero_rate, trend_pct, top8, last7 = analytics

    # ── Pre-compute derived values ────────────────────────────────────────────
    sources = list(src_results)
    # Attach per-source % of corpus
    for s in sources:
        s.doc_pct = round(s.doc_count / max(total, 1) * 100, 1)

    has_error  = any(s.sync_status in ("error", "failed") for s in sources)
    last_sync  = max(
        (s.last_sync for s in sources if s.last_sync),
        default=None
    )
    live_count = sum(1 for s in sources if s.doc_count > 0)

    result = DashboardStats(
        total_documents   = total,
        sources           = sources,
        recent_syncs      = recent_logs,
        experts_at_risk   = experts_count,
        has_error         = has_error,
        last_sync_at      = last_sync,
        live_source_count = live_count,
        total_searches    = total_s,
        zero_result_count = zero_s,
        zero_result_rate  = zero_rate,
        search_trend_pct  = trend_pct,
        top_queries       = top8,
        daily_last_7      = last7,
    )
    _DASH_CACHE["data"] = result
    _DASH_CACHE["ts"]   = time.time()
    return result


# ─── Documents Router ─────────────────────────────────────────────────────────
documents_router = APIRouter(prefix="/api/documents", tags=["documents"])

def _doc_out(doc: dict) -> dict:
    content = doc.get("content", "")
    return {
        "id": str(doc["_id"]),
        "external_id": doc.get("external_id", ""),
        "source_type": doc.get("source_type", ""),
        "source": doc.get("source", ""),
        "title": doc.get("title", ""),
        "content_preview": content[:300] + ("…" if len(content) > 300 else ""),
        "url": doc.get("url", ""),
        "author": doc.get("author"),
        "tags": doc.get("tags", []),
        "metadata": doc.get("metadata", {}),
        "ingested_at": doc.get("ingested_at"),
        "updated_at": doc.get("updated_at"),
    }


@documents_router.get("")
async def list_documents(
    source_type: str | None = None,
    page: int = 1,
    page_size: int = 20,
):
    db = get_db()
    skip = (page - 1) * page_size
    query = {}
    if source_type:
        query["source_type"] = source_type

    total = await db.documents.count_documents(query)
    docs = await db.documents.find(query).sort(
        "ingested_at", -1
    ).skip(skip).limit(page_size).to_list(length=page_size)

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "results": [_doc_out(d) for d in docs],
    }


@documents_router.get("/{doc_id}")
async def get_document(doc_id: str):
    db = get_db()
    try:
        oid = ObjectId(doc_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid document ID")

    doc = await db.documents.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    result = _doc_out(doc)
    result["content"] = doc.get("content", "")   # full content for detail view
    return result
