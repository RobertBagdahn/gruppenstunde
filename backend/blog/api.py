"""Django Ninja API routes for blogs."""

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
    record_view,
    toggle_emotion,
)
from content.base_schemas import ContentCommentIn, ContentCommentOut, ContentEmotionIn
from content.choices import ContentStatus
from content.models import Tag

from .models import Blog
from .schemas import (
    BlogCreateIn,
    BlogDetailOut,
    BlogListOut,
    BlogUpdateIn,
    PaginatedBlogOut,
)

logger = logging.getLogger(__name__)

router = Router(tags=["blogs"])


# ---------------------------------------------------------------------------
# Filter Schema
# ---------------------------------------------------------------------------


class BlogFilterIn(Schema):
    q: str = ""
    blog_type: str | None = None
    scout_level_ids: str | None = None
    tag_slugs: str | None = None
    difficulty: str | None = None
    sort: str = "newest"
    page: int = 1
    page_size: int = 20


# ---------------------------------------------------------------------------
# List & Search
# ---------------------------------------------------------------------------


@router.get("/", response=PaginatedBlogOut)
def list_blogs(request, filters: Query[BlogFilterIn]):
    """List blogs with filtering, search, sorting, and pagination."""
    qs = Blog.objects.filter(status=ContentStatus.APPROVED)

    if filters.q:
        qs = qs.filter(Q(title__icontains=filters.q) | Q(summary__icontains=filters.q))

    if filters.blog_type:
        qs = qs.filter(blog_type=filters.blog_type)
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
def autocomplete_blogs(request, q: str = ""):
    """Fast typeahead suggestions for blogs."""
    if not q or len(q) < 2:
        return []
    return list(
        Blog.objects.filter(status=ContentStatus.APPROVED, title__icontains=q).values("id", "title", "summary", "slug")[
            :10
        ]
    )


# ---------------------------------------------------------------------------
# Detail (by ID and by slug)
# ---------------------------------------------------------------------------


@router.get("/by-slug/{slug}/", response=BlogDetailOut)
def get_blog_by_slug(request, slug: str):
    """Get a single blog by slug (SEO-friendly)."""
    blog = get_object_or_404(
        Blog.objects.prefetch_related("scout_levels", "tags__parent", "authors__profile").select_related("created_by"),
        slug=slug,
    )
    enrich_content_with_interactions(request, blog, Blog)
    blog.similar_blogs = []
    record_view(Blog, blog.id, request)
    return blog


@router.get("/{blog_id}/", response=BlogDetailOut)
def get_blog(request, blog_id: int):
    """Get a single blog by ID."""
    blog = get_object_or_404(
        Blog.objects.prefetch_related("scout_levels", "tags__parent", "authors__profile").select_related("created_by"),
        id=blog_id,
    )
    enrich_content_with_interactions(request, blog, Blog)
    blog.similar_blogs = []
    record_view(Blog, blog.id, request)
    return blog


# ---------------------------------------------------------------------------
# Create / Update / Delete
# ---------------------------------------------------------------------------


@router.post("/", response={201: BlogDetailOut})
def create_blog(request, payload: BlogCreateIn):
    """Create a new blog post."""
    blog = Blog.objects.create(
        title=payload.title,
        summary=payload.summary,
        summary_long=payload.summary_long,
        description=payload.description,
        costs_rating=payload.costs_rating,
        execution_time=payload.execution_time,
        preparation_time=payload.preparation_time,
        difficulty=payload.difficulty,
        blog_type=payload.blog_type,
        show_table_of_contents=payload.show_table_of_contents,
        status=ContentStatus.DRAFT,
        created_by=request.user if request.user.is_authenticated else None,
    )

    if payload.tag_ids:
        blog.tags.set(payload.tag_ids)
    if payload.scout_level_ids:
        blog.scout_levels.set(payload.scout_level_ids)
    if request.user.is_authenticated:
        blog.authors.add(request.user)

    enrich_content_with_interactions(request, blog, Blog)
    blog.similar_blogs = []
    return 201, blog


@router.patch("/{blog_id}/", response=BlogDetailOut)
def update_blog(request, blog_id: int, payload: BlogUpdateIn):
    """Update an existing blog."""
    blog = get_object_or_404(Blog, id=blog_id)

    can_edit = request.user.is_authenticated and (
        request.user.is_staff or blog.authors.filter(id=request.user.id).exists()
    )
    if not can_edit:
        raise HttpError(403, "Keine Berechtigung zum Bearbeiten.")

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
        "blog_type",
        "show_table_of_contents",
    ]:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(blog, field, value)
            update_fields.append(field)

    if request.user.is_authenticated:
        blog.updated_by = request.user
        update_fields.append("updated_by")

    if update_fields:
        blog.save(update_fields=update_fields)

    if payload.tag_ids is not None:
        blog.tags.set(payload.tag_ids)
    if payload.scout_level_ids is not None:
        blog.scout_levels.set(payload.scout_level_ids)

    blog.refresh_from_db()
    blog = (
        Blog.objects.prefetch_related("scout_levels", "tags__parent", "authors__profile")
        .select_related("created_by")
        .get(id=blog_id)
    )
    enrich_content_with_interactions(request, blog, Blog)
    blog.similar_blogs = []
    return blog


@router.delete("/{blog_id}/", response={204: None})
def delete_blog(request, blog_id: int):
    """Soft-delete a blog (admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins dürfen Blogs löschen.")

    blog = get_object_or_404(Blog, id=blog_id)
    blog.soft_delete()
    return 204, None


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


@router.get("/{blog_id}/comments/", response=list[ContentCommentOut])
def list_blog_comments(request, blog_id: int):
    """List approved comments for a blog."""
    get_object_or_404(Blog, id=blog_id)
    comments = get_comments(Blog, blog_id)
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


@router.post("/{blog_id}/comments/", response={201: ContentCommentOut})
def create_blog_comment(request, blog_id: int, payload: ContentCommentIn):
    """Create a comment on a blog."""
    get_object_or_404(Blog, id=blog_id)
    comment = create_comment(
        Blog,
        blog_id,
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


@router.post("/{blog_id}/emotions/", response=dict)
def toggle_blog_emotion(request, blog_id: int, payload: ContentEmotionIn):
    """Toggle an emotion on a blog."""
    get_object_or_404(Blog, id=blog_id)
    counts = toggle_emotion(Blog, blog_id, payload.emotion_type, request)
    return {"emotion_counts": counts}


# ---------------------------------------------------------------------------
# Image Upload
# ---------------------------------------------------------------------------


@router.post("/{blog_id}/image/", response=dict)
def upload_blog_image(request, blog_id: int):
    """Upload a title image for a blog."""
    blog = get_object_or_404(Blog, id=blog_id)
    can_edit = request.user.is_authenticated and (
        request.user.is_staff or blog.authors.filter(id=request.user.id).exists()
    )
    if not can_edit:
        raise HttpError(403, "Keine Berechtigung.")

    if "image" not in request.FILES:
        raise HttpError(400, "Kein Bild hochgeladen.")

    blog.image = request.FILES["image"]
    blog.save(update_fields=["image"])
    return {"image_url": blog.image.url if blog.image else None}
