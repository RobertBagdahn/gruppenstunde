"""
Base content schemas — shared across all content types.

These schemas are used by session, blog, game, recipe apps
via imports like ``from content.schemas import ContentListOut``.
"""

from datetime import date, datetime

from ninja import Schema


# ---------------------------------------------------------------------------
# Shared Sub-Schemas (Tag, ScoutLevel, Author)
# ---------------------------------------------------------------------------


class TagOut(Schema):
    """Tag output schema."""

    id: int
    name: str
    slug: str
    icon: str
    sort_order: int
    parent_id: int | None
    parent_name: str | None = None
    children: list["TagOut"] = []

    class Config:
        from_attributes = True


class TagTreeOut(Schema):
    """Flat tag with content count for tree rendering."""

    id: int
    name: str
    slug: str
    icon: str
    sort_order: int
    parent_id: int | None
    content_count: int = 0


class TagSuggestIn(Schema):
    """Input schema for tag suggestion."""

    name: str
    parent_id: int | None = None


class ScoutLevelOut(Schema):
    """Scout level output schema."""

    id: int
    name: str
    icon: str


class ContentAuthorOut(Schema):
    """Author info exposed on content detail."""

    id: int | None = None
    display_name: str
    scout_name: str = ""
    profile_picture_url: str | None = None
    is_registered: bool = False


# ---------------------------------------------------------------------------
# Content Base Schemas
# ---------------------------------------------------------------------------


class ContentListOut(Schema):
    """Base schema for content list (compact). Extend per content type."""

    id: int
    title: str
    slug: str
    summary: str
    costs_rating: str
    execution_time: str
    difficulty: str
    status: str
    image_url: str | None
    like_score: int
    view_count: int
    created_at: datetime
    scout_levels: list[ScoutLevelOut]
    tags: list[TagOut]
    can_edit: bool = False
    can_delete: bool = False

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None

    @staticmethod
    def resolve_tags(obj) -> list:
        return [
            {
                "id": t.id,
                "name": t.name,
                "slug": t.slug,
                "icon": t.icon,
                "sort_order": t.sort_order,
                "parent_id": t.parent_id,
                "parent_name": t.parent.name if t.parent else None,
            }
            for t in obj.tags.select_related("parent").all()
        ]


class ContentDetailOut(Schema):
    """Base schema for single content detail. Extend per content type."""

    id: int
    title: str
    slug: str
    summary: str
    summary_long: str
    description: str
    costs_rating: str
    execution_time: str
    preparation_time: str
    difficulty: str
    status: str
    image_url: str | None
    like_score: int
    view_count: int
    created_at: datetime
    updated_at: datetime
    scout_levels: list[ScoutLevelOut]
    tags: list[TagOut]
    authors: list[ContentAuthorOut] = []
    emotion_counts: dict[str, int] = {}
    user_emotion: str | None = None
    can_edit: bool = False
    can_delete: bool = False

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None

    @staticmethod
    def resolve_tags(obj) -> list:
        return [
            {
                "id": t.id,
                "name": t.name,
                "slug": t.slug,
                "icon": t.icon,
                "sort_order": t.sort_order,
                "parent_id": t.parent_id,
                "parent_name": t.parent.name if t.parent else None,
            }
            for t in obj.tags.select_related("parent").all()
        ]


class ContentSimilarOut(Schema):
    """Compact schema for similar/related content."""

    id: int
    title: str
    slug: str
    summary: str
    image_url: str | None
    difficulty: str
    execution_time: str
    content_type: str = ""

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None


class ContentCreateIn(Schema):
    """Base input schema for creating content. Extend per content type."""

    title: str
    summary: str = ""
    summary_long: str = ""
    description: str = ""
    costs_rating: str = "free"
    execution_time: str = "less_30"
    preparation_time: str = "none"
    difficulty: str = "easy"
    tag_ids: list[int] = []
    scout_level_ids: list[int] = []


class ContentUpdateIn(Schema):
    """Base input schema for updating content. All fields optional."""

    title: str | None = None
    summary: str | None = None
    summary_long: str | None = None
    description: str | None = None
    costs_rating: str | None = None
    execution_time: str | None = None
    preparation_time: str | None = None
    difficulty: str | None = None
    status: str | None = None
    tag_ids: list[int] | None = None
    scout_level_ids: list[int] | None = None


# ---------------------------------------------------------------------------
# Comment & Emotion Schemas
# ---------------------------------------------------------------------------


class ContentCommentOut(Schema):
    """Comment output schema."""

    id: int
    text: str
    author_name: str
    user_id: int | None
    user_display_name: str | None = None
    parent_id: int | None
    status: str
    created_at: datetime
    replies: list["ContentCommentOut"] = []


class ContentCommentIn(Schema):
    """Input schema for creating a comment."""

    text: str
    author_name: str = ""
    parent_id: int | None = None


class ContentEmotionOut(Schema):
    """Emotion output schema."""

    emotion_type: str
    count: int


class ContentEmotionIn(Schema):
    """Input schema for setting an emotion."""

    emotion_type: str


# ---------------------------------------------------------------------------
# ContentLink Schemas
# ---------------------------------------------------------------------------


class ContentLinkOut(Schema):
    """Output schema for a content link."""

    id: int
    source_content_type: str
    source_object_id: int
    source_title: str = ""
    target_content_type: str
    target_object_id: int
    target_title: str = ""
    link_type: str
    relevance_score: float | None
    is_rejected: bool
    created_at: datetime


class ContentLinkCreateIn(Schema):
    """Input schema for creating a manual content link."""

    source_content_type: str
    source_object_id: int
    target_content_type: str
    target_object_id: int


# ---------------------------------------------------------------------------
# Approval Schemas
# ---------------------------------------------------------------------------


class ApprovalLogOut(Schema):
    """Output schema for an approval log entry."""

    id: int
    content_type: str
    object_id: int
    action: str
    reviewer_name: str | None = None
    reason: str
    created_at: datetime


class ApprovalActionIn(Schema):
    """Input schema for approving/rejecting content."""

    action: str  # 'approved' or 'rejected'
    reason: str = ""


# ---------------------------------------------------------------------------
# Featured Content Schemas
# ---------------------------------------------------------------------------


class FeaturedContentOut(Schema):
    """Output schema for featured content."""

    id: int
    content_type: str
    object_id: int
    content_title: str = ""
    content_slug: str = ""
    content_image_url: str | None = None
    featured_from: date
    featured_until: date
    reason: str
    created_at: datetime


class FeaturedContentIn(Schema):
    """Input schema for featuring content."""

    content_type: str
    object_id: int
    featured_from: date
    featured_until: date
    reason: str = ""


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


class PaginatedContentOut(Schema):
    """Paginated response wrapper. Used with content type specific list schemas."""

    items: list[ContentListOut]
    total: int
    page: int
    page_size: int
    total_pages: int
