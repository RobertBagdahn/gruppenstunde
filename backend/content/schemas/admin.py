"""
Admin/approval-related schemas (extracted from api.py inline schemas).
"""

from ninja import Schema


# ---------------------------------------------------------------------------
# Approval Queue Schemas
# ---------------------------------------------------------------------------


class ApprovalQueueItemOut(Schema):
    content_type: str
    object_id: int
    title: str
    slug: str
    summary: str
    submitted_at: str
    author: str | None = None


class PaginatedApprovalQueueOut(Schema):
    items: list[ApprovalQueueItemOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminApprovalActionIn(Schema):
    """Admin approval action — distinct from base ApprovalActionIn."""

    action: str  # "approve" or "reject"
    reason: str = ""


class ApprovalActionOut(Schema):
    success: bool
    content_type: str
    object_id: int
    new_status: str
    message: str


class ApprovalLogItemOut(Schema):
    id: int
    content_type: str
    object_id: int
    action: str
    reviewer_name: str | None = None
    reason: str
    created_at: str


# ---------------------------------------------------------------------------
# Embedding Viewer Schemas
# ---------------------------------------------------------------------------


class EmbeddingStatusItemOut(Schema):
    content_type: str
    object_id: int
    title: str
    slug: str
    has_embedding: bool
    embedding_updated_at: str | None = None
    content_updated_at: str
    is_stale: bool


class PaginatedEmbeddingStatusOut(Schema):
    items: list[EmbeddingStatusItemOut]
    total: int
    page: int
    page_size: int
    total_pages: int
    stats: dict  # {"total": N, "with_embedding": M, "stale": K, "missing": L}


class BatchEmbeddingIn(Schema):
    content_type: str = ""  # Optional filter: "groupsession", "blog", "game", "recipe"
    force: bool = False
    limit: int = 100


class BatchEmbeddingOut(Schema):
    updated: int
    skipped: int
    failed: int


# ---------------------------------------------------------------------------
# Embedding Feedback Schemas
# ---------------------------------------------------------------------------


class EmbeddingFeedbackItemOut(Schema):
    id: int
    content_link_id: int
    source_content_type: str
    source_title: str
    target_content_type: str
    target_title: str
    feedback_type: str
    notes: str
    created_by_name: str | None = None
    created_at: str


class PaginatedEmbeddingFeedbackOut(Schema):
    items: list[EmbeddingFeedbackItemOut]
    total: int
    page: int
    page_size: int
    total_pages: int
