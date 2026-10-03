"""Buffet catalog grouped by role, optionally for one buffet template."""

from typing import Any, Literal

from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from content.models import Tag
from supply.choices import RecipeTypeChoices
from supply.schemas.buffet_catalog import BuffetCatalogOut, BuffetCatalogSearchItemOut
from supply.services.buffet_catalog import BUFFET_ROLE_SLUGS, items_for_role, search_buffet_items

buffet_catalog_router = Router(tags=["buffet"])


def _role_info(tag: Tag) -> dict[str, str]:
    return {"slug": tag.slug, "name": tag.name, "icon": tag.icon}


def _items_out(
    user: Any,
    role_slug: str,
    default_ids: set[tuple[Literal["ingredient", "recipe"], int]],
) -> list[dict[str, Any]]:
    return [
        {
            "kind": item.kind,
            "id": item.id,
            "name": item.name,
            "energy_kcal_per_100g": item.energy_kcal_per_100g,
            "price_per_kg": item.price_per_kg,
            "weight_per_serving_g": item.weight_per_serving_g,
            "is_favorite": item.is_favorite,
            "is_template_default": item.is_template_default,
            "default_selected": (item.kind, item.id) in default_ids,
        }
        for item in items_for_role(user, role_slug, default_ids=default_ids)
    ]


@buffet_catalog_router.get("/buffet-catalog/search/", response=list[BuffetCatalogSearchItemOut], auth=None)
def search_buffet_catalog(
    request: HttpRequest,
    role: str,
    meal_type: str,
    q: str = "",
    kind: Literal["all", "ingredient", "recipe"] = "all",
    recipe_type: str | None = None,
    include_non_standalone: bool = False,
    exclude_alcohol: bool = False,
    limit: int = 30,
) -> list[dict[str, Any]]:
    """Bounded typeahead search across items visible to the current user."""
    from planner.models import MealTypeChoices

    if role not in BUFFET_ROLE_SLUGS or not Tag.objects.filter(slug=role, group="buffet").exists():
        raise HttpError(422, "Unbekannte Buffet-Rolle.")
    if meal_type not in MealTypeChoices.values:
        raise HttpError(422, "Unbekannter Mahlzeitentyp.")
    if recipe_type is not None and recipe_type not in RecipeTypeChoices.values:
        raise HttpError(422, "Unbekannter Rezepttyp.")
    if kind == "ingredient" and recipe_type is not None:
        raise HttpError(422, "Ein Rezepttypfilter ist nur für Rezepte gültig.")

    results = search_buffet_items(
        request.user,
        query=q,
        role_slug=role,
        meal_type=meal_type,
        kind=kind,
        recipe_type=recipe_type,
        include_non_standalone=include_non_standalone,
        exclude_alcohol=exclude_alcohol,
        limit=limit,
    )
    return [
        {
            "kind": item.kind,
            "id": item.id,
            "name": item.name,
            "energy_kcal_per_100g": item.energy_kcal_per_100g,
            "price_per_kg": item.price_per_kg,
            "weight_per_serving_g": item.weight_per_serving_g,
            "recipe_type": item.recipe_type,
            "is_favorite": item.is_favorite,
            "role_slugs": list(item.role_slugs),
        }
        for item in results
    ]


@buffet_catalog_router.get("/buffet-catalog/", response=BuffetCatalogOut, auth=None)
def get_buffet_catalog(request: HttpRequest, template: str | None = None) -> dict[str, Any]:
    """Readable ingredients and recipes per buffet role (not paginated, not truncated)."""
    from planner.api.buffet import active_templates
    from planner.services.buffet_service import gram_unit, milliliter_unit

    user = request.user
    roles: list[dict] = []
    if template:
        buffet_template = get_object_or_404(active_templates(), slug=template)
        for template_role in buffet_template.roles.all():
            default_ids: set[tuple[Literal["ingredient", "recipe"], int]] = {
                ("ingredient", ingredient.id) for ingredient in template_role.default_ingredients.all()
            }
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
