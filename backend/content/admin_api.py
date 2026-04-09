"""
Admin API — Statistics, trending, users, moderation, materials, units.

Endpoints:
  /api/admin/statistics/        — Dashboard statistics
  /api/admin/trending/          — Trending content (7-day window)
  /api/admin/recent-activity/   — Recent views, searches, content
  /api/admin/users/             — User list
  /api/admin/users/{id}/        — User detail with content & comments
  /api/admin/moderation/        — Comment moderation queue
  /api/admin/materials/         — Material CRUD (paginated)
  /api/admin/materials/{id}/    — Material update/delete
  /api/admin/units/             — Measuring unit CRUD
  /api/admin/units/{id}/        — Unit update/delete
"""

import math
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Query, Router, Schema
from ninja.errors import HttpError

from blog.models import Blog
from content.choices import CommentStatus, ContentStatus
from content.models import ContentComment, ContentEmotion, ContentView, SearchLog
from game.models import Game
from recipe.models import Recipe
from session.models import GroupSession
from supply.models import Material, MeasuringUnit

User = get_user_model()

router = Router(tags=["admin"])


def _require_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins haben Zugriff.")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class TopIdeaOut(Schema):
    id: int
    title: str
    slug: str
    view_count: int
    like_score: int


class StatsOut(Schema):
    total_ideas: int
    published_ideas: int
    total_users: int
    total_comments: int
    pending_comments: int
    views_last_30_days: int
    top_ideas: list[TopIdeaOut]


class TrendingViewOut(Schema):
    id: int
    title: str
    slug: str
    views_7d: int


class TrendingLikeOut(Schema):
    id: int
    title: str
    slug: str
    likes_7d: int


class TrendingOut(Schema):
    most_viewed: list[TrendingViewOut]
    most_liked: list[TrendingLikeOut]


class AdminUserOut(Schema):
    id: int
    email: str
    first_name: str
    last_name: str
    is_staff: bool
    is_active: bool
    date_joined: str

    @staticmethod
    def resolve_date_joined(obj) -> str:
        return obj.date_joined.isoformat()


class AdminUserIdeaOut(Schema):
    id: int
    title: str
    slug: str
    status: str
    idea_type: str
    created_at: str

    @staticmethod
    def resolve_created_at(obj) -> str:
        return obj["created_at"].isoformat()


class AdminUserCommentOut(Schema):
    id: int
    text: str
    status: str
    created_at: str
    idea_title: str | None
    idea_slug: str | None


class AdminUserDetailOut(Schema):
    id: int
    email: str
    first_name: str
    last_name: str
    is_staff: bool
    is_active: bool
    date_joined: str
    last_login: str | None
    ideas: list[AdminUserIdeaOut]
    comments: list[AdminUserCommentOut]


class RecentViewOut(Schema):
    id: int
    created_at: str
    idea_title: str | None
    idea_slug: str | None
    user_email: str | None


class RecentSearchOut(Schema):
    id: int
    query: str
    results_count: int
    created_at: str
    user_email: str | None


class RecentIdeaOut(Schema):
    id: int
    title: str
    slug: str
    status: str
    idea_type: str
    created_at: str
    author_email: str | None


class RecentActivityOut(Schema):
    recent_views: list[RecentViewOut]
    recent_searches: list[RecentSearchOut]
    recent_ideas: list[RecentIdeaOut]


class CommentModerationOut(Schema):
    id: int
    text: str
    author_name: str
    status: str
    created_at: str
    content_type: str
    object_id: int
    user_email: str | None

    @staticmethod
    def resolve_created_at(obj) -> str:
        return obj.created_at.isoformat()

    @staticmethod
    def resolve_content_type(obj) -> str:
        return obj.content_type.model

    @staticmethod
    def resolve_user_email(obj) -> str | None:
        return obj.user.email if obj.user else None


class ModerationActionIn(Schema):
    comment_id: int
    action: str  # "approve" or "reject"


