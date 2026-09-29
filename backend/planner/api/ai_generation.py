"""API endpoint for AI-powered meal plan suggestions and apply."""

import logging

from django.shortcuts import get_object_or_404
from ninja import Router, Status

from core.permissions import require_login
from planner.api.meal_plan import _require_edit
from planner.models import MealPlan
from planner.schemas.ai_generation import AiApplyOut, AiSuggestIn, AiSuggestOut
from planner.services.meal_plan_ai_service import MealPlanAiService

logger = logging.getLogger(__name__)

ai_suggest_router = Router(tags=["AI Meal Plan Generation"])
ai_apply_router = Router(tags=["AI Meal Plan Generation"])

ai_service = MealPlanAiService()


@ai_suggest_router.post(
    "/ai/suggest/",
    response={200: AiSuggestOut},
    summary="Generate AI meal plan suggestions",
    description="Takes a free-text prompt and parameters, returns structured meal plan suggestions using existing recipes.",
)
def ai_suggest(request, payload: AiSuggestIn):
    require_login(request)
    user = request.user

    # Gemini errors are ApiErrors with stable codes; the global handler renders them.
    result = ai_service.generate_suggestions(
        prompt=payload.prompt,
        num_persons=payload.num_persons,
        num_days=payload.num_days,
        start_date=payload.start_date.isoformat(),
        nutritional_tag_ids=payload.nutritional_tag_ids,
        budget_per_person_per_day=payload.budget_per_person_per_day,
        user=user,
    )
    return Status(200, result)


@ai_apply_router.post(
    "/{meal_plan_id}/apply-ai/",
    response={200: AiApplyOut},
    summary="Apply AI suggestions to a meal plan",
    description="Takes AI-generated meal plan suggestions and creates MealItems for each suggested recipe.",
)
def ai_apply(request, meal_plan_id: int, payload: AiSuggestOut):
    require_login(request)
    user = request.user

    meal_plan = get_object_or_404(MealPlan, id=meal_plan_id)
    _require_edit(meal_plan, user)

    result = ai_service.apply_suggestions(meal_plan, payload.dict())
    return Status(200, result)
