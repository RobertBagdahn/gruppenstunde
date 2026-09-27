"""Buffet catalog grouped by role, optionally for one buffet template."""

from django.shortcuts import get_object_or_404
from ninja import Router

from content.models import Tag
from supply.schemas.buffet_catalog import BuffetCatalogOut
from supply.services.buffet_catalog import BUFFET_ROLE_SLUGS, items_for_role

buffet_catalog_router = Router(tags=["buffet"])


def _role_info(tag: Tag) -> dict:
    return {"slug": tag.slug, "name": tag.name, "icon": tag.icon}


def _items_out(user, role_slug: str, default_ids: set[tuple[str, int]]) -> list[dict]:
    # Defaults the user cannot see drop out automatically: only visible items are listed.
    return [
        {
            "kind": item.kind,
            "id": item.id,
            "name": item.name,
            "energy_kcal_per_100g": item.energy_kcal_per_100g,
            "price_per_kg": item.price_per_kg,
            "weight_per_serving_g": item.weight_per_serving_g,
            "default_selected": (item.kind, item.id) in default_ids,
        }
        for item in items_for_role(user, role_slug)
    ]


@buffet_catalog_router.get("/buffet-catalog/", response=BuffetCatalogOut, auth=None)
def get_buffet_catalog(request, template: str | None = None):
    """Readable ingredients and recipes per buffet role (not paginated, not truncated)."""
    from planner.api.buffet import active_templates
    from planner.services.buffet_service import gram_unit, milliliter_unit

    user = request.user
    roles: list[dict] = []
    if template:
        buffet_template = get_object_or_404(active_templates(), slug=template)
        for template_role in buffet_template.roles.all():
            default_ids = {("ingredient", ingredient.id) for ingredient in template_role.default_ingredients.all()}
            default_ids |= {("recipe", recipe.id) for recipe in template_role.default_recipes.all()}
            roles.append(
                {
                    "role": _role_info(template_role.role),
                    "amount_per_person": template_role.amount_per_person,
                    "unit": template_role.unit,
                    "enabled_by_default": template_role.enabled_by_default,
                    "items": _items_out(user, template_role.role.slug, default_ids),
                }
            )
    else:
        tags = {tag.slug: tag for tag in Tag.objects.filter(slug__in=BUFFET_ROLE_SLUGS)}
        for slug in BUFFET_ROLE_SLUGS:
            if slug in tags:
                roles.append({"role": _role_info(tags[slug]), "items": _items_out(user, slug, set())})

    grams, milliliters = gram_unit(), milliliter_unit()
    return {
        "template_slug": template,
        "roles": roles,
        "gram_unit_id": grams.id if grams else None,
        "ml_unit_id": milliliters.id if milliliters else None,
    }
