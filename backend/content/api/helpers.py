"""
Base API helpers for content apps.

Provides reusable functions for common API patterns (comments, emotions, views)
to avoid boilerplate in each content type's api.py.
"""

import math
import re

from django.contrib.contenttypes.models import ContentType
from django.db.models import Count, F, Model
from ninja.errors import HttpError

from content.choices import CommentStatus, EmotionType
from content.models import ContentComment, ContentEmotion, ContentView


def get_content_type_for_model(model_class: type[Model]) -> ContentType:
    """Get the ContentType for a Django model class."""
    return ContentType.objects.get_for_model(model_class)


def get_session_key(request) -> str:
    """Get or create session key for anonymous tracking."""
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


# ---------------------------------------------------------------------------
# Emotion Helpers
# ---------------------------------------------------------------------------


def get_emotion_counts(model_class: type[Model], obj_id: int) -> dict[str, int]:
    """Get emotion counts for a content object."""
    ct = get_content_type_for_model(model_class)
    counts = (
        ContentEmotion.objects.filter(content_type=ct, object_id=obj_id)
        .values("emotion_type")
        .annotate(count=Count("id"))
    )
    return {row["emotion_type"]: row["count"] for row in counts}


def get_user_emotion(model_class: type[Model], obj_id: int, request) -> str | None:
    """Get the current user's emotion for a content object."""
    ct = get_content_type_for_model(model_class)
    session_key = request.session.session_key or ""

    if request.user.is_authenticated:
        return (
            ContentEmotion.objects.filter(content_type=ct, object_id=obj_id, user=request.user)
            .values_list("emotion_type", flat=True)
            .first()
        )
    return (
        ContentEmotion.objects.filter(content_type=ct, object_id=obj_id, session_key=session_key)
        .exclude(session_key="")
        .values_list("emotion_type", flat=True)
        .first()
    )


def toggle_emotion(model_class: type[Model], obj_id: int, emotion_type: str, request) -> dict[str, int]:
    """Toggle an emotion for a content object. Returns updated counts."""
    ct = get_content_type_for_model(model_class)
    session_key = get_session_key(request)

    if request.user.is_authenticated:
        existing = ContentEmotion.objects.filter(content_type=ct, object_id=obj_id, user=request.user).first()
    else:
        existing = (
            ContentEmotion.objects.filter(content_type=ct, object_id=obj_id, session_key=session_key)
            .exclude(session_key="")
            .first()
        )

    if existing:
        if existing.emotion_type == emotion_type:
            existing.delete()
        else:
            existing.emotion_type = emotion_type
            existing.save(update_fields=["emotion_type"])
    else:
        ContentEmotion.objects.create(
            content_type=ct,
            object_id=obj_id,
            emotion_type=emotion_type,
            user=request.user if request.user.is_authenticated else None,
            session_key=session_key,
        )

    return get_emotion_counts(model_class, obj_id)


# ---------------------------------------------------------------------------
# Comment Helpers
# ---------------------------------------------------------------------------


def get_comments(model_class: type[Model], obj_id: int, include_pending: bool = False) -> list[ContentComment]:
    """Get approved comments for a content object (top-level only)."""
    ct = get_content_type_for_model(model_class)
    qs = ContentComment.objects.filter(content_type=ct, object_id=obj_id, parent__isnull=True).select_related("user")

    if not include_pending:
        qs = qs.filter(status=CommentStatus.APPROVED)

    return list(qs)


def create_comment(
    model_class: type[Model],
    obj_id: int,
    text: str,
    request,
    author_name: str = "",
    parent_id: int | None = None,
) -> ContentComment:
    """Create a comment on a content object."""
    ct = get_content_type_for_model(model_class)

    status = CommentStatus.APPROVED if request.user.is_authenticated else CommentStatus.PENDING

    comment = ContentComment.objects.create(
        content_type=ct,
        object_id=obj_id,
        text=text,
        author_name=author_name,
        user=request.user if request.user.is_authenticated else None,
        parent_id=parent_id,
        status=status,
    )
    return comment


