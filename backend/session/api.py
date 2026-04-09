"""Django Ninja API routes for sessions (GroupSession)."""

import logging
import math

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router, Schema
from ninja.errors import HttpError

from content.base_api import (
    create_comment,
    enrich_content_with_interactions,
    enrich_list_with_permissions,
    get_comments,
    paginate_queryset,
    record_view,
    toggle_emotion,
)
from content.base_schemas import ContentCommentIn, ContentCommentOut, ContentEmotionIn
from content.choices import ContentStatus
from content.models import Tag
from supply.schemas import ContentMaterialItemIn

from .models import GroupSession
from .schemas import (
    GroupSessionCreateIn,
    GroupSessionDetailOut,
    GroupSessionListOut,
    GroupSessionUpdateIn,
    PaginatedGroupSessionOut,
)

logger = logging.getLogger(__name__)

router = Router(tags=["sessions"])


# ---------------------------------------------------------------------------
# Filter Schema
# ---------------------------------------------------------------------------


class GroupSessionFilterIn(Schema):
    q: str = ""
    session_type: str | None = None
    location_type: str | None = None
    scout_level_ids: str | None = None
    tag_slugs: str | None = None
    difficulty: str | None = None
    costs_rating: str | None = None
    execution_time: str | None = None
    sort: str = "newest"
    page: int = 1
    page_size: int = 20


# ---------------------------------------------------------------------------
# List & Search
# ---------------------------------------------------------------------------


@router.get("/", response=PaginatedGroupSessionOut)
def list_sessions(request, filters: Query[GroupSessionFilterIn]):
    """List group sessions with filtering, search, sorting, and pagination."""
    qs = GroupSession.objects.filter(status=ContentStatus.APPROVED)

    if filters.q:
        qs = qs.filter(Q(title__icontains=filters.q) | Q(summary__icontains=filters.q))

    if filters.session_type:
        qs = qs.filter(session_type=filters.session_type)
    if filters.location_type:
        qs = qs.filter(location_type=filters.location_type)
    if filters.scout_level_ids:
        level_ids = [int(x) for x in filters.scout_level_ids.split(",") if x.strip()]
        qs = qs.filter(scout_levels__id__in=level_ids)
    if filters.tag_slugs:
        tag_slug_list = [s.strip() for s in filters.tag_slugs.split(",") if s.strip()]
        selected_tags = Tag.objects.filter(slug__in=tag_slug_list)
        expanded_ids = set(selected_tags.values_list("id", flat=True))
        for tag in selected_tags:
            for child in tag.get_descendants():
                expanded_ids.add(child.id)
        qs = qs.filter(tags__id__in=expanded_ids)
    if filters.difficulty:
        qs = qs.filter(difficulty=filters.difficulty)
    if filters.costs_rating:
        qs = qs.filter(costs_rating=filters.costs_rating)
    if filters.execution_time:
        qs = qs.filter(execution_time=filters.execution_time)

    qs = qs.distinct()

    sort_map = {
        "newest": "-created_at",
        "oldest": "created_at",
        "most_liked": "-like_score",
        "popular": "-view_count",
        "random": "?",
    }
    qs = qs.order_by(sort_map.get(filters.sort, "-created_at"))

    total = qs.count()
    total_pages = max(1, math.ceil(total / filters.page_size))
    offset = (filters.page - 1) * filters.page_size
    items = list(qs.prefetch_related("scout_levels", "tags__parent", "authors")[offset : offset + filters.page_size])

    enrich_list_with_permissions(request, items)

    return {
        "items": items,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": total_pages,
    }


@router.get("/autocomplete/", response=list[dict])
def autocomplete_sessions(request, q: str = ""):
    """Fast typeahead suggestions for sessions."""
    if not q or len(q) < 2:
        return []
    return list(
        GroupSession.objects.filter(status=ContentStatus.APPROVED, title__icontains=q).values(
            "id", "title", "summary", "slug"
        )[:10]
    )


# ---------------------------------------------------------------------------
# Detail (by ID and by slug)
# ---------------------------------------------------------------------------


@router.get("/by-slug/{slug}/", response=GroupSessionDetailOut)
def get_session_by_slug(request, slug: str):
    """Get a single session by slug (SEO-friendly)."""
    session = get_object_or_404(
        GroupSession.objects.prefetch_related("scout_levels", "tags__parent", "authors__profile").select_related(
            "created_by"
        ),
        slug=slug,
    )
    enrich_content_with_interactions(request, session, GroupSession)
    session.similar_sessions = []
    record_view(GroupSession, session.id, request)
    return session


