"""
Analytics Routes
─────────────────
POST /api/analytics/log             — log a search event (called by search route)
GET  /api/analytics/stats           — top queries, zero results, daily volume
GET  /api/analytics/searches        — recent search history
"""

import logging
from datetime import datetime, timezone, timedelta
from collections import Counter
from fastapi import APIRouter, Query
from database import get_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/analytics", tags=["analytics"])


async def log_search(db, query: str, results_count: int, source_filter: str | None):
    """Called by search route to log every query."""
    try:
        await db.search_logs.insert_one({
            "query":         query,
            "results_count": results_count,
            "source_filter": source_filter,
            "timestamp":     datetime.now(timezone.utc),
            "zero_result":   results_count == 0,
        })
    except Exception as e:
        logger.warning(f"Analytics log failed: {e}")


@router.get("/stats")
async def get_analytics_stats(days: int = Query(30, ge=1, le=365)):
    """
    Returns:
    - top queries
    - zero result queries
    - daily search volume
    - source filter usage
    - total searches
    """
    db    = get_db()
    since = datetime.now(timezone.utc) - timedelta(days=days)

    cursor = db.search_logs.find(
        {"timestamp": {"$gte": since}},
        {"query": 1, "results_count": 1, "source_filter": 1,
         "timestamp": 1, "zero_result": 1}
    ).sort("timestamp", -1).limit(10000)
    logs = await cursor.to_list(length=10000)

    if not logs:
        return {
            "total_searches": 0,
            "unique_queries": 0,
            "zero_result_count": 0,
            "zero_result_rate": 0,
            "top_queries": [],
            "zero_result_queries": [],
            "daily_volume": [],
            "source_filter_usage": [],
            "days": days,
        }

    # Counts
    total        = len(logs)
    zero_results = [l for l in logs if l.get("zero_result")]
    query_counts = Counter(l["query"].lower().strip() for l in logs)
    zero_counts  = Counter(l["query"].lower().strip() for l in zero_results)

    # Daily volume — fill all days in range so chart shows gaps
    all_days = {}
    for i in range(days):
        d = (datetime.now(timezone.utc) - timedelta(days=days-1-i)).strftime("%Y-%m-%d")
        all_days[d] = 0
    for log in logs:
        ts = log.get("timestamp")
        if ts:
            day = ts.strftime("%Y-%m-%d") if isinstance(ts, datetime) else str(ts)[:10]
            if day in all_days:
                all_days[day] = all_days.get(day, 0) + 1

    daily_volume = [{"date": d, "count": c} for d, c in sorted(all_days.items())]

    # Hourly distribution (0–23)
    hour_counts = [0] * 24
    for log in logs:
        ts = log.get("timestamp")
        if isinstance(ts, datetime):
            hour_counts[ts.hour] += 1

    # Day of week distribution (0=Mon … 6=Sun)
    dow_counts = [0] * 7
    dow_labels = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]
    for log in logs:
        ts = log.get("timestamp")
        if isinstance(ts, datetime):
            dow_counts[ts.weekday()] += 1

    # Source filter usage
    filter_counts = Counter(l.get("source_filter") or "all" for l in logs)

    # Recent searches (last 20)
    recent = sorted(logs, key=lambda l: l.get("timestamp", datetime.min), reverse=True)[:20]

    return {
        "total_searches":    total,
        "unique_queries":    len(query_counts),
        "zero_result_count": len(zero_results),
        "zero_result_rate":  round(len(zero_results) / total * 100, 1) if total else 0,
        "top_queries": [
            {"query": q, "count": c}
            for q, c in query_counts.most_common(15)
        ],
        "zero_result_queries": [
            {"query": q, "count": c}
            for q, c in zero_counts.most_common(10)
        ],
        "daily_volume": daily_volume,
        "hourly_distribution": [
            {"hour": h, "count": hour_counts[h]} for h in range(24)
        ],
        "dow_distribution": [
            {"day": dow_labels[i], "count": dow_counts[i]} for i in range(7)
        ],
        "source_filter_usage": [
            {"source": s, "count": c}
            for s, c in filter_counts.most_common()
        ],
        "recent_searches": [
            {
                "query": l["query"],
                "results_count": l.get("results_count", 0),
                "source_filter": l.get("source_filter"),
                "timestamp": l["timestamp"].isoformat() if isinstance(l.get("timestamp"), datetime) else "",
                "zero_result": l.get("zero_result", False),
            }
            for l in recent
        ],
        "days": days,
    }


@router.get("/searches")
async def get_search_history(limit: int = Query(50, ge=1, le=200)):
    """Recent search history."""
    db = get_db()
    cursor = db.search_logs.find(
        {},
        {"query": 1, "results_count": 1, "source_filter": 1, "timestamp": 1}
    ).sort("timestamp", -1).limit(limit)
    logs = await cursor.to_list(length=limit)

    return {
        "total": len(logs),
        "searches": [
            {
                "query":         l["query"],
                "results_count": l.get("results_count", 0),
                "source_filter": l.get("source_filter"),
                "timestamp":     l["timestamp"].isoformat() if isinstance(l.get("timestamp"), datetime) else str(l.get("timestamp", "")),
                "zero_result":   l.get("zero_result", False),
            }
            for l in logs
        ]
    }
