"""Django Ninja API routes for ideas."""

import json
import logging
import math

from django.db.models import Count, Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Query, Router, Schema

from .choices import CommentStatus, EmotionType, IdeaTypeChoices, StatusChoices
from .models import (
    Comment,
    Emotion,
    Idea,
    IdeaOfTheWeek,
    IdeaView,
    NutritionalTag,
    ScoutLevel,
    SearchLog,
    Tag,
    TagSuggestion,
    UserPreferences,
)
from .schemas import (
    AiImproveTextIn,
    AiImproveTextOut,
    AiRefurbishIn,
    AiRefurbishOut,
    AiSuggestTagsIn,
    AiSuggestTagsOut,
    AdminIdeaOfTheWeekIn,
    AdminSetAuthorIn,
    AutocompleteOut,
    CommentIn,
    CommentOut,
    EmotionIn,
    EmotionOut,
    IdeaCreateIn,
    IdeaDetailOut,
    IdeaFilterIn,
    IdeaListOut,
    IdeaOfTheWeekOut,
    IdeaSimilarOut,
    IdeaUpdateIn,
    MaterialNameAdminIn,
    MaterialNameDetailOut,
    MaterialNameListOut,
    MaterialUnitAdminIn,
    MaterialUnitOut,
    ModerationActionIn,
    NutritionalTagOut,
    PaginatedIdeaOut,
    ScoutLevelOut,
    TagOut,
    TagSuggestIn,
    TagTreeOut,
    UserPreferencesIn,
    UserPreferencesOut,
)

router = Router(tags=["ideas"])


def _get_session_key(request):
    """Get or create session key for anonymous emotion tracking."""
    if not request.session.session_key:
        request.session.create()
    return request.session.session_key


def _enrich_idea_with_emotions(request, idea):
    """Attach emotion_counts, user_emotion, can_edit, and next_best_ideas to an idea instance."""
    counts = (
        Emotion.objects.filter(idea=idea)
        .values("emotion_type")
        .annotate(count=Count("id"))
    )
    idea.emotion_counts = {row["emotion_type"]: row["count"] for row in counts}

    # Determine what the current user/session voted
    session_key = request.session.session_key or ""
    if request.user.is_authenticated:
        user_emotion = Emotion.objects.filter(
            idea=idea, created_by=request.user
        ).values_list("emotion_type", flat=True).first()
    else:
        user_emotion = Emotion.objects.filter(
            idea=idea, session_key=session_key
        ).exclude(session_key="").values_list("emotion_type", flat=True).first()
    idea.user_emotion = user_emotion

    # Determine if current user can edit this idea
    idea.can_edit = (
        request.user.is_authenticated
        and (request.user.is_staff or idea.authors.filter(id=request.user.id).exists())
    )

    # Attach next best ideas via embedding cosine similarity
    from .services.search_service import find_similar

    idea.next_best_ideas = find_similar(idea, limit=6)

    return idea


# ==========================================================================
# Idea CRUD
# ==========================================================================


@router.get("/", response=PaginatedIdeaOut)
def list_ideas(request, filters: Query[IdeaFilterIn]):
    """List ideas with filtering, search, sorting, and pagination."""
    qs = Idea.objects.filter(status=StatusChoices.PUBLISHED)

    if filters.idea_type:
        qs = qs.filter(idea_type=filters.idea_type)

    if filters.q:
        qs = qs.filter(Q(title__icontains=filters.q) | Q(summary__icontains=filters.q))

    if filters.scout_level_ids:
        qs = qs.filter(scout_levels__id__in=filters.scout_level_ids)
    if filters.tag_slugs:
        # Hierarchical: include children of selected tags
        selected_tags = Tag.objects.filter(slug__in=filters.tag_slugs)
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

    # Sorting
    sort_map = {
        "newest": "-created_at",
        "oldest": "created_at",
        "most_liked": "-like_score",
        "popular": "-view_count",
        "random": "?",
    }
    qs = qs.order_by(sort_map.get(filters.sort, "-created_at"))

    # Pagination
    total = qs.count()
    total_pages = math.ceil(total / filters.page_size) if total > 0 else 1
    offset = (filters.page - 1) * filters.page_size
    items = qs.prefetch_related("scout_levels", "tags")[offset : offset + filters.page_size]

    return {
        "items": items,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": total_pages,
    }


# ==========================================================================
# Search (must be before /{idea_id}/ to avoid path conflicts)
# ==========================================================================


