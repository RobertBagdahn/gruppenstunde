"""Admin Tag CRUD endpoints (staff-only)."""

from django.utils.text import slugify
from ninja import Router
from ninja.errors import HttpError

from content.models import Tag
from content.schemas.base import TagAdminIn, TagAdminOut, TagDetailOut

admin_tags_router = Router(tags=["admin-tags"])


def _require_staff(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Nur Admins")
    if request.user.is_staff:
        return
    try:
        if request.user.profile.role in ("staff", "admin"):
            return
    except AttributeError:
        pass
    raise HttpError(403, "Nur Admins")


def _tag_to_dict(t: Tag) -> dict:
    return {
        "id": str(t.id),
        "name": t.name,
        "slug": t.slug,
        "description": t.description,
        "parent_id": str(t.parent_id) if t.parent_id else None,
        "parent_name": t.parent.name if t.parent else None,
        "icon": t.icon,
        "group": t.group,
        "sort_order": t.sort_order,
        "is_approved": t.is_approved,
    }


# === List ===


@admin_tags_router.get("/", response=dict)
def list_admin_tags(request, page: int = 1, page_size: int = 20):
    """List all tags (paginated, staff-only)."""
    _require_staff(request)
    qs = Tag.objects.all().select_related("parent").order_by("sort_order", "name")
    total = qs.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    items = qs[offset : offset + page_size]
    return {
        "items": [_tag_to_dict(t) for t in items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# === Detail ===


@admin_tags_router.get("/{tag_id}/detail/", response=TagDetailOut)
def tag_detail(request, tag_id: str):
    """Get tag detail with linked recipes and ingredients (staff-only)."""
    _require_staff(request)
    try:
        tag = Tag.objects.get(id=tag_id)
    except Tag.DoesNotExist:
        raise HttpError(404, "Tag nicht gefunden")

    recipes = list(
        tag.recipe_set.all().values("id", "title", "slug")[:100]
    )
    ingredients = list(
        tag.ingredients.all().values("id", "name", "slug")[:100]
    )

    return TagDetailOut(
        tag=_tag_to_dict(tag),
        recipes=[{"id": r["id"], "title": r["title"], "slug": r["slug"]} for r in recipes],
        ingredients=[{"id": i["id"], "name": i["name"], "slug": i["slug"]} for i in ingredients],
    )


# === Create ===


@admin_tags_router.post("/", response={201: dict})
def create_admin_tag(request, payload: TagAdminIn):
    """Create a new tag (staff-only). Slug is auto-generated from name."""
    _require_staff(request)
    slug = slugify(payload.name)
    tag = Tag.objects.create(
        name=payload.name,
        slug=slug,
        description=payload.description,
        parent_id=payload.parent_id,
        icon=payload.icon,
        group=payload.group,
        sort_order=payload.sort_order,
    )
    return 201, _tag_to_dict(tag)


# === Update ===


@admin_tags_router.patch("/{tag_id}/", response=dict)
def update_admin_tag(request, tag_id: str, payload: TagAdminIn):
    """Update a tag (staff-only)."""
    _require_staff(request)
    try:
        tag = Tag.objects.get(id=tag_id)
    except Tag.DoesNotExist:
        raise HttpError(404, "Tag nicht gefunden")

    data = payload.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(tag, field, value)
    tag.save()
    return _tag_to_dict(tag)


# === Delete ===


@admin_tags_router.delete("/{tag_id}/", response={204: None})
def delete_admin_tag(request, tag_id: str):
    """Delete a tag (staff-only). Cascade removes all M2M links."""
    _require_staff(request)
    try:
        tag = Tag.objects.get(id=tag_id)
    except Tag.DoesNotExist:
        raise HttpError(404, "Tag nicht gefunden")
    tag.delete()
    return 204, None
