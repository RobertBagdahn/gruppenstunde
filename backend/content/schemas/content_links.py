"""
Content link detail schemas (extracted from api.py inline schemas).
"""

from ninja import Schema


class ContentLinkDetailOut(Schema):
    """Extended ContentLink output with resolved titles."""

    id: int
    source_content_type: str
    source_object_id: int
    source_title: str
    source_slug: str
    source_image_url: str | None
    target_content_type: str
    target_object_id: int
    target_title: str
    target_slug: str
    target_image_url: str | None
    link_type: str
    relevance_score: float | None
    is_rejected: bool
    created_at: str


class FeaturedContentDetailOut(Schema):
    """Featured content with resolved details."""

    id: int
    content_type: str
    object_id: int
    content_title: str
    content_slug: str
    content_summary: str
    content_image_url: str | None
    content_url: str
    featured_from: str
    featured_until: str
    reason: str
    created_at: str