@router.get("/search/", response=PaginatedIdeaOut)
def search_ideas(request, filters: Query[IdeaFilterIn]):
    """Hybrid search: full-text + tag filter + (future) vector similarity."""
    from .services.search_service import hybrid_search

    results, total = hybrid_search(filters)
    total_pages = math.ceil(total / filters.page_size) if total > 0 else 1

    # Log search query for analytics
    if filters.q and filters.q.strip():
        try:
            ip = request.META.get("REMOTE_ADDR", "")
            ip_hash = IdeaView.hash_ip(ip) if ip else ""
            session_key = request.session.session_key or ""
            SearchLog.objects.create(
                query=filters.q.strip()[:500],
                results_count=total,
                session_key=session_key,
                ip_hash=ip_hash,
                user=request.user if request.user.is_authenticated else None,
            )
        except Exception:
            pass  # Don't break search if logging fails

    return {
        "items": results,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": total_pages,
    }


@router.get("/autocomplete/", response=list[AutocompleteOut])
def autocomplete_ideas(request, q: str = ""):
    """Fast typeahead suggestions."""
    if not q or len(q) < 2:
        return []
    return (
        Idea.objects.filter(status=StatusChoices.PUBLISHED, title__icontains=q)
        .values("id", "title", "summary", "slug")[:10]
    )


@router.get("/scout-levels/", response=list[ScoutLevelOut])
def list_scout_levels(request):
    return ScoutLevel.objects.all()


@router.get("/nutritional-tags/", response=list[NutritionalTagOut])
def list_nutritional_tags(request):
    """List all nutritional tags."""
    return NutritionalTag.objects.all()


@router.get("/idea-types/", response=list[dict])
def list_idea_types(request):
    """List available idea types (Idee, Wissensbeitrag, Rezept)."""
    return [
        {"value": choice.value, "label": choice.label}
        for choice in IdeaTypeChoices
    ]


@router.get("/idea-of-the-week/", response=IdeaOfTheWeekOut | None)
def get_idea_of_the_week(request):
    """Get the current idea of the week."""
    iotw = (
        IdeaOfTheWeek.objects.filter(release_date__lte=timezone.now().date())
        .select_related("idea")
        .order_by("-release_date")
        .first()
    )
    return iotw


# ==========================================================================
# Idea Detail (dynamic /{idea_id}/ routes after static paths)
# ==========================================================================


@router.get("/{idea_id}/", response=IdeaDetailOut)
def get_idea(request, idea_id: int):
    """Get a single idea by ID."""
    idea = get_object_or_404(
        Idea.objects.prefetch_related("scout_levels", "tags", "materials", "authors__profile").select_related("created_by"),
        id=idea_id,
        status=StatusChoices.PUBLISHED,
    )
    # Log view (bot-free)
    from .services.view_service import log_view

    log_view(request, idea)
    return _enrich_idea_with_emotions(request, idea)


@router.get("/by-slug/{slug}/", response=IdeaDetailOut)
def get_idea_by_slug(request, slug: str):
    """Get a single idea by slug (SEO-friendly URL)."""
    idea = get_object_or_404(
        Idea.objects.prefetch_related("scout_levels", "tags", "materials", "authors__profile").select_related("created_by"),
        slug=slug,
        status__in=[StatusChoices.PUBLISHED, StatusChoices.REVIEW],
    )
    from .services.view_service import log_view

    log_view(request, idea)
    return _enrich_idea_with_emotions(request, idea)


@router.post("/", response=IdeaDetailOut)
def create_idea(request, payload: IdeaCreateIn):
    """Create a new idea (anonymous or authenticated)."""
    import time

    from ninja.errors import HttpError

    # Bot protection: honeypot must be empty
    if payload.website:
        logger.warning("Bot detected (honeypot filled): %s", payload.website[:100])
        raise HttpError(400, "Invalid submission.")

    # Bot protection: form must have been loaded at least 5 seconds ago
    if payload.form_loaded_at:
        elapsed = (time.time() * 1000 - payload.form_loaded_at) / 1000
        if elapsed < 5:
            logger.warning("Bot detected (too fast): %.1fs", elapsed)
            raise HttpError(400, "Invalid submission.")

    idea = Idea.objects.create(
        title=payload.title,
        idea_type=payload.idea_type,
        summary=payload.summary,
        summary_long=payload.summary_long,
        description=payload.description,
        costs_rating=payload.costs_rating,
        execution_time=payload.execution_time,
        preparation_time=payload.preparation_time,
        difficulty=payload.difficulty,
        status=StatusChoices.REVIEW,
        created_by=request.user if request.user.is_authenticated else None,
    )
    if payload.scout_level_ids:
        idea.scout_levels.set(payload.scout_level_ids)
    if payload.tag_ids:
        idea.tags.set(payload.tag_ids)
    if request.user.is_authenticated:
        idea.authors.add(request.user)

    # Create material items if provided
    if payload.materials:
        from .models import MaterialItem, MaterialName, MeasuringUnit

        for mat in payload.materials:
            mat_name = None
            mat_unit = None
            if mat.material_name:
                mat_name, _ = MaterialName.objects.get_or_create(name=mat.material_name)
            if mat.material_unit:
                mat_unit, _ = MeasuringUnit.objects.get_or_create(name=mat.material_unit)
            MaterialItem.objects.create(
                idea=idea,
                quantity=mat.quantity,
                material_name=mat_name,
                material_unit=mat_unit,
                quantity_type=mat.quantity_type,
            )

    # Generate embedding async (non-blocking for user)
    _schedule_embedding_update(idea.id)

    return idea


