"""Recipe step API endpoints."""

import logging

from django.core.cache import cache
from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from ninja import Body, Router
from ninja.errors import HttpError

from recipe.models import Recipe, RecipeItem, RecipeStep, RecipeStepIngredient
from recipe.schemas import RecipeStepIn, RecipeStepOut, RecipeStepsBatchIn
from recipe.services.step_ai_service import AiStepService

logger = logging.getLogger(__name__)

router = Router()

# Minimum time (seconds) a single user must wait between calls to the same
# expensive AI endpoint. This is a safety net against buggy/looping clients
# (e.g. a frontend bug re-firing a mutation on every render) that would
# otherwise burn through the global Gemini quota in seconds.
AI_ENDPOINT_COOLDOWN_SECONDS = 3


def _require_auth(request):
    """Require authenticated user."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Authentifizierung erforderlich")


def _throttle_ai_endpoint(request, endpoint: str, *extra_key_parts: str) -> None:
    """Enforce a short per-user cooldown for an expensive AI endpoint.

    Raises HttpError(429) if the user calls the same endpoint (optionally
    scoped by extra key parts, e.g. step id) again before the cooldown
    elapses. Fails open if the cache backend is unavailable.
    """
    user_id = getattr(request.user, "id", None) or "anon"
    cache_key = "ai_throttle:" + ":".join([endpoint, str(user_id), *extra_key_parts])
    try:
        if not cache.add(cache_key, 1, timeout=AI_ENDPOINT_COOLDOWN_SECONDS):
            raise HttpError(429, "Bitte warte kurz, bevor du das erneut anfragst.")
    except HttpError:
        raise
    except Exception:
        logger.warning("AI throttle cache unavailable, proceeding without throttle")


def _can_edit_recipe(request, recipe: Recipe) -> bool:
    """Check if user can edit this recipe."""
    from content.services.food_access import can_edit

    return can_edit(recipe, request.user)


def _get_visible_recipe(request, slug: str, *, require_auth: bool = False) -> Recipe:
    if require_auth:
        _require_auth(request)
    from content.services.food_access import visible_recipe_queryset

    recipe = visible_recipe_queryset(request.user).filter(slug=slug).first()
    if recipe is None:
        raise HttpError(404, "Rezept nicht gefunden")
    return recipe


@router.get("/{slug}/steps/", response=list[RecipeStepOut])
def list_recipe_steps(request, slug: str):
    """Get all steps for a recipe."""
    recipe = _get_visible_recipe(request, slug)

    steps = (
        recipe.steps.all()
        .prefetch_related(
            "step_ingredients__recipe_item__portion__ingredient",
            "step_ingredients__recipe_item__portion__measuring_unit",
        )
        .order_by("sort_order")
    )

    return list(steps)


@router.put("/{slug}/steps/batch", response=list[RecipeStepOut])
def batch_update_recipe_steps(request, slug: str, payload: RecipeStepsBatchIn):
    """Batch update all steps for a recipe (replace all steps)."""
    _require_auth(request)

    recipe = _get_visible_recipe(request, slug, require_auth=True)

    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Berechtigung zum Bearbeiten dieses Rezepts erforderlich")

    if payload.recipe_slug != slug:
        raise HttpError(400, "recipe_slug in payload muss mit URL übereinstimmen")

    # Collect and validate all recipe_item IDs
    all_recipe_item_ids = set()
    for step_data in payload.steps:
        for ing_data in step_data.step_ingredients:
            all_recipe_item_ids.add(ing_data.recipe_item_id)

    existing_items = set(
        RecipeItem.objects.filter(recipe=recipe, id__in=all_recipe_item_ids).values_list("id", flat=True)
    )

    missing_items = all_recipe_item_ids - existing_items
    if missing_items:
        raise HttpError(400, f"RecipeItems nicht gefunden: {missing_items}")

    try:
        with transaction.atomic():
            recipe = Recipe.objects.select_for_update().get(pk=recipe.pk)
            recipe.steps.all().delete()

            for step_data in payload.steps:
                step = RecipeStep.objects.create(
                    recipe=recipe,
                    sort_order=step_data.sort_order,
                    instruction=step_data.instruction,
                    duration_minutes=step_data.duration_minutes,
                    section=step_data.section,
                )

                for ing_data in step_data.step_ingredients:
                    recipe_item = RecipeItem.objects.get(id=ing_data.recipe_item_id)
                    RecipeStepIngredient.objects.create(
                        step=step,
                        recipe_item=recipe_item,
                        quantity_modifier=ing_data.quantity_modifier,
                        preparation=ing_data.preparation,
                        sort_order=ing_data.sort_order,
                    )

    except IntegrityError:
        raise HttpError(409, "Die Schritte konnten wegen einer konkurrierenden Änderung nicht gespeichert werden.")
    except Exception:
        logger.exception("Error in batch_update_recipe_steps for recipe %s", slug)
        raise HttpError(500, "Fehler beim Aktualisieren der Schritte")

    steps = (
        recipe.steps.all()
        .prefetch_related(
            "step_ingredients__recipe_item__portion__ingredient",
            "step_ingredients__recipe_item__portion__measuring_unit",
        )
        .order_by("sort_order")
    )

    return list(steps)


@router.post("/{slug}/steps/generate-from-items/", response=list[RecipeStepOut])
def generate_steps_from_items(request, slug: str):
    """Generate steps from recipe items using AI."""
    _require_auth(request)

    recipe = _get_visible_recipe(request, slug, require_auth=True)

    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Berechtigung erforderlich")

    _throttle_ai_endpoint(request, "generate-from-items", slug)

    try:
        steps_data = AiStepService.generate_steps_from_items(
            recipe=recipe,
            user=request.user,
            bypass_limits=False,
        )

        if not steps_data:
            raise HttpError(400, "Keine Schritte generiert")

        batch_input = RecipeStepsBatchIn(
            recipe_slug=slug,
            steps=[RecipeStepIn(**step_data) for step_data in steps_data],
        )

        result = batch_update_recipe_steps(request, slug, batch_input)
        return result

    except HttpError:
        raise
    except Exception:
        logger.exception("Error generating steps for recipe %s", slug)
        raise HttpError(500, "Step generation failed")


@router.post("/{slug}/steps/suggest-ingredients/")
def suggest_ingredient_assignment(request, slug: str, payload: dict = Body(...)):
    """Suggest ingredient assignments for a step using AI."""
    _require_auth(request)

    recipe = _get_visible_recipe(request, slug, require_auth=True)
    step_instruction = payload.get("step_instruction", "").strip()

    if not step_instruction:
        raise HttpError(400, "step_instruction darf nicht leer sein")

    _throttle_ai_endpoint(request, "suggest-ingredients", slug, step_instruction[:100])

    try:
        suggestions = AiStepService.suggest_ingredient_assignment(
            step_instruction=step_instruction,
            recipe=recipe,
            user=request.user,
            bypass_limits=False,
        )

        return {
            "suggestions": suggestions,
            "recipe_slug": slug,
        }

    except Exception:
        logger.exception("Error suggesting ingredients for recipe %s", slug)
        raise HttpError(500, "Ingredient suggestion failed")


@router.post("/{slug}/steps/{step_id}/improve/")
def improve_step_instruction(request, slug: str, step_id: int, payload: dict = Body(...)):
    """Improve/rewrite a step instruction with a specific tone using AI."""
    _require_auth(request)

    recipe = _get_visible_recipe(request, slug, require_auth=True)
    step = get_object_or_404(RecipeStep, id=step_id, recipe=recipe)

    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Berechtigung erforderlich")

    instruction = step.instruction
    tone = payload.get("tone", "normal").strip().lower()

    if not instruction or not instruction.strip():
        raise HttpError(400, "Schritt hat keine Anweisung")

    _throttle_ai_endpoint(request, "improve-step", slug, str(step_id), tone)

    try:
        improved_instruction = AiStepService.improve_step_instruction(
            instruction=instruction,
            tone=tone,
            user=request.user,
            bypass_limits=False,
        )

        return {
            "improved_instruction": improved_instruction,
            "step_id": step_id,
        }

    except Exception:
        logger.exception("Error improving step %s for recipe %s", step_id, slug)
        raise HttpError(500, "Step improvement failed")
