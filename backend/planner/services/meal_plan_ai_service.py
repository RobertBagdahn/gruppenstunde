"""AI service for meal plan suggestion generation using Vertex AI Gemini."""

import logging

from django.contrib.auth.models import AbstractBaseUser
from google.genai import types as genai_types
from pydantic import BaseModel, Field, ValidationError

from core.services.gemini import GeminiInvalidResponseError, GeminiUnavailableError, gemini_call
from recipe.models import Recipe

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
AI_TIMEOUT_SECONDS = 60


class GeminiSuggestedMeal(BaseModel):
    meal_type: str = Field(description="One of: breakfast, lunch, dinner, snack")
    recipe_id: int = Field(description="ID of an existing recipe from the database")
    recipe_title: str = Field(description="Title of the recipe for display purposes")


class GeminiSuggestedDay(BaseModel):
    date: str = Field(description="Date in YYYY-MM-DD format")
    meals: list[GeminiSuggestedMeal] = Field(
        description="List of meals for this day (at least breakfast, lunch, dinner)"
    )


class GeminiMealPlanSuggestion(BaseModel):
    days: list[GeminiSuggestedDay]


class MealPlanAiService:
    def generate_suggestions(
        self,
        *,
        prompt: str,
        num_persons: int,
        num_days: int,
        start_date: str,
        nutritional_tag_ids: list[int] | None = None,
        budget_per_person_per_day: float | None = None,
        user: AbstractBaseUser | None = None,
    ) -> dict:
        """
        Generate meal plan suggestions via Gemini.

        Constructs a prompt with user parameters, calls Gemini, parses
        the structured JSON response, and validates that all suggested
        recipe_ids actually exist in the database.
        """
        from supply.models import NutritionalTag

        constraints_parts = []
        if nutritional_tag_ids:
            tags = NutritionalTag.objects.filter(id__in=nutritional_tag_ids)
            tag_names = [t.name_opposite or t.name for t in tags]
            if tag_names:
                constraints_parts.append(
                    f"Dietary restrictions: {', '.join(tag_names)}. "
                    "Only suggest recipes that comply with these restrictions."
                )
        if budget_per_person_per_day is not None:
            constraints_parts.append(
                f"Budget: maximum {budget_per_person_per_day:.2f} EUR per person per day. "
                "Prefer affordable, cost-effective recipes."
            )

        constraints_text = (
            "\n".join(constraints_parts) if constraints_parts else "No specific dietary or budget constraints."
        )

        system_prompt = (
            "You are a meal planning assistant for German Pfadfinder (scout) camps and events. "
            "Generate a meal plan suggestion in JSON format.\n\n"
            f"User description: {prompt}\n\n"
            f"Number of persons: {num_persons}\n"
            f"Number of days: {num_days}\n"
            f"Start date: {start_date}\n\n"
            f"{constraints_text}\n\n"
            "Rules:\n"
            "- Only suggest recipes that already exist in our database (use real recipe_ids).\n"
            "- Each day MUST have at least breakfast, lunch, and dinner. Snack is optional.\n"
            "- Vary the meals across days — don't repeat the same recipe too often.\n"
            "- Consider typical German/European camp food: hearty, simple, scalable.\n"
            "- Response must be valid JSON matching the schema exactly.\n"
            "- Use date format YYYY-MM-DD for each day starting from the given start_date.\n"
        )

        response, _interaction_id = gemini_call(
            user=user,
            model=GEMINI_MODEL,
            contents=system_prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiMealPlanSuggestion,
                http_options=genai_types.HttpOptions(timeout=AI_TIMEOUT_SECONDS * 1000),
            ),
            context="meal_plan_generation",
        )

        if response is None:
            raise GeminiUnavailableError("KI nicht erreichbar. Bitte versuche es später erneut.")

        try:
            result = GeminiMealPlanSuggestion.model_validate_json(response.text)
        except ValidationError as e:
            logger.error("AI meal plan response validation failed: %s", e)
            raise GeminiInvalidResponseError("KI-Antwort konnte nicht verarbeitet werden.")

        valid_recipe_ids = set(
            Recipe.objects.filter(id__in=[m.recipe_id for day in result.days for m in day.meals]).values_list(
                "id", flat=True
            )
        )

        validated_days = []
        for day in result.days:
            validated_meals = [
                {
                    "meal_type": m.meal_type,
                    "recipe_id": m.recipe_id,
                    "recipe_title": m.recipe_title,
                }
                for m in day.meals
                if m.recipe_id in valid_recipe_ids
            ]
            if validated_meals:
                validated_days.append(
                    {
                        "date": day.date,
                        "meals": validated_meals,
                    }
                )

        if not validated_days:
            raise GeminiInvalidResponseError(
                "KI hat keine gültigen Rezepte vorgeschlagen. Bitte versuche es mit einem anderen Prompt."
            )

        return {"days": validated_days}