@router.get("/{session_id}/", response=GroupSessionDetailOut)
def get_session(request, session_id: int):
    """Get a single session by ID."""
    session = get_object_or_404(
        GroupSession.objects.prefetch_related("scout_levels", "tags__parent", "authors__profile").select_related(
            "created_by"
        ),
        id=session_id,
    )
    enrich_content_with_interactions(request, session, GroupSession)
    session.similar_sessions = []
    record_view(GroupSession, session.id, request)
    return session


# ---------------------------------------------------------------------------
# Create / Update / Delete
# ---------------------------------------------------------------------------


@router.post("/", response={201: GroupSessionDetailOut})
def create_session(request, payload: GroupSessionCreateIn):
    """Create a new group session."""
    session = GroupSession.objects.create(
        title=payload.title,
        summary=payload.summary,
        summary_long=payload.summary_long,
        description=payload.description,
        costs_rating=payload.costs_rating,
        execution_time=payload.execution_time,
        preparation_time=payload.preparation_time,
        difficulty=payload.difficulty,
        session_type=payload.session_type,
        location_type=payload.location_type,
        min_participants=payload.min_participants,
        max_participants=payload.max_participants,
        status=ContentStatus.DRAFT,
        created_by=request.user if request.user.is_authenticated else None,
    )

    if payload.tag_ids:
        session.tags.set(payload.tag_ids)
    if payload.scout_level_ids:
        session.scout_levels.set(payload.scout_level_ids)
    if request.user.is_authenticated:
        session.authors.add(request.user)

    enrich_content_with_interactions(request, session, GroupSession)
    session.similar_sessions = []
    return 201, session


@router.patch("/{session_id}/", response=GroupSessionDetailOut)
def update_session(request, session_id: int, payload: GroupSessionUpdateIn):
    """Update an existing group session."""
    session = get_object_or_404(GroupSession, id=session_id)

    # Auth check
    can_edit = request.user.is_authenticated and (
        request.user.is_staff or session.authors.filter(id=request.user.id).exists()
    )
    if not can_edit:
        raise HttpError(403, "Keine Berechtigung zum Bearbeiten.")

    # Update fields
    update_fields = []
    for field in [
        "title",
        "summary",
        "summary_long",
        "description",
        "costs_rating",
        "execution_time",
        "preparation_time",
        "difficulty",
        "status",
        "session_type",
        "location_type",
        "min_participants",
        "max_participants",
    ]:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(session, field, value)
            update_fields.append(field)

    if request.user.is_authenticated:
        session.updated_by = request.user
        update_fields.append("updated_by")

    if update_fields:
        session.save(update_fields=update_fields)

    if payload.tag_ids is not None:
        session.tags.set(payload.tag_ids)
    if payload.scout_level_ids is not None:
        session.scout_levels.set(payload.scout_level_ids)

    session.refresh_from_db()
    session = (
        GroupSession.objects.prefetch_related("scout_levels", "tags__parent", "authors__profile")
        .select_related("created_by")
        .get(id=session_id)
    )
    enrich_content_with_interactions(request, session, GroupSession)
    session.similar_sessions = []
    return session


