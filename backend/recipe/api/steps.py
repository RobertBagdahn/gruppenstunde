"""Recipe step API endpoints."""

import logging
from typing import Optional

from django.db import transaction
from django.shortcuts import get_object_or_404
from ninja import Router, Query
from ninja.errors import HttpError

from recipe.models import Recipe, RecipeStep, RecipeStepIngredient, RecipeItem
from recipe.schemas import RecipeStepIn, RecipeStepOut, RecipeStepsBatchIn, RecipeStepsListOut
from recipe.services.step_ai_service import AiStepService

logger = logging.getLogger(__name__)

router = Router()


def _require_auth(request):
    """Require authenticated user."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Authentifizierung erforderlich")


def _can_edit_recipe(request, recipe: Recipe) -> bool:
    """Check if user can edit this recipe."""
    if not request.user.is_authenticated:
        return False
    if request.user.is_staff:
        return True
    if recipe.created_by_id == request.user.id:
        return True
    if recipe.owner_id and recipe.owner_id == request.user.id:
        return True
    if recipe.authors.filter(id=request.user.id).exists():
        return True
    return False


@router.get("/{slug}/steps/", response=list[RecipeStepOut])
def list_recipe_steps(request, slug: str):
    """Get all steps for a recipe."""
    recipe = get_object_or_404(Recipe, slug=slug)
    
    steps = recipe.steps.all().prefetch_related(
        'step_ingredients__recipe_item__portion__ingredient',
        'step_ingredients__recipe_item__portion__measuring_unit'
    ).order_by('sort_order')
    
    return list(steps)


@router.put("/{slug}/steps/batch", response=list[RecipeStepOut])
def batch_update_recipe_steps(request, slug: str, payload: RecipeStepsBatchIn):
    """Batch update all steps for a recipe (replace all steps)."""
    _require_auth(request)
    
    recipe = get_object_or_404(Recipe, slug=slug)
    
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
        RecipeItem.objects.filter(
            recipe=recipe, 
            id__in=all_recipe_item_ids
        ).values_list('id', flat=True)
    )
    
    missing_items = all_recipe_item_ids - existing_items
    if missing_items:
        raise HttpError(
            400, 
            f"RecipeItems nicht gefunden: {missing_items}"
        )
    
    try:
        with transaction.atomic():
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
    
    except Exception as e:
        logger.error(f"Error in batch_update_recipe_steps: {e}")
        raise HttpError(500, f"Fehler beim Aktualisieren der Schritte: {str(e)}")
    
    steps = recipe.steps.all().prefetch_related(
        'step_ingredients__recipe_item__portion__ingredient',
        'step_ingredients__recipe_item__portion__measuring_unit'
    ).order_by('sort_order')
    
    return list(steps)


@router.post("/{slug}/steps/generate-from-items/", response=list[RecipeStepOut])
def generate_steps_from_items(request, slug: str):
    """Generate steps from recipe items using AI."""
    _require_auth(request)
    
    recipe = get_object_or_404(Recipe, slug=slug)
    
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Berechtigung erforderlich")
    
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
    except Exception as e:
        logger.exception(f"Error generating steps for recipe {slug}")
        raise HttpError(500, f"Step generation failed: {str(e)}")


@router.post("/{slug}/steps/suggest-ingredients/")
def suggest_ingredient_assignment(request, slug: str, payload: dict):
    """Suggest ingredient assignments for a step using AI."""
    _require_auth(request)
    
    recipe = get_object_or_404(Recipe, slug=slug)
    step_instruction = payload.get("step_instruction", "").strip()
    
    if not step_instruction:
        raise HttpError(400, "step_instruction darf nicht leer sein")
    
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
    
    except Exception as e:
        logger.exception(f"Error suggesting ingredients for recipe {slug}")
        raise HttpError(500, f"Ingredient suggestion failed: {str(e)}")


@router.post("/{slug}/steps/{step_id}/improve/")
def improve_step_instruction(request, slug: str, step_id: int, payload: dict):
    """Improve/rewrite a step instruction with a specific tone using AI."""
    _require_auth(request)
    
    recipe = get_object_or_404(Recipe, slug=slug)
    step = get_object_or_404(RecipeStep, id=step_id, recipe=recipe)
    
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Berechtigung erforderlich")
    
    instruction = step.instruction
    tone = payload.get("tone", "normal").strip().lower()
    
    if not instruction or not instruction.strip():
        raise HttpError(400, "Schritt hat keine Anweisung")
    
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
    
    except Exception as e:
        logger.exception(f"Error improving step {step_id} for recipe {slug}")
        raise HttpError(500, f"Step improvement failed: {str(e)}")