@router.patch("/{idea_id}/", response=IdeaDetailOut)
def update_idea(request, idea_id: int, payload: IdeaUpdateIn):
    """Update an idea (auth required – own ideas or admin)."""
    idea = get_object_or_404(Idea, id=idea_id)

    # Permission check: must be author or admin
    if not request.user.is_authenticated:
        from ninja.errors import HttpError

        raise HttpError(403, "Anmeldung erforderlich")
    if not request.user.is_staff and not idea.authors.filter(id=request.user.id).exists():
        from ninja.errors import HttpError

        raise HttpError(403, "Keine Berechtigung")

    for field, value in payload.dict(exclude_unset=True).items():
        if field.endswith("_ids") or field == "materials":
            continue
        setattr(idea, field, value)
    idea.updated_by = request.user
    idea.save()

    if payload.scout_level_ids is not None:
        idea.scout_levels.set(payload.scout_level_ids)
    if payload.tag_ids is not None:
        idea.tags.set(payload.tag_ids)

    if payload.materials is not None:
        from .models import MaterialItem, MaterialName, MeasuringUnit

        idea.materials.all().delete()
        for mat in payload.materials:
            mat_name = None
            mat_unit = None
            if mat.material_name:
                mat_name, _ = MaterialName.objects.get_or_create(name=mat.material_name)
            if mat.material_unit:
                mat_unit, _ = MeasuringUnit.objects.get_or_create(name=mat.material_unit)
            MaterialItem.objects.create(
                idea=idea,
                quantity=mat.quantity,
                material_name=mat_name,
                material_unit=mat_unit,
                quantity_type=mat.quantity_type,
            )

    # Re-generate embedding
    _schedule_embedding_update(idea.id)

    return _enrich_idea_with_emotions(request, idea)