@router.delete("/{session_id}/", response={204: None})
def delete_session(request, session_id: int):
    """Soft-delete a group session (admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins dürfen Gruppenstunden löschen.")

    session = get_object_or_404(GroupSession, id=session_id)
    session.soft_delete()
    return 204, None


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


@router.get("/{session_id}/comments/", response=list[ContentCommentOut])
def list_session_comments(request, session_id: int):
    """List approved comments for a session."""
    get_object_or_404(GroupSession, id=session_id)
    comments = get_comments(GroupSession, session_id)
    result = []
    for c in comments:
        result.append(
            {
                "id": c.id,
                "text": c.text,
                "author_name": c.author_name,
                "user_id": c.user_id,
                "user_display_name": c.user.first_name if c.user else None,
                "parent_id": c.parent_id,
                "status": c.status,
                "created_at": c.created_at,
                "replies": [
                    {
                        "id": r.id,
                        "text": r.text,
                        "author_name": r.author_name,
                        "user_id": r.user_id,
                        "user_display_name": r.user.first_name if r.user else None,
                        "parent_id": r.parent_id,
                        "status": r.status,
                        "created_at": r.created_at,
                        "replies": [],
                    }
                    for r in c.replies.filter(status="approved").select_related("user")
                ],
            }
        )
    return result


@router.post("/{session_id}/comments/", response={201: ContentCommentOut})
def create_session_comment(request, session_id: int, payload: ContentCommentIn):
    """Create a comment on a session."""
    get_object_or_404(GroupSession, id=session_id)
    comment = create_comment(
        GroupSession,
        session_id,
        text=payload.text,
        request=request,
        author_name=payload.author_name,
        parent_id=payload.parent_id,
    )
    return 201, {
        "id": comment.id,
        "text": comment.text,
        "author_name": comment.author_name,
        "user_id": comment.user_id,
        "user_display_name": comment.user.first_name if comment.user else None,
        "parent_id": comment.parent_id,
        "status": comment.status,
        "created_at": comment.created_at,
        "replies": [],
    }


# ---------------------------------------------------------------------------
# Emotions
# ---------------------------------------------------------------------------


@router.post("/{session_id}/emotions/", response=dict)
def toggle_session_emotion(request, session_id: int, payload: ContentEmotionIn):
    """Toggle an emotion on a session."""
    get_object_or_404(GroupSession, id=session_id)
    counts = toggle_emotion(GroupSession, session_id, payload.emotion_type, request)
    return {"emotion_counts": counts}


# ---------------------------------------------------------------------------
# Materials
# ---------------------------------------------------------------------------


@router.get("/{session_id}/materials/", response=list[dict])
def list_session_materials(request, session_id: int):
    """List materials assigned to a session."""
    from django.contrib.contenttypes.models import ContentType

    from supply.models import ContentMaterialItem

    get_object_or_404(GroupSession, id=session_id)
    ct = ContentType.objects.get_for_model(GroupSession)
    items = (
        ContentMaterialItem.objects.filter(content_type=ct, object_id=session_id)
        .select_related("material")
        .order_by("sort_order")
    )
    return [
        {
            "id": item.id,
            "material_id": item.material_id,
            "material_name": item.material.name,
            "material_slug": item.material.slug,
            "material_category": item.material.material_category,
            "quantity": item.quantity,
            "quantity_type": item.quantity_type,
            "sort_order": item.sort_order,
        }
        for item in items
    ]


@router.post("/{session_id}/materials/", response={201: dict})
def add_session_material(request, session_id: int, payload: ContentMaterialItemIn):
    """Add a material to a session."""
    from django.contrib.contenttypes.models import ContentType

    from supply.models import ContentMaterialItem, Material

    session = get_object_or_404(GroupSession, id=session_id)
    can_edit = request.user.is_authenticated and (
        request.user.is_staff or session.authors.filter(id=request.user.id).exists()
    )
    if not can_edit:
        raise HttpError(403, "Keine Berechtigung.")

    material = get_object_or_404(Material, id=payload.material_id)
    ct = ContentType.objects.get_for_model(GroupSession)
    item = ContentMaterialItem.objects.create(
        content_type=ct,
        object_id=session_id,
        material=material,
        quantity=payload.quantity,
        quantity_type=payload.quantity_type,
        sort_order=payload.sort_order,
    )
    return 201, {
        "id": item.id,
        "material_id": item.material_id,
        "material_name": item.material.name,
        "material_slug": item.material.slug,
        "material_category": item.material.material_category,
        "quantity": item.quantity,
        "quantity_type": item.quantity_type,
        "sort_order": item.sort_order,
    }


@router.delete("/{session_id}/materials/{item_id}/", response={204: None})
def remove_session_material(request, session_id: int, item_id: int):
    """Remove a material from a session."""
    from django.contrib.contenttypes.models import ContentType

    from supply.models import ContentMaterialItem

    session = get_object_or_404(GroupSession, id=session_id)
    can_edit = request.user.is_authenticated and (
        request.user.is_staff or session.authors.filter(id=request.user.id).exists()
    )
    if not can_edit:
        raise HttpError(403, "Keine Berechtigung.")

    ct = ContentType.objects.get_for_model(GroupSession)
    item = get_object_or_404(ContentMaterialItem, id=item_id, content_type=ct, object_id=session_id)
    item.delete()
    return 204, None


# ---------------------------------------------------------------------------
# Image Upload
# ---------------------------------------------------------------------------


@router.post("/{session_id}/image/", response=dict)
def upload_session_image(request, session_id: int):
    """Upload a title image for a session."""
    session = get_object_or_404(GroupSession, id=session_id)
    can_edit = request.user.is_authenticated and (
        request.user.is_staff or session.authors.filter(id=request.user.id).exists()
    )
    if not can_edit:
        raise HttpError(403, "Keine Berechtigung.")

    if "image" not in request.FILES:
        raise HttpError(400, "Kein Bild hochgeladen.")

    session.image = request.FILES["image"]
    session.save(update_fields=["image"])
    return {"image_url": session.image.url if session.image else None}
