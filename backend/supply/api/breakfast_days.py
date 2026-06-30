"""Breakfast day management API.

CRUD for breakfast day Tags (content.Tag with group="breakfast_day").
"""

from django.shortcuts import get_object_or_404
from ninja import Router, Schema

from content.models import Tag
from recipe.models import Recipe

breakfast_days_router = Router(tags=["breakfast"])


class BreakfastDayNameIn(Schema):
    name: str


@breakfast_days_router.get("/breakfast-days/", response=list[dict])
def list_breakfast_days(request):
    """List all breakfast day tags."""
    tags = Tag.objects.filter(group="breakfast_day", is_approved=True).order_by("sort_order", "name")
    return [
        {
            "id": t.id,
            "name": t.name,
            "slug": t.slug,
            "sort_order": t.sort_order,
            "recipe_count": Recipe.objects.filter(tags=t).count(),
        }
        for t in tags
    ]


@breakfast_days_router.post("/breakfast-days/", response=dict)
def create_breakfast_day(request, payload: BreakfastDayNameIn):
    """Create a new breakfast day tag."""
    from django.utils.text import slugify

    base_slug = slugify(payload.name)
    slug = base_slug
    counter = 1
    while Tag.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    tag = Tag.objects.create(
        name=payload.name,
        slug=slug,
        group="breakfast_day",
        is_approved=True,
    )
    return {"id": tag.id, "name": tag.name, "slug": tag.slug, "sort_order": tag.sort_order}


@breakfast_days_router.put("/breakfast-days/{tag_id}/", response=dict)
def update_breakfast_day(request, tag_id: int, payload: BreakfastDayNameIn):
    """Rename a breakfast day tag."""
    tag = get_object_or_404(Tag, id=tag_id, group="breakfast_day")
    from django.utils.text import slugify

    tag.name = payload.name
    tag.slug = slugify(payload.name)
    tag.save()
    return {"id": tag.id, "name": tag.name, "slug": tag.slug, "sort_order": tag.sort_order}


@breakfast_days_router.delete("/breakfast-days/{tag_id}/", response=dict)
def delete_breakfast_day(request, tag_id: int, force: bool = False):
    """Delete a breakfast day tag. Checks if any recipes reference it.

    If force=true, removes the tag from all recipes before deleting.
    """
    tag = get_object_or_404(Tag, id=tag_id, group="breakfast_day")
    recipe_count = Recipe.objects.filter(tags=tag).count()
    if recipe_count > 0 and not force:
        return {
            "deleted": False,
            "recipe_count": recipe_count,
            "error": f"Tag wird von {recipe_count} Rezept(en) verwendet",
        }
    tag.delete()
    return {"deleted": True, "recipe_count": recipe_count}
