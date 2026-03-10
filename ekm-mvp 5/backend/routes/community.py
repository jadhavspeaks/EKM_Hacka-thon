"""
Community routes
Handles: annotations, flags, leaderboard, digest
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone, timedelta
from database import get_db
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/community", tags=["community"])


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------
class FlagBody(BaseModel):
    doc_id: str
    flag_type: str        # "outdated" | "incorrect" | "useful" | "needs_review"
    author: Optional[str] = "anonymous"
    comment: Optional[str] = ""

class AnnotationBody(BaseModel):
    doc_id: str
    text: str
    author: Optional[str] = "anonymous"
    annotation_type: str = "note"   # "note" | "suggestion" | "correction"

class VoteBody(BaseModel):
    annotation_id: str
    author: Optional[str] = "anonymous"
    direction: str = "up"           # "up" | "down"


# ---------------------------------------------------------------------------
# Flags
# ---------------------------------------------------------------------------
@router.post("/flag")
async def flag_document(body: FlagBody):
    db = get_db()
    flag = {
        "doc_id":    body.doc_id,
        "flag_type": body.flag_type,
        "author":    body.author or "anonymous",
        "comment":   body.comment or "",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db["community_flags"].insert_one(flag)
    logger.info(f"Community: flag '{body.flag_type}' on doc {body.doc_id} by {body.author}")
    return {"ok": True}


@router.get("/flags/{doc_id}")
async def get_flags(doc_id: str):
    db = get_db()
    flags = await db["community_flags"].find(
        {"doc_id": doc_id}, {"_id": 0}
    ).to_list(50)
    return {"flags": flags, "total": len(flags)}


# ---------------------------------------------------------------------------
# Annotations
# ---------------------------------------------------------------------------
@router.post("/annotate")
async def add_annotation(body: AnnotationBody):
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Annotation text required")
    db = get_db()
    import uuid
    annotation = {
        "id":               str(uuid.uuid4())[:8],
        "doc_id":           body.doc_id,
        "text":             body.text.strip(),
        "author":           body.author or "anonymous",
        "annotation_type":  body.annotation_type,
        "votes":            0,
        "created_at":       datetime.now(timezone.utc).isoformat(),
    }
    await db["community_annotations"].insert_one(annotation)
    logger.info(f"Community: annotation by {body.author} on doc {body.doc_id}")
    return {"ok": True, "id": annotation["id"]}


@router.get("/annotations/{doc_id}")
async def get_annotations(doc_id: str):
    db = get_db()
    items = await db["community_annotations"].find(
        {"doc_id": doc_id}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return {"annotations": items, "total": len(items)}


@router.post("/vote")
async def vote_annotation(body: VoteBody):
    db = get_db()
    delta = 1 if body.direction == "up" else -1
    await db["community_annotations"].update_one(
        {"id": body.annotation_id},
        {"$inc": {"votes": delta}}
    )
    return {"ok": True}


# ---------------------------------------------------------------------------
# Leaderboard
# ---------------------------------------------------------------------------
@router.get("/leaderboard")
async def get_leaderboard(limit: int = Query(20, le=50)):
    db = get_db()

    # Gather contribution counts per author
    scores: dict[str, dict] = {}

    def _add(name: str, key: str, val: int = 1):
        if not name or name == "anonymous":
            return
        if name not in scores:
            scores[name] = {
                "name": name,
                "annotations": 0,
                "flags": 0,
                "doc_contributions": 0,
                "total": 0,
            }
        scores[name][key] = scores[name].get(key, 0) + val

    # Count annotations
    ann_pipeline = [
        {"$group": {"_id": "$author", "count": {"$sum": 1}}}
    ]
    async for row in db["community_annotations"].aggregate(ann_pipeline):
        _add(row["_id"], "annotations", row["count"])

    # Count flags
    flag_pipeline = [
        {"$group": {"_id": "$author", "count": {"$sum": 1}}}
    ]
    async for row in db["community_flags"].aggregate(flag_pipeline):
        _add(row["_id"], "flags", row["count"])

    # Count document contributions (author field in documents)
    doc_pipeline = [
        {"$match": {"author": {"$exists": True, "$ne": ""}}},
        {"$group": {"_id": "$author", "count": {"$sum": 1}}}
    ]
    async for row in db["documents"].aggregate(doc_pipeline):
        _add(row["_id"], "doc_contributions", row["count"])

    # Compute totals with weighted scoring
    for s in scores.values():
        s["total"] = (
            s["doc_contributions"] * 3 +
            s["annotations"] * 5 +
            s["flags"] * 2
        )

    ranked = sorted(scores.values(), key=lambda x: x["total"], reverse=True)[:limit]
    for i, r in enumerate(ranked):
        r["rank"] = i + 1

    return {"leaderboard": ranked, "total_contributors": len(scores)}


# ---------------------------------------------------------------------------
# Weekly digest
# ---------------------------------------------------------------------------
@router.get("/digest")
async def get_digest():
    db  = get_db()
    now = datetime.now(timezone.utc)
    week_ago = (now - timedelta(days=7)).isoformat()

    # New documents this week
    new_docs_count = await db["documents"].count_documents(
        {"ingested_at": {"$gte": week_ago}}
    )

    # Updated docs this week
    updated_count = await db["documents"].count_documents(
        {"updated_at": {"$gte": week_ago}}
    )

    # New annotations this week
    new_ann = await db["community_annotations"].count_documents(
        {"created_at": {"$gte": week_ago}}
    )

    # New flags
    new_flags = await db["community_flags"].count_documents(
        {"created_at": {"$gte": week_ago}}
    )

    # Trending topics - most active sources this week
    topic_pipeline = [
        {"$match": {"updated_at": {"$gte": week_ago}}},
        {"$unwind": {"path": "$tags", "preserveNullAndEmptyArrays": False}},
        {"$group": {"_id": "$tags", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 8},
    ]
    trending = []
    async for row in db["documents"].aggregate(topic_pipeline):
        trending.append({"topic": row["_id"], "activity": row["count"]})

    # Source breakdown this week
    src_pipeline = [
        {"$match": {"ingested_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$source_type", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
    ]
    sources_this_week = []
    async for row in db["documents"].aggregate(src_pipeline):
        sources_this_week.append({"source": row["_id"], "count": row["count"]})

    # Top annotators this week
    top_ann_pipeline = [
        {"$match": {"created_at": {"$gte": week_ago}}},
        {"$group": {"_id": "$author", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 5},
    ]
    top_annotators = []
    async for row in db["community_annotations"].aggregate(top_ann_pipeline):
        if row["_id"] and row["_id"] != "anonymous":
            top_annotators.append({"name": row["_id"], "count": row["count"]})

    # Recent annotations for activity feed
    recent_activity = await db["community_annotations"].find(
        {"created_at": {"$gte": week_ago}}, {"_id": 0}
    ).sort("created_at", -1).to_list(10)

    return {
        "period": "last_7_days",
        "generated_at": now.isoformat(),
        "stats": {
            "new_documents":   new_docs_count,
            "updated_documents": updated_count,
            "new_annotations": new_ann,
            "new_flags":       new_flags,
        },
        "trending_topics":    trending,
        "sources_this_week":  sources_this_week,
        "top_annotators":     top_annotators,
        "recent_activity":    recent_activity,
    }