# ---------------------------------------------------------------------------
# View Helpers
# ---------------------------------------------------------------------------

BOT_PATTERNS = re.compile(
    r"(bot|crawl|spider|slurp|yahoo|bing|google|facebook|twitter|linkedin|"
    r"pinterest|whatsapp|telegram|slack|discord|curl|wget|python-requests|"
    r"httpx|aiohttp|scrapy|headless|phantom|selenium|puppeteer|playwright)",
    re.IGNORECASE,
)


def is_bot(user_agent: str) -> bool:
    """Check if a user-agent string indicates a bot/crawler."""
    if not user_agent:
        return True
    return bool(BOT_PATTERNS.search(user_agent))


def record_view(model_class: type[Model], obj_id: int, request) -> bool:
    """
    Record a view for a content object. Returns True if new view recorded.

    - Filters bots by user-agent
    - Deduplicates by session key within 24 hours
    - Atomically increments view_count on the content object
    """
    from datetime import timedelta

    from django.utils import timezone

    user_agent = request.META.get("HTTP_USER_AGENT", "")[:255]

    if is_bot(user_agent):
        return False

    ct = get_content_type_for_model(model_class)
    session_key = get_session_key(request)

    cutoff = timezone.now() - timedelta(hours=24)
    exists = ContentView.objects.filter(
        content_type=ct,
        object_id=obj_id,
        session_key=session_key,
        created_at__gte=cutoff,
    ).exists()

    if exists:
        return False

    ip = request.META.get("HTTP_X_FORWARDED_FOR", request.META.get("REMOTE_ADDR", ""))
    if "," in ip:
        ip = ip.split(",")[0].strip()
    ip_hash = ContentView.hash_ip(ip)

    ContentView.objects.create(
        content_type=ct,
        object_id=obj_id,
        session_key=session_key,
        ip_hash=ip_hash,
        user_agent=user_agent,
        user=request.user if request.user.is_authenticated else None,
    )

    # Atomically increment view_count on the content object
    model_class.objects.filter(pk=obj_id).update(view_count=F("view_count") + 1)

    return True


# ---------------------------------------------------------------------------
# Content Enrichment
# ---------------------------------------------------------------------------


def enrich_content_with_interactions(request, obj, model_class: type[Model]) -> None:
    """
    Attach emotion_counts, user_emotion, can_edit, and can_delete to a content object.

    Mutates the object in place. Call this before serialization.
    """
    obj.emotion_counts = get_emotion_counts(model_class, obj.id)
    obj.user_emotion = get_user_emotion(model_class, obj.id, request)
    obj.can_edit = request.user.is_authenticated and (
        request.user.is_staff or obj.authors.filter(id=request.user.id).exists()
    )
    obj.can_delete = request.user.is_authenticated and request.user.is_staff


def enrich_list_with_permissions(request, items: list) -> None:
    """
    Attach can_edit and can_delete to each item in a content list.

    Mutates items in place. Call after pagination, before serialization.
    Requires authors to be prefetched on the queryset for performance.
    """
    if not request.user.is_authenticated:
        return

    is_staff = request.user.is_staff
    user_id = request.user.id

    for item in items:
        if is_staff:
            item.can_edit = True
            item.can_delete = True
        else:
            item.can_edit = any(a.id == user_id for a in item.authors.all())
            item.can_delete = False


# ---------------------------------------------------------------------------
# Pagination Helper
# ---------------------------------------------------------------------------


def paginate_queryset(queryset, page: int = 1, page_size: int = 20) -> dict:
    """
    Paginate a queryset and return dict matching PaginatedContentOut schema.
    """
    total = queryset.count()
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(page, total_pages))
    offset = (page - 1) * page_size
    items = list(queryset[offset : offset + page_size])
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
