from fastapi import APIRouter, HTTPException
from database import get_db
from models import SyncRequest, SourceType, DashboardStats, SourceStats, SyncStatus, DocumentOut
from utils.sync_service import run_sync
from bson import ObjectId
from datetime import datetime, timezone
import asyncio

# ─── Sync Router ─────────────────────────────────────────────────────────────
sync_router = APIRouter(prefix="/api/sync", tags=["sync"])

@sync_router.post("")
async def trigger_sync(body: SyncRequest = SyncRequest()):
    """Trigger a sync for one or all sources."""
    results = await run_sync(
        source_type=body.source_type,
        force_full=body.force_full,
        spaces_override=body.spaces_override or None,
        projects_override=body.projects_override or None,
    )
    return {"message": "Sync complete", "results": results}


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
sources_router = APIRouter(prefix="/api/sources", tags=["sources"])

KNOWN_SOURCES = [
    SourceType.SHAREPOINT,
    SourceType.CONFLUENCE,
    SourceType.JIRA,
    SourceType.GITHUB,
]

@sources_router.get("", response_model=DashboardStats)
async def get_sources():
    """Return stats for all sources. All DB queries run in parallel for speed."""
    db = get_db()
    import re as _re

    # ── Run all count queries in parallel ────────────────────────────────────
    VENDOR_PATTERN = _re.compile(r'\[.*\bNE\b.*\]|\s+NE$', _re.IGNORECASE)

    async def _src_stats(src):
        count, last_log = await asyncio.gather(
            db.documents.count_documents({"source_type": src}),
            db.sync_logs.find_one({"source_type": src}, sort=[("started_at", -1)]),
        )
        status    = last_log.get("status", SyncStatus.NEVER) if last_log else SyncStatus.NEVER
        last_sync = (last_log.get("finished_at") or last_log.get("started_at")) if last_log else None
        error_msg = last_log.get("error_message") if last_log else None
        return SourceStats(source_type=src, doc_count=count,
                           last_sync=last_sync, sync_status=status, error_message=error_msg)

    # Experts at risk: distinct vendor-named authors (NE bracket)
    async def _experts_at_risk_count():
        try:
            import re as _r
            pipeline = [
                {"$match": {"author": {"$regex": r'\[.*\bNE\b.*\]|\s+NE$', "$options": "i"}}},
                {"$group": {"_id": "$author"}},
                {"$count": "total"}
            ]
            result = await db.documents.aggregate(pipeline).to_list(length=1)
            return result[0]["total"] if result else 0
        except Exception:
            return 0

    # Run everything in parallel
    src_results, total, recent_logs, experts_count = await asyncio.gather(
        asyncio.gather(*[_src_stats(src) for src in KNOWN_SOURCES]),
        db.documents.count_documents({}),
        db.sync_logs.find({}, {"_id": 0}).sort("started_at", -1).limit(10).to_list(length=10),
        _experts_at_risk_count(),
    )

    return DashboardStats(
        total_documents=total,
        sources=list(src_results),
        recent_syncs=recent_logs,
        experts_at_risk=experts_count,
    )


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
