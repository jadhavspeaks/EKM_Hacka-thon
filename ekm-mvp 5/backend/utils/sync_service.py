"""
Sync Service
─────────────
Orchestrates incremental syncs with:
  - Non-blocking background execution (caller gets job_id instantly)
  - Per-batch progress callbacks → live progress bar on frontend
  - Entity extraction on every document
  - Bulk MongoDB writes (10-50x faster than one-by-one)
  - Sync state tracking (last_sync_at per source)
  - Duplicate prevention via unique (source_type, external_id) index
  - Intelligence cache busting after every successful sync
"""

import logging
import inspect
from datetime import datetime, timezone
from typing import Callable, Awaitable
from pymongo import UpdateOne
from database import get_db, get_last_sync, set_last_sync
from models import Document, SourceType, SyncStatus
from connectors import sharepoint, confluence, jira, github
from utils.extractor import extract_from_document

logger = logging.getLogger(__name__)

CONNECTORS = {
    SourceType.SHAREPOINT: sharepoint.fetch_documents,
    SourceType.CONFLUENCE: confluence.fetch_documents,
    SourceType.JIRA:       jira.fetch_documents,
    SourceType.GITHUB:     github.fetch_documents,
}

BATCH_SIZE = 200


def _enrich_document(doc: Document) -> dict:
    doc_dict = doc.model_dump()
    doc_dict["ingested_at"] = datetime.now(timezone.utc)
    entities = extract_from_document(doc.title, doc.content)
    doc_dict["entities"] = entities
    return doc_dict


ProgressCallback = Callable[[str, int, int, int], Awaitable[None]]
# signature: (phase, fetched, written, total_estimated)


async def bulk_upsert(
    documents: list[Document],
    on_progress: ProgressCallback | None = None,
) -> tuple[int, int]:
    """
    Bulk upsert with per-batch progress callbacks.
    Returns (added, updated).
    """
    db = get_db()
    if not documents:
        return 0, 0

    added = updated = 0
    total = len(documents)

    for i in range(0, total, BATCH_SIZE):
        batch = documents[i:i + BATCH_SIZE]
        operations = [
            UpdateOne(
                {"source_type": doc.source_type, "external_id": doc.external_id},
                {"$set": _enrich_document(doc)},
                upsert=True,
            )
            for doc in batch
        ]
        result = await db.documents.bulk_write(operations, ordered=False)
        added   += result.upserted_count
        updated += result.modified_count

        written_so_far = added + updated
        logger.info(
            f"Bulk batch {i//BATCH_SIZE + 1}/{-(-total//BATCH_SIZE)}: "
            f"+{result.upserted_count} added, ~{result.modified_count} updated"
        )
        if on_progress:
            await on_progress("writing", i + len(batch), written_so_far, total)

    return added, updated


async def run_sync(
    source_type: SourceType | None = None,
    force_full:  bool = False,
    spaces_override:   list[str] | None = None,
    projects_override: list[str] | None = None,
    repos_override:    list[str] | None = None,
    on_progress: ProgressCallback | None = None,
) -> dict:
    """
    Run incremental sync for one or all sources.
    Calls on_progress(phase, fetched, written, total) after each batch.
    Busts intelligence cache on success.
    """
    # Import here to avoid circular import
    from routes.intelligence import clear_cache as clear_intel_cache

    db = get_db()
    sources_to_sync = [source_type] if source_type else list(CONNECTORS.keys())
    results = {}
    sync_started_at = datetime.now(timezone.utc)

    for src in sources_to_sync:
        log = {
            "source_type":   src,
            "status":        SyncStatus.RUNNING,
            "started_at":    datetime.now(timezone.utc),
            "docs_added":    0,
            "docs_updated":  0,
            "docs_skipped":  0,
            "error_message": None,
            "sync_mode":     "full",
        }
        log_result = await db.sync_logs.insert_one(log.copy())
        log_id = log_result.inserted_id

        try:
            last_sync = None if force_full else await get_last_sync(src)
            sync_mode = "full" if last_sync is None else "incremental"
            log["sync_mode"] = sync_mode
            logger.info(
                f"Starting {sync_mode} sync for {src}"
                + (f" (since {last_sync.strftime('%Y-%m-%d %H:%M')})" if last_sync else "")
            )

            if on_progress:
                await on_progress("fetching", 0, 0, 0)

            fetch_fn = CONNECTORS[src]
            sig      = inspect.signature(fetch_fn)
            kwargs   = {}
            if "updated_since" in sig.parameters:
                kwargs["updated_since"] = last_sync
            if "spaces_override" in sig.parameters and spaces_override:
                kwargs["spaces_override"] = spaces_override
            if "projects_override" in sig.parameters and projects_override:
                kwargs["projects_override"] = projects_override
            if "repos_override" in sig.parameters and repos_override:
                kwargs["repos_override"] = repos_override

            documents = await fetch_fn(**kwargs)
            total_fetched = len(documents)
            logger.info(f"Fetched {total_fetched} docs from {src}")

            if on_progress:
                await on_progress("writing", total_fetched, 0, total_fetched)

            added, upd = await bulk_upsert(documents, on_progress=on_progress)
            skipped    = max(0, total_fetched - added - upd)

            await set_last_sync(src, sync_started_at)

            log.update({
                "status":       SyncStatus.SUCCESS,
                "finished_at":  datetime.now(timezone.utc),
                "docs_added":   added,
                "docs_updated": upd,
                "docs_skipped": skipped,
            })
            results[src] = {
                "status":  "success",
                "mode":    sync_mode,
                "added":   added,
                "updated": upd,
                "total":   total_fetched,
            }

            # ── Bust intelligence cache so new data shows immediately ─────────
            clear_intel_cache()
            logger.info(f"Sync {src} complete: +{added} added, ~{upd} updated — cache cleared")

        except Exception as e:
            error_msg = str(e)
            log.update({
                "status":        SyncStatus.FAILED,
                "finished_at":   datetime.now(timezone.utc),
                "error_message": error_msg,
            })
            results[src] = {"status": "failed", "error": error_msg}
            logger.error(f"Sync {src} failed: {e}")

        await db.sync_logs.update_one(
            {"_id": log_id},
            {"$set": {
                "status":        log["status"],
                "finished_at":   log.get("finished_at"),
                "docs_added":    log["docs_added"],
                "docs_updated":  log["docs_updated"],
                "docs_skipped":  log["docs_skipped"],
                "error_message": log["error_message"],
                "sync_mode":     log["sync_mode"],
            }},
        )

    if on_progress:
        await on_progress("done", 0, 0, 0)

    return results
