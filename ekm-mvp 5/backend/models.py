from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from enum import Enum


class SourceType(str, Enum):
    SHAREPOINT  = "sharepoint"
    CONFLUENCE  = "confluence"
    JIRA        = "jira"
    GITHUB      = "github"
    SERVICENOW  = "servicenow"   # future scope


class SyncStatus(str, Enum):
    RUNNING = "running"
    SUCCESS = "success"
    FAILED  = "failed"
    NEVER   = "never"


# ─── Extracted Entities ───────────────────────────────────────────────────────

class Entities(BaseModel):
    """Structured entities extracted from document content."""
    jira_tickets:   list[str] = []   # e.g. ["PROJ-123", "OPS-456"]
    change_numbers: list[str] = []   # e.g. ["CHG-12345"]
    versions:       list[str] = []   # e.g. ["1.2.3", "v2.0"]
    dates:          list[str] = []   # e.g. ["2024-01-15"]
    environments:   list[str] = []   # e.g. ["production", "staging"]
    build_labels:   list[str] = []   # e.g. ["build-1234"]


# ─── Core Document Model ──────────────────────────────────────────────────────

class Document(BaseModel):
    external_id:  str                      # ID from source system
    source_type:  SourceType
    source:       str                      # human-readable source name
    title:        str
    content:      str                      # plain text content
    url:          str                      # link back to source
    author:       Optional[str] = None
    tags:         list[str] = []
    metadata:     dict[str, Any] = {}      # source-specific extra fields
    entities:     Entities = Field(default_factory=Entities)  # extracted entities
    ingested_at:  datetime = Field(default_factory=datetime.utcnow)
    updated_at:   Optional[datetime] = None

    class Config:
        use_enum_values = True


# ─── API Response Models ──────────────────────────────────────────────────────

class DocumentOut(BaseModel):
    id:              str
    external_id:     str
    source_type:     str
    source:          str
    title:           str
    content_preview: str
    url:             str
    author:          Optional[str] = None
    tags:            list[str] = []
    metadata:        dict[str, Any] = {}
    entities:        dict[str, Any] = {}
    ingested_at:     datetime
    updated_at:      Optional[datetime] = None
    bm25_score:      Optional[float] = None
    related_docs:    list[dict] = []         # cross-linked Jira/Confluence docs


class SearchResponse(BaseModel):
    query:      str
    total:      int
    results:    list[DocumentOut]
    page:       int
    page_size:  int


class SourceStats(BaseModel):
    source_type:   str
    doc_count:     int
    doc_pct:       float = 0.0          # % of total corpus
    last_sync:     Optional[datetime] = None
    sync_status:   SyncStatus = SyncStatus.NEVER
    error_message: Optional[str] = None


class DashboardStats(BaseModel):
    total_documents:    int
    sources:            list[SourceStats]
    recent_syncs:       list[dict]
    experts_at_risk:    int   = 0
    # Pre-computed summaries — no frontend math needed
    has_error:          bool  = False   # any source in error state
    last_sync_at:       Optional[datetime] = None  # most recent sync across all sources
    live_source_count:  int   = 0       # sources with doc_count > 0
    # Analytics preview — merged so Dashboard needs only 1 API call
    total_searches:     int   = 0
    zero_result_count:  int   = 0
    zero_result_rate:   float = 0.0
    search_trend_pct:   int   = 0       # % change last 3d vs prev 3d
    top_queries:        list[dict] = []  # top 8, pre-sliced
    daily_last_7:       list[dict] = []  # last 7 days volume


class SyncRequest(BaseModel):
    source_type:       Optional[SourceType] = None   # None = sync all
    force_full:        bool = False                  # True = ignore last_sync
    spaces_override:   list[str] = []   # Confluence: specific space keys to sync
    projects_override: list[str] = []   # Jira: specific project keys to sync
    repos_override:    list[str] = []   # GitHub: specific repos to sync


class SyncLog(BaseModel):
    source_type:   str
    status:        SyncStatus
    started_at:    datetime = Field(default_factory=datetime.utcnow)
    finished_at:   Optional[datetime] = None
    docs_added:    int = 0
    docs_updated:  int = 0
    docs_skipped:  int = 0
    error_message: Optional[str] = None