class MaterialAdminOut(Schema):
    id: int
    name: str
    slug: str
    default_unit: str | None = None


class MaterialAdminCreateIn(Schema):
    name: str
    description: str = ""
    default_unit_id: int | None = None


class MaterialAdminUpdateIn(Schema):
    name: str | None = None
    description: str | None = None
    default_unit_id: int | None = None


class PaginatedMaterialAdminOut(Schema):
    items: list[MaterialAdminOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class UnitOut(Schema):
    id: int
    name: str
    description: str
    quantity: float
    unit: str


class UnitCreateIn(Schema):
    name: str


class UnitUpdateIn(Schema):
    name: str | None = None


# ---------------------------------------------------------------------------
# Helper: gather all content models
# ---------------------------------------------------------------------------

CONTENT_MODELS = [GroupSession, Blog, Game, Recipe]
CONTENT_TYPE_LABELS = {
    "groupsession": "session",
    "blog": "blog",
    "game": "game",
    "recipe": "recipe",
}


def _get_all_content_qs():
    """Return list of (model, queryset) for all content types."""
    return [(m, m.objects.all()) for m in CONTENT_MODELS]


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------


@router.get("/statistics/", response=StatsOut)
def admin_statistics(request):
    _require_staff(request)

    total_ideas = sum(m.objects.count() for m in CONTENT_MODELS)
    published_ideas = sum(
        m.objects.filter(status=ContentStatus.APPROVED).count() for m in CONTENT_MODELS
    )

    total_users = User.objects.count()
    total_comments = ContentComment.objects.count()
    pending_comments = ContentComment.objects.filter(status=CommentStatus.PENDING).count()

    thirty_days_ago = timezone.now() - timedelta(days=30)
    views_last_30_days = ContentView.objects.filter(created_at__gte=thirty_days_ago).count()

    # Top ideas by view_count across all content types
    top_ideas = []
    for model in CONTENT_MODELS:
        for item in model.objects.order_by("-view_count")[:5]:
            top_ideas.append({
                "id": item.id,
                "title": item.title,
                "slug": item.slug,
                "view_count": item.view_count,
                "like_score": item.like_score,
            })
    top_ideas.sort(key=lambda x: x["view_count"], reverse=True)
    top_ideas = top_ideas[:10]

    return {
        "total_ideas": total_ideas,
        "published_ideas": published_ideas,
        "total_users": total_users,
        "total_comments": total_comments,
        "pending_comments": pending_comments,
        "views_last_30_days": views_last_30_days,
        "top_ideas": top_ideas,
    }


# ---------------------------------------------------------------------------
# Trending (7-day window)
# ---------------------------------------------------------------------------


@router.get("/trending/", response=TrendingOut)
def admin_trending(request):
    _require_staff(request)

    seven_days_ago = timezone.now() - timedelta(days=7)

    # Most viewed: count ContentView records per content object in last 7 days
    view_counts = (
        ContentView.objects.filter(created_at__gte=seven_days_ago)
        .values("content_type_id", "object_id")
        .annotate(views_7d=Count("id"))
        .order_by("-views_7d")[:10]
    )

    most_viewed = []
    for vc in view_counts:
        ct = ContentType.objects.get(id=vc["content_type_id"])
        try:
            obj = ct.get_object_for_this_type(id=vc["object_id"])
            most_viewed.append({
                "id": obj.id,
                "title": obj.title,
                "slug": obj.slug,
                "views_7d": vc["views_7d"],
            })
        except ct.model_class().DoesNotExist:
            continue

    # Most liked: count ContentEmotion records in last 7 days
    like_counts = (
        ContentEmotion.objects.filter(created_at__gte=seven_days_ago)
        .values("content_type_id", "object_id")
        .annotate(likes_7d=Count("id"))
        .order_by("-likes_7d")[:10]
    )

    most_liked = []
    for lc in like_counts:
        ct = ContentType.objects.get(id=lc["content_type_id"])
        try:
            obj = ct.get_object_for_this_type(id=lc["object_id"])
            most_liked.append({
                "id": obj.id,
                "title": obj.title,
                "slug": obj.slug,
                "likes_7d": lc["likes_7d"],
            })
        except ct.model_class().DoesNotExist:
            continue

    return {"most_viewed": most_viewed, "most_liked": most_liked}


# ---------------------------------------------------------------------------
# Recent Activity
# ---------------------------------------------------------------------------


@router.get("/recent-activity/", response=RecentActivityOut)
def admin_recent_activity(request):
    _require_staff(request)

    # Recent views
    recent_views_qs = ContentView.objects.select_related("user", "content_type").order_by(
        "-created_at"
    )[:20]
    recent_views = []
    for v in recent_views_qs:
        title = None
        slug = None
        try:
            obj = v.content_object
            if obj and hasattr(obj, "title"):
                title = obj.title
                slug = obj.slug
        except Exception:
            pass
        recent_views.append({
            "id": v.id,
            "created_at": v.created_at.isoformat(),
            "idea_title": title,
            "idea_slug": slug,
            "user_email": v.user.email if v.user else None,
        })

    # Recent searches
    recent_searches_qs = SearchLog.objects.select_related("user").order_by("-created_at")[:20]
    recent_searches = [
        {
            "id": s.id,
            "query": s.query,
            "results_count": s.results_count,
            "created_at": s.created_at.isoformat(),
            "user_email": s.user.email if s.user else None,
        }
        for s in recent_searches_qs
    ]

    # Recent content
    recent_ideas = []
    for model in CONTENT_MODELS:
        model_name = model.__name__.lower()
        label = CONTENT_TYPE_LABELS.get(model_name, model_name)
        for item in model.objects.select_related("created_by").order_by("-created_at")[:5]:
            recent_ideas.append({
                "id": item.id,
                "title": item.title,
                "slug": item.slug,
                "status": item.status,
                "idea_type": label,
                "created_at": item.created_at.isoformat(),
                "author_email": item.created_by.email if item.created_by else None,
            })
    recent_ideas.sort(key=lambda x: x["created_at"], reverse=True)
    recent_ideas = recent_ideas[:20]

    return {
        "recent_views": recent_views,
        "recent_searches": recent_searches,
        "recent_ideas": recent_ideas,
    }


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------


@router.get("/users/", response=list[AdminUserOut])
def admin_users(request):
    _require_staff(request)
    return list(User.objects.all().order_by("-date_joined"))


@router.get("/users/{user_id}/", response=AdminUserDetailOut)
def admin_user_detail(request, user_id: int):
    _require_staff(request)

    user = get_object_or_404(User, id=user_id)

    # Gather all content by this user
    ideas = []
    for model in CONTENT_MODELS:
        model_name = model.__name__.lower()
        label = CONTENT_TYPE_LABELS.get(model_name, model_name)
        for item in model.objects.filter(created_by=user).values(
            "id", "title", "slug", "status", "created_at"
        ):
            item["idea_type"] = label
            ideas.append(item)
    ideas.sort(key=lambda x: x["created_at"], reverse=True)

    # Gather comments
    comments_qs = ContentComment.objects.filter(user=user).select_related("content_type")
    comments = []
    for c in comments_qs:
        title = None
        slug = None
        try:
            obj = c.content_object
            if obj and hasattr(obj, "title"):
                title = obj.title
                slug = obj.slug
        except Exception:
            pass
        comments.append({
            "id": c.id,
            "text": c.text,
            "status": c.status,
            "created_at": c.created_at.isoformat(),
            "idea_title": title,
            "idea_slug": slug,
        })

    return {
        "id": user.id,
        "email": user.email,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "is_staff": user.is_staff,
        "is_active": user.is_active,
        "date_joined": user.date_joined.isoformat(),
        "last_login": user.last_login.isoformat() if user.last_login else None,
        "ideas": ideas,
        "comments": comments,
    }


# ---------------------------------------------------------------------------
# Moderation
# ---------------------------------------------------------------------------


@router.get("/moderation/", response=list[CommentModerationOut])
def moderation_queue(request):
    _require_staff(request)
    return list(
        ContentComment.objects.filter(status=CommentStatus.PENDING)
        .select_related("content_type", "user")
        .order_by("-created_at")
    )


@router.post("/moderation/", response=CommentModerationOut)
def moderate_comment(request, payload: ModerationActionIn):
    _require_staff(request)

    comment = get_object_or_404(ContentComment, id=payload.comment_id)
    if payload.action == "approve":
        comment.status = CommentStatus.APPROVED
    elif payload.action == "reject":
        comment.status = CommentStatus.REJECTED
    else:
        raise HttpError(400, "Ungültige Aktion. Erlaubt: approve, reject")
    comment.save(update_fields=["status", "updated_at"])
    return comment


# ---------------------------------------------------------------------------
# Materials (Admin CRUD)
# ---------------------------------------------------------------------------


class MaterialFilterIn(Schema):
    q: str = ""
    page: int = 1
    page_size: int = 20


@router.get("/materials/", response=PaginatedMaterialAdminOut)
def admin_materials(request, filters: Query[MaterialFilterIn]):
    _require_staff(request)

    qs = Material.objects.all()
    if filters.q:
        qs = qs.filter(Q(name__icontains=filters.q) | Q(description__icontains=filters.q))

    total = qs.count()
    total_pages = max(1, math.ceil(total / filters.page_size))
    offset = (filters.page - 1) * filters.page_size
    items = []
    for m in qs[offset : offset + filters.page_size]:
        items.append({
            "id": m.id,
            "name": m.name,
            "slug": m.slug,
            "default_unit": None,
        })

    return {
        "items": items,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": total_pages,
    }


@router.post("/materials/", response={201: MaterialAdminOut})
def admin_create_material(request, payload: MaterialAdminCreateIn):
    _require_staff(request)

    material = Material.objects.create(
        name=payload.name,
        description=payload.description,
        created_by=request.user,
    )
    return 201, {"id": material.id, "name": material.name, "slug": material.slug, "default_unit": None}


@router.patch("/materials/{material_id}/", response=MaterialAdminOut)
def admin_update_material(request, material_id: int, payload: MaterialAdminUpdateIn):
    _require_staff(request)

    material = get_object_or_404(Material, id=material_id)
    if payload.name is not None:
        material.name = payload.name
    if payload.description is not None:
        material.description = payload.description
    material.updated_by = request.user
    material.save()
    return {"id": material.id, "name": material.name, "slug": material.slug, "default_unit": None}


@router.delete("/materials/{material_id}/", response={204: None})
def admin_delete_material(request, material_id: int):
    _require_staff(request)

    material = get_object_or_404(Material, id=material_id)
    material.soft_delete()
    return 204, None


# ---------------------------------------------------------------------------
# Measuring Units
# ---------------------------------------------------------------------------


@router.get("/units/", response=list[UnitOut])
def admin_units(request):
    _require_staff(request)
    return list(MeasuringUnit.objects.all())


@router.post("/units/", response={201: UnitOut})
def admin_create_unit(request, payload: UnitCreateIn):
    _require_staff(request)
    unit = MeasuringUnit.objects.create(name=payload.name)
    return 201, unit


@router.patch("/units/{unit_id}/", response=UnitOut)
def admin_update_unit(request, unit_id: int, payload: UnitUpdateIn):
    _require_staff(request)
    unit = get_object_or_404(MeasuringUnit, id=unit_id)
    if payload.name is not None:
        unit.name = payload.name
        unit.save(update_fields=["name", "updated_at"])
    return unit


@router.delete("/units/{unit_id}/", response={204: None})
def admin_delete_unit(request, unit_id: int):
    _require_staff(request)
    unit = get_object_or_404(MeasuringUnit, id=unit_id)
    unit.delete()
    return 204, None