@router.delete("/{idea_id}/")
def delete_idea(request, idea_id: int):
    """Delete an idea (admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        from ninja.errors import HttpError

        raise HttpError(403, "Nur Admins können Ideen löschen")

    idea = get_object_or_404(Idea, id=idea_id)
    idea.delete()
    return {"success": True}


@router.get("/{idea_id}/similar/", response=list[IdeaSimilarOut])
def similar_ideas(request, idea_id: int):
    """Get similar ideas based on embeddings or tag overlap."""
    from .services.search_service import find_similar

    idea = get_object_or_404(Idea, id=idea_id, status=StatusChoices.PUBLISHED)
    return find_similar(idea, limit=6)


# ==========================================================================
# Comments (with moderation)
# ==========================================================================


@router.get("/{idea_id}/comments/", response=list[CommentOut])
def list_comments(request, idea_id: int):
    """List approved comments for an idea."""
    return Comment.objects.filter(idea_id=idea_id, status=CommentStatus.APPROVED)


@router.post("/{idea_id}/comments/", response=CommentOut)
def create_comment(request, idea_id: int, payload: CommentIn):
    """Create a comment (anonymous or authenticated). Anonymous comments need moderation."""
    idea = get_object_or_404(Idea, id=idea_id)

    is_authenticated = request.user.is_authenticated
    comment = Comment.objects.create(
        idea=idea,
        text=payload.text,
        author_name=payload.author_name,
        parent_id=payload.parent_id,
        user=request.user if is_authenticated else None,
        created_by=request.user if is_authenticated else None,
        # Authenticated users' comments are auto-approved
        status=CommentStatus.APPROVED if is_authenticated else CommentStatus.PENDING,
    )
    return comment


# ==========================================================================
# Emotions
# ==========================================================================


@router.post("/{idea_id}/emotions/", response={200: EmotionOut, 204: None})
def add_emotion(request, idea_id: int, payload: EmotionIn):
    """Add or toggle an emotion/reaction on an idea (anonymous allowed)."""
    idea = get_object_or_404(Idea, id=idea_id)
    session_key = _get_session_key(request)

    # Find existing emotion by this user/session
    if request.user.is_authenticated:
        existing = Emotion.objects.filter(idea=idea, created_by=request.user).first()
    else:
        existing = Emotion.objects.filter(
            idea=idea, session_key=session_key
        ).exclude(session_key="").first()

    if existing:
        if existing.emotion_type == payload.emotion_type:
            # Same emotion clicked again → remove it (toggle off)
            existing.delete()
            return 204, None
        else:
            # Different emotion → update
            existing.emotion_type = payload.emotion_type
            existing.save(update_fields=["emotion_type"])
            return 200, existing

    # No existing emotion → create new
    emotion = Emotion.objects.create(
        idea=idea,
        emotion_type=payload.emotion_type,
        created_by=request.user if request.user.is_authenticated else None,
        session_key=session_key,
    )
    return 200, emotion


# ==========================================================================
# Tags (hierarchical)
# ==========================================================================

tag_router = Router(tags=["tags"])


@tag_router.get("/", response=list[TagOut])
def list_tags(request):
    """Get all approved tags as flat list (tree built by frontend)."""
    return Tag.objects.filter(is_approved=True)


@tag_router.post("/suggest/", response={200: dict})
def suggest_tag(request, payload: TagSuggestIn):
    """Suggest a new tag (authenticated users only)."""
    if not request.user.is_authenticated:
        from ninja.errors import HttpError

        raise HttpError(403, "Anmeldung erforderlich")

    TagSuggestion.objects.create(
        name=payload.name,
        parent_id=payload.parent_id,
        suggested_by=request.user,
    )
    return {"success": True, "message": "Tag-Vorschlag eingereicht"}


@tag_router.post("/", response=TagOut)
def create_tag(request, name: str, slug: str, parent_id: int | None = None, icon: str = ""):
    """Create a new tag (admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        from ninja.errors import HttpError

        raise HttpError(403, "Nur Admins")

    return Tag.objects.create(name=name, slug=slug, parent_id=parent_id, icon=icon)


@tag_router.patch("/{tag_id}/", response=TagOut)
def update_tag(request, tag_id: int, name: str | None = None, parent_id: int | None = None, icon: str | None = None):
    """Update a tag (admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        from ninja.errors import HttpError

        raise HttpError(403, "Nur Admins")

    tag = get_object_or_404(Tag, id=tag_id)
    if name is not None:
        tag.name = name
    if parent_id is not None:
        tag.parent_id = parent_id
    if icon is not None:
        tag.icon = icon
    tag.save()
    return tag


@tag_router.delete("/{tag_id}/")
def delete_tag(request, tag_id: int):
    """Delete a tag (admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        from ninja.errors import HttpError

        raise HttpError(403, "Nur Admins")

    tag = get_object_or_404(Tag, id=tag_id)
    tag.delete()
    return {"success": True}


# ==========================================================================
# AI (Vertex AI – Gemini 3.1 Flash Lite)
# ==========================================================================

ai_router = Router(tags=["ai"])


@ai_router.post("/improve-text/", response=AiImproveTextOut)
def improve_text(request, payload: AiImproveTextIn):
    """Improve text using Vertex AI Gemini 3.1 Flash Lite."""
    from .services.ai_service import AIService

    service = AIService()
    result = service.improve_text(payload.text, payload.context)
    return {"improved_text": result}


@ai_router.post("/suggest-tags/", response=AiSuggestTagsOut)
def suggest_tags(request, payload: AiSuggestTagsIn):
    """Suggest tags for text using Vertex AI Gemini 3.1 Flash Lite."""
    from .services.ai_service import AIService

    service = AIService()
    return service.suggest_tags(payload.text)


@ai_router.post("/refurbish/", response=AiRefurbishOut)
def refurbish_text(request, payload: AiRefurbishIn):
    """Convert raw unformatted text into a structured idea using Vertex AI Gemini 3.1 Flash Lite."""
    from .services.ai_service import AIService

    logger = logging.getLogger(__name__)
    logger.info("Refurbish API called – input length: %d chars", len(payload.raw_text))
    logger.info("Refurbish API input (first 500 chars): %s", payload.raw_text[:500])

    service = AIService()
    try:
        result = service.refurbish(payload.raw_text)
    except Exception as exc:
        logger.exception("Refurbish failed")
        return HttpResponse(json.dumps({"detail": str(exc)}), status=500, content_type="application/json")

    logger.info("Refurbish API result: %s", result)
    return result


# ==========================================================================
# User Profile & Preferences
# ==========================================================================

user_router = Router(tags=["users"])


class UserSearchOut(Schema):
    id: int
    scout_display_name: str
    email: str

    @staticmethod
    def resolve_scout_display_name(obj) -> str:
        profile = getattr(obj, "profile", None)
        if profile:
            return profile.scout_display_name
        return obj.email


class UserProfileOut(Schema):
    id: int
    email: str
    first_name: str
    last_name: str
    is_staff: bool


class UserProfileUpdateIn(Schema):
    first_name: str | None = None
    last_name: str | None = None


@user_router.get("/search/", response=list[UserSearchOut])
def search_users(request, q: str = ""):
    """Search users by email or name for planner invitations.

    Only returns users who are public or share a group with the requesting user.
    """
    if not request.user.is_authenticated:
        from ninja.errors import HttpError

        raise HttpError(403, "Anmeldung erforderlich")

    from django.contrib.auth import get_user_model
    from profiles.models import GroupMembership, UserProfile

    User = get_user_model()

    if len(q) < 2:
        return []

    # IDs of groups the current user belongs to
    my_group_ids = GroupMembership.objects.filter(
        user=request.user, is_active=True
    ).values_list("group_id", flat=True)

    # Users in the same groups
    shared_group_user_ids = GroupMembership.objects.filter(
        group_id__in=my_group_ids, is_active=True
    ).exclude(user=request.user).values_list("user_id", flat=True)

    # Users with public profile
    public_user_ids = UserProfile.objects.filter(
        is_public=True
    ).values_list("user_id", flat=True)

    # Combine: public OR shared group
    allowed_user_ids = set(shared_group_user_ids) | set(public_user_ids)

    return (
        User.objects.filter(id__in=allowed_user_ids)
        .filter(
            Q(email__icontains=q)
            | Q(first_name__icontains=q)
            | Q(last_name__icontains=q)
            | Q(username__icontains=q)
            | Q(profile__scout_name__icontains=q)
        )
        .exclude(id=request.user.id)
        .select_related("profile")[:10]
    )


@user_router.get("/me/preferences/", response=UserPreferencesOut)
def get_preferences(request):
    """Get current user's preferences."""
    if not request.user.is_authenticated:
        from ninja.errors import HttpError

        raise HttpError(403, "Anmeldung erforderlich")

    prefs, _ = UserPreferences.objects.get_or_create(user=request.user)
    return prefs


@user_router.patch("/me/preferences/", response=UserPreferencesOut)
def update_preferences(request, payload: UserPreferencesIn):
    """Update user preferences."""
    if not request.user.is_authenticated:
        from ninja.errors import HttpError

        raise HttpError(403, "Anmeldung erforderlich")

    prefs, _ = UserPreferences.objects.get_or_create(user=request.user)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(prefs, field, value)
    prefs.save()
    return prefs


@user_router.get("/{user_id}/", response=UserProfileOut)
def get_user_profile(request, user_id: int):
    """Get a user's profile (own profile or admin)."""
    from django.contrib.auth import get_user_model
    from ninja.errors import HttpError

    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")

    User = get_user_model()
    target_user = get_object_or_404(User, id=user_id)

    # Only own profile or admin
    if target_user.id != request.user.id and not request.user.is_staff:
        raise HttpError(403, "Keine Berechtigung")

    return target_user


@user_router.patch("/{user_id}/", response=UserProfileOut)
def update_user_profile(request, user_id: int, payload: UserProfileUpdateIn):
    """Update a user's profile (own profile or admin)."""
    from django.contrib.auth import get_user_model
    from ninja.errors import HttpError

    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")

    User = get_user_model()
    target_user = get_object_or_404(User, id=user_id)

    # Only own profile or admin
    if target_user.id != request.user.id and not request.user.is_staff:
        raise HttpError(403, "Keine Berechtigung")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(target_user, field, value)
    target_user.save()
    return target_user


# ==========================================================================
# Admin
# ==========================================================================

admin_router = Router(tags=["admin"])


def _require_admin(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        from ninja.errors import HttpError

        raise HttpError(403, "Nur Admins")


@admin_router.get("/idea-of-the-week/", response=list[IdeaOfTheWeekOut])
def list_ideas_of_the_week(request):
    """List all idea-of-the-week entries (admin only)."""
    _require_admin(request)
    return IdeaOfTheWeek.objects.select_related("idea").all()


@admin_router.post("/idea-of-the-week/", response=IdeaOfTheWeekOut)
def set_idea_of_the_week(request, payload: AdminIdeaOfTheWeekIn):
    """Set the idea of the week (admin only)."""
    _require_admin(request)
    idea = get_object_or_404(Idea, id=payload.idea_id)
    release_date = payload.release_date or timezone.now().date()
    iotw = IdeaOfTheWeek.objects.create(
        idea=idea,
        release_date=release_date,
        description=payload.description,
    )
    return iotw


@admin_router.delete("/idea-of-the-week/{entry_id}/")
def delete_idea_of_the_week(request, entry_id: int):
    """Delete an idea-of-the-week entry (admin only)."""
    _require_admin(request)
    entry = get_object_or_404(IdeaOfTheWeek, id=entry_id)
    entry.delete()
    return {"success": True}


@admin_router.get("/moderation/", response=list[CommentOut])
def list_pending_comments(request):
    """List comments pending moderation."""
    _require_admin(request)
    return Comment.objects.filter(status=CommentStatus.PENDING).select_related("idea")


@admin_router.post("/moderation/{comment_id}/", response=CommentOut)
def moderate_comment(request, comment_id: int, payload: ModerationActionIn):
    """Approve or reject a comment."""
    _require_admin(request)
    comment = get_object_or_404(Comment, id=comment_id)

    if payload.action == "approve":
        comment.status = CommentStatus.APPROVED
    elif payload.action == "reject":
        comment.status = CommentStatus.REJECTED
    else:
        from ninja.errors import HttpError

        raise HttpError(400, "action muss 'approve' oder 'reject' sein")

    comment.save()
    return comment


class AdminUserOut(Schema):
    id: int
    email: str
    first_name: str
    last_name: str
    is_staff: bool
    is_active: bool
    date_joined: str


@admin_router.get("/users/", response=list[AdminUserOut])
def list_users(request):
    """List all users (admin only)."""
    _require_admin(request)
    from django.contrib.auth import get_user_model

    User = get_user_model()
    return [
        {
            "id": u.id,
            "email": u.email,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "is_staff": u.is_staff,
            "is_active": u.is_active,
            "date_joined": u.date_joined.isoformat(),
        }
        for u in User.objects.all().order_by("-date_joined")
    ]


@admin_router.get("/users/{user_id}/", response=dict)
def get_user_detail(request, user_id: int):
    """Get detailed info about a single user (admin only)."""
    _require_admin(request)
    from django.contrib.auth import get_user_model
    from django.db.models import F

    User = get_user_model()
    u = get_object_or_404(User, id=user_id)

    ideas = list(
        Idea.objects.filter(created_by=u)
        .order_by("-created_at")
        .values("id", "title", "slug", "status", "idea_type", "created_at")
    )
    for i in ideas:
        i["created_at"] = i["created_at"].isoformat()

    comments = list(
        Comment.objects.filter(user=u)
        .order_by("-created_at")[:20]
        .values("id", "text", "status", "created_at", idea_title=F("idea__title"), idea_slug=F("idea__slug"))
    )
    for c in comments:
        c["created_at"] = c["created_at"].isoformat()

    return {
        "id": u.id,
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "is_staff": u.is_staff,
        "is_active": u.is_active,
        "date_joined": u.date_joined.isoformat(),
        "last_login": u.last_login.isoformat() if u.last_login else None,
        "ideas": ideas,
        "comments": comments,
    }


@admin_router.get("/statistics/", response=dict)
def get_statistics(request):
    """Get usage statistics (admin only)."""
    _require_admin(request)
    from django.contrib.auth import get_user_model
    from django.db.models import Count, Sum

    User = get_user_model()
    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)

    return {
        "total_ideas": Idea.objects.count(),
        "published_ideas": Idea.objects.filter(status=StatusChoices.PUBLISHED).count(),
        "total_users": User.objects.count(),
        "total_comments": Comment.objects.filter(status=CommentStatus.APPROVED).count(),
        "pending_comments": Comment.objects.filter(status=CommentStatus.PENDING).count(),
        "views_last_30_days": IdeaView.objects.filter(created_at__gte=thirty_days_ago).count(),
        "top_ideas": list(
            Idea.objects.filter(status=StatusChoices.PUBLISHED)
            .order_by("-view_count")[:10]
            .values("id", "title", "slug", "view_count", "like_score")
        ),
    }


@admin_router.get("/recent-activity/", response=dict)
def get_recent_activity(request):
    """Get recent activity: last views, searches, and created ideas (admin only)."""
    _require_admin(request)
    from django.db.models import F

    # Last 20 views
    recent_views = list(
        IdeaView.objects.select_related("idea", "user")
        .order_by("-created_at")[:20]
        .values(
            "id",
            "created_at",
            idea_title=F("idea__title"),
            idea_slug=F("idea__slug"),
            user_email=F("user__email"),
        )
    )
    for v in recent_views:
        v["created_at"] = v["created_at"].isoformat()

    # Last 20 searches
    recent_searches = list(
        SearchLog.objects.select_related("user")
        .order_by("-created_at")[:20]
        .values("id", "query", "results_count", "created_at", user_email=F("user__email"))
    )
    for s in recent_searches:
        s["created_at"] = s["created_at"].isoformat()

    # Last 20 created ideas
    recent_ideas = list(
        Idea.objects.order_by("-created_at")[:20]
        .values("id", "title", "slug", "status", "idea_type", "created_at", author_email=F("created_by__email"))
    )
    for i in recent_ideas:
        i["created_at"] = i["created_at"].isoformat()

    return {
        "recent_views": recent_views,
        "recent_searches": recent_searches,
        "recent_ideas": recent_ideas,
    }


@admin_router.get("/trending/", response=dict)
def get_trending(request):
    """Get most viewed and most liked ideas in the last 7 days (admin only)."""
    _require_admin(request)
    from django.db.models import Count, Sum

    seven_days_ago = timezone.now() - timezone.timedelta(days=7)

    # Most viewed in last 7 days (by actual view records, not cumulative view_count)
    most_viewed = list(
        IdeaView.objects.filter(created_at__gte=seven_days_ago)
        .values("idea__id", "idea__title", "idea__slug")
        .annotate(views_7d=Count("id"))
        .order_by("-views_7d")[:10]
    )
    most_viewed = [
        {
            "id": item["idea__id"],
            "title": item["idea__title"],
            "slug": item["idea__slug"],
            "views_7d": item["views_7d"],
        }
        for item in most_viewed
    ]

    # Most liked in last 7 days (emotions created in last 7 days)
    most_liked = list(
        Emotion.objects.filter(created_at__gte=seven_days_ago)
        .values("idea__id", "idea__title", "idea__slug")
        .annotate(likes_7d=Count("id"))
        .order_by("-likes_7d")[:10]
    )
    most_liked = [
        {
            "id": item["idea__id"],
            "title": item["idea__title"],
            "slug": item["idea__slug"],
            "likes_7d": item["likes_7d"],
        }
        for item in most_liked
    ]

    return {
        "most_viewed": most_viewed,
        "most_liked": most_liked,
    }


@admin_router.post("/ideas/{idea_id}/author/")
def set_author(request, idea_id: int, payload: AdminSetAuthorIn):
    """Change the author of an idea (admin only)."""
    _require_admin(request)
    from django.contrib.auth import get_user_model

    User = get_user_model()
    idea = get_object_or_404(Idea, id=idea_id)
    user = get_object_or_404(User, id=payload.user_id)
    idea.authors.set([user])
    return {"success": True}


@admin_router.post("/ideas/{idea_id}/instagram/")
def generate_instagram(request, idea_id: int):
    """Generate 3 Instagram slides for an idea (admin only)."""
    _require_admin(request)
    idea = get_object_or_404(Idea, id=idea_id)

    from .services.export_service import generate_instagram_slides

    slides = generate_instagram_slides(idea)
    return {"slides": slides, "message": "3 Instagram-Slides generiert"}


# ==========================================================================
# Admin: Material & Unit CRUD
# ==========================================================================


@admin_router.get("/materials/")
def list_material_names(request, page: int = 1, page_size: int = 20, q: str = ""):
    """List all material names with pagination (admin only)."""
    _require_admin(request)
    from .models import MaterialName

    qs = MaterialName.objects.select_related("default_unit").all().order_by("name")
    if q:
        qs = qs.filter(name__icontains=q)
    total = qs.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    offset = (page - 1) * page_size
    items = qs[offset : offset + page_size]

    return {
        "items": [
            {
                "id": m.id,
                "name": m.name,
                "slug": m.slug,
                "default_unit": m.default_unit.name if m.default_unit else None,
            }
            for m in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@admin_router.post("/materials/", response=MaterialNameListOut)
def create_material_name(request, payload: MaterialNameAdminIn):
    """Create a new material name (admin only)."""
    _require_admin(request)
    from .models import MaterialName

    mat = MaterialName.objects.create(
        name=payload.name,
        description=payload.description,
        default_unit_id=payload.default_unit_id,
    )
    return {
        "id": mat.id,
        "name": mat.name,
        "slug": mat.slug,
        "default_unit": mat.default_unit.name if mat.default_unit else None,
    }


@admin_router.patch("/materials/{material_id}/", response=MaterialNameListOut)
def update_material_name(request, material_id: int, payload: MaterialNameAdminIn):
    """Update a material name (admin only)."""
    _require_admin(request)
    from .models import MaterialName

    mat = get_object_or_404(MaterialName, id=material_id)
    mat.name = payload.name
    mat.description = payload.description
    mat.default_unit_id = payload.default_unit_id
    mat.save()
    return {
        "id": mat.id,
        "name": mat.name,
        "slug": mat.slug,
        "default_unit": mat.default_unit.name if mat.default_unit else None,
    }


@admin_router.delete("/materials/{material_id}/")
def delete_material_name(request, material_id: int):
    """Delete a material name (admin only)."""
    _require_admin(request)
    from .models import MaterialName

    mat = get_object_or_404(MaterialName, id=material_id)
    mat.delete()
    return {"success": True}


@admin_router.get("/units/", response=list[MaterialUnitOut])
def list_material_units(request):
    """List all measuring units (admin only)."""
    _require_admin(request)
    from .models import MeasuringUnit

    return MeasuringUnit.objects.all().order_by("name")


@admin_router.post("/units/", response=MaterialUnitOut)
def create_material_unit(request, payload: MaterialUnitAdminIn):
    """Create a new measuring unit (admin only)."""
    _require_admin(request)
    from .models import MeasuringUnit

    return MeasuringUnit.objects.create(
        name=payload.name,
        description=payload.description,
        quantity=payload.quantity,
        unit=payload.unit,
    )


@admin_router.patch("/units/{unit_id}/", response=MaterialUnitOut)
def update_material_unit(request, unit_id: int, payload: MaterialUnitAdminIn):
    """Update a measuring unit (admin only)."""
    _require_admin(request)
    from .models import MeasuringUnit

    unit = get_object_or_404(MeasuringUnit, id=unit_id)
    unit.name = payload.name
    unit.description = payload.description
    unit.quantity = payload.quantity
    unit.unit = payload.unit
    unit.save()
    return unit


@admin_router.delete("/units/{unit_id}/")
def delete_material_unit(request, unit_id: int):
    """Delete a measuring unit (admin only)."""
    _require_admin(request)
    from .models import MeasuringUnit

    unit = get_object_or_404(MeasuringUnit, id=unit_id)
    unit.delete()
    return {"success": True}


# ==========================================================================
# Material Detail (public)
# ==========================================================================

material_router = Router(tags=["materials"])


@material_router.get("/", response=list[MaterialNameListOut])
def list_materials(request):
    """List all material names (public)."""
    from .models import MaterialName

    return [
        {
            "id": m.id,
            "name": m.name,
            "slug": m.slug,
            "default_unit": m.default_unit.name if m.default_unit else None,
        }
        for m in MaterialName.objects.select_related("default_unit").all().order_by("name")
    ]


@material_router.get("/by-slug/{slug}/", response=MaterialNameDetailOut)
def get_material_by_slug(request, slug: str):
    """Get material details by slug, including all ideas using this material."""
    from .models import MaterialName

    mat = get_object_or_404(MaterialName.objects.select_related("default_unit"), slug=slug)
    ideas = (
        Idea.objects.filter(
            materials__material_name=mat,
            status=StatusChoices.PUBLISHED,
        )
        .distinct()
        .values("id", "title", "slug", "summary", "image")[:50]
    )
    return {
        "id": mat.id,
        "name": mat.name,
        "slug": mat.slug,
        "description": mat.description,
        "default_unit": mat.default_unit.name if mat.default_unit else None,
        "ideas": [
            {
                "id": i["id"],
                "title": i["title"],
                "slug": i["slug"],
                "summary": i["summary"],
                "image_url": i["image"] if i["image"] else None,
            }
            for i in ideas
        ],
    }


# ==========================================================================
# Helpers
# ==========================================================================


def _schedule_embedding_update(idea_id: int):
    """Schedule embedding update for an idea (sync for now, async later)."""
    try:
        from .services.ai_service import AIService

        idea = Idea.objects.get(id=idea_id)
        service = AIService()
        text = f"{idea.title}. {idea.summary}. {idea.description}"
        embedding = service.create_embedding(text)
        if embedding:
            # Store as binary for now; switch to pgvector VectorField later
            import struct

            idea.embedding = struct.pack(f"{len(embedding)}f", *embedding)
            idea.save(update_fields=["embedding"])
    except Exception:
        import logging

        logging.getLogger(__name__).warning("Embedding update failed for idea %s", idea_id, exc_info=True)
