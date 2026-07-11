"""Recipe step AI service for KI-powered step generation and ingredient assignment."""

import json
import logging
from typing import Optional

from django.contrib.auth.models import AbstractBaseUser

from core.services.gemini import gemini_call, GeminiUnavailableError
from recipe.models import RecipeItem, Recipe

logger = logging.getLogger(__name__)

# Gemini model to use for recipe steps
GEMINI_MODEL = "gemini-3.1-flash-lite"
MAX_TOKENS = 2000


class AiStepService:
    """Service for AI-powered recipe step generation and ingredient assignment."""

    @staticmethod
    def generate_steps_from_items(
        recipe: Recipe,
        user: Optional[AbstractBaseUser] = None,
        bypass_limits: bool = False,
    ) -> list[dict]:
        """Generate structured steps from a recipe's ingredients using Gemini.

        Args:
            recipe: The Recipe object with populated recipe_items
            user: The requesting user (for rate limiting)
            bypass_limits: Skip auth and rate limit checks

        Returns:
            List of step dictionaries with structure:
            {
                "sort_order": int,
                "instruction": str,
                "duration_minutes": int or None,
                "section": str,
                "step_ingredients": [
                    {
                        "recipe_item_id": int,
                        "quantity_modifier": float,
                        "preparation": str,
                        "sort_order": int,
                    }
                ]
            }

        Raises:
            GeminiUnavailableError: If Gemini API fails
            ValueError: If response is invalid
        """
        if not recipe.recipe_items.exists():
            logger.warning(f"Recipe {recipe.slug} has no ingredients, cannot generate steps")
            return []

        # Build ingredient list for prompt
        ingredients = []
        item_id_map = {}  # Map ingredient name to recipe_item_id
        
        for recipe_item in recipe.recipe_items.select_related("portion__ingredient", "portion__measuring_unit").all():
            ingredient = recipe_item.portion.ingredient
            unit = recipe_item.portion.measuring_unit
            
            ingredient_name = ingredient.name
            unit_short = unit.unit if unit else ""
            quantity = recipe_item.quantity
            note = recipe_item.note or ""
            
            ingredients.append({
                "id": recipe_item.id,
                "name": ingredient_name,
                "quantity": quantity,
                "unit": unit_short,
                "note": note,
            })
            
            item_id_map[ingredient_name.lower()] = recipe_item.id

        # Build prompt for Gemini
        prompt = _build_step_generation_prompt(recipe, ingredients)

        # Call Gemini
        try:
            response, _ = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                bypass_limits=bypass_limits,
                context="recipe_step_generation",
            )
        except Exception as exc:
            logger.error(f"Gemini call failed for recipe {recipe.slug}: {exc}")
            raise GeminiUnavailableError(f"Step generation failed: {str(exc)}") from exc

        if not response or not response.text:
            raise GeminiUnavailableError("Empty response from step generation")

        # Parse response
        try:
            steps = _parse_step_generation_response(response.text, item_id_map)
            logger.info(f"Generated {len(steps)} steps for recipe {recipe.slug}")
            return steps
        except Exception as exc:
            logger.error(f"Failed to parse Gemini response for recipe {recipe.slug}: {exc}")
            raise ValueError(f"Invalid step generation response: {str(exc)}") from exc

    @staticmethod
    def suggest_ingredient_assignment(
        step_instruction: str,
        recipe: Recipe,
        user: Optional[AbstractBaseUser] = None,
        bypass_limits: bool = False,
    ) -> list[dict]:
        """Suggest which ingredients belong to a given step using Gemini.

        Args:
            step_instruction: The text instruction for the step
            recipe: The Recipe object with ingredients
            user: The requesting user (for rate limiting)
            bypass_limits: Skip auth and rate limit checks

        Returns:
            List of suggestion dictionaries with structure:
            {
                "recipe_item_id": int,
                "ingredient_name": str,
                "preparation": str,
                "confidence": float (0.0-1.0),
            }

        Raises:
            GeminiUnavailableError: If Gemini API fails
            ValueError: If response is invalid
        """
        if not recipe.recipe_items.exists():
            return []

        # Build ingredient list for context
        ingredients = []
        for recipe_item in recipe.recipe_items.select_related("portion__ingredient").all():
            ingredient = recipe_item.portion.ingredient
            ingredients.append({
                "id": recipe_item.id,
                "name": ingredient.name,
            })

        # Build prompt
        prompt = _build_ingredient_suggestion_prompt(step_instruction, ingredients)

        # Call Gemini
        try:
            response, _ = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                bypass_limits=bypass_limits,
                context="ingredient_assignment_suggestion",
            )
        except Exception as exc:
            logger.error(f"Gemini call failed for ingredient suggestion: {exc}")
            raise GeminiUnavailableError(f"Ingredient suggestion failed: {str(exc)}") from exc

        if not response or not response.text:
            return []

        # Parse response
        try:
            suggestions = _parse_ingredient_suggestion_response(response.text)
            logger.info(f"Generated {len(suggestions)} ingredient suggestions")
            return suggestions
        except Exception as exc:
            logger.error(f"Failed to parse ingredient suggestion response: {exc}")
            return []  # Return empty list if parsing fails (non-critical)

    @staticmethod
    def convert_markdown_to_steps(
        recipe: Recipe,
        description: str,
        user: Optional[AbstractBaseUser] = None,
        bypass_limits: bool = False,
    ) -> list[dict]:
        """Convert a recipe's markdown description to structured steps (one-time migration).

        Args:
            recipe: The Recipe object
            description: The markdown description field
            user: The requesting user (for rate limiting)
            bypass_limits: Skip auth and rate limit checks

        Returns:
            List of step dictionaries (same format as generate_steps_from_items)

        Raises:
            GeminiUnavailableError: If Gemini API fails
        """
        if not recipe.recipe_items.exists():
            logger.warning(f"Recipe {recipe.slug} has no ingredients")
            return []

        # Build ingredient list
        ingredients = []
        item_id_map = {}
        
        for recipe_item in recipe.recipe_items.select_related("portion__ingredient").all():
            ingredient = recipe_item.portion.ingredient
            ingredients.append({
                "id": recipe_item.id,
                "name": ingredient.name,
            })
            item_id_map[ingredient.name.lower()] = recipe_item.id

        # Build prompt
        prompt = _build_markdown_conversion_prompt(recipe.title, description, ingredients)

        # Call Gemini
        try:
            response, _ = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                bypass_limits=bypass_limits,
                context="recipe_markdown_conversion",
            )
        except Exception as exc:
            logger.error(f"Gemini call failed for markdown conversion: {exc}")
            raise GeminiUnavailableError(f"Markdown conversion failed: {str(exc)}") from exc

        if not response or not response.text:
            raise GeminiUnavailableError("Empty response from markdown conversion")

        # Parse response
        try:
            steps = _parse_step_generation_response(response.text, item_id_map)
            logger.info(f"Converted {len(steps)} steps from markdown for recipe {recipe.slug}")
            return steps
        except Exception as exc:
            logger.error(f"Failed to parse markdown conversion response: {exc}")
            raise ValueError(f"Invalid conversion response: {str(exc)}") from exc

    @staticmethod
    def improve_step_instruction(
        instruction: str,
        tone: str = "normal",
        user: Optional[AbstractBaseUser] = None,
        bypass_limits: bool = False,
    ) -> str:
        """Rewrite a step instruction with a specific tone using Gemini.

        Args:
            instruction: The current step instruction text
            tone: Tone option (präzise, ausführlich, kurz, lustig, wissenschaftlich, etc.)
            user: The requesting user (for rate limiting)
            bypass_limits: Skip auth and rate limit checks

        Returns:
            Improved instruction text

        Raises:
            GeminiUnavailableError: If Gemini API fails
        """
        if not instruction or not instruction.strip():
            return instruction

        tone_descriptions = {
            "präzise": "Präzise, sachlich und kurz. Verwende Fachbegriffe.",
            "ausführlich": "Ausführlich und detailliert. Erkläre jeden Schritt genau.",
            "kurz": "Kurz und kompakt. Nur die notwendigsten Informationen.",
            "lustig": "Humorvoll und unterhaltsam, aber noch informativ.",
            "wissenschaftlich": "Wissenschaftlich korrekt mit Begründungen.",
            "anfänger": "Einfach und anfängerfreundlich, mit vielen Erklärungen.",
        }

        tone_desc = tone_descriptions.get(tone, "Normal und verständlich")

        prompt = (
            f"Schreibe die folgende Kochanweisung um im Ton: {tone_desc}\n\n"
            f"Anweisung:\n{instruction}\n\n"
            f"Wichtig: Gib NUR die umgeschriebene Anweisung zurück, keine Erklärung oder Markdown-Formatierung."
        )

        try:
            response, _ = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                bypass_limits=bypass_limits,
                context="recipe_step_improve",
            )
        except Exception as exc:
            logger.error(f"Gemini call failed for step improvement: {exc}")
            raise GeminiUnavailableError(f"Step improvement failed: {str(exc)}") from exc

        if not response or not response.text:
            return instruction

        improved = response.text.strip()
        logger.info(f"Improved step instruction with tone '{tone}'")
        return improved


# --- Prompt Builders ---


def _build_step_generation_prompt(recipe: Recipe, ingredients: list[dict]) -> str:
    """Build the prompt for step generation from ingredients."""
    ingredients_str = "\n".join(
        f"- {ing['name']}: {ing['quantity']} {ing['unit']}" + 
        (f" ({ing['note']})" if ing['note'] else "")
        for ing in ingredients
    )

    return f"""Du bist ein Kochexperte. Generiere eine strukturierte Schritt-für-Schritt-Anleitung für dieses Rezept.

Rezepttitel: {recipe.title}
Portionen: {recipe.portions or 1}

Zutaten:
{ingredients_str}

Bitte generiere 5-10 klare, prägnante Schritte. Jeder Schritt sollte:
1. Eine klare Anweisung sein (Imperative)
2. Optional: Geschätzte Dauer in Minuten (z.B. "5 Minuten") am Ende in Klammern
3. Referenzen zu Zutaten enthalten (Zutatennamen verwenden)

Antworte im folgenden JSON-Format (valid JSON):
{{
  "steps": [
    {{
      "sort_order": 0,
      "instruction": "Schritt-Text mit Zutaten",
      "duration_minutes": 5,
      "section": "Vorbereitung",
      "referenced_ingredient_names": ["Zutat 1", "Zutat 2"]
    }}
  ]
}}

Wichtig:
- Nur gültige JSON-Struktur
- Achte auf deutsche Großschreibung
- Nutze natürliche Zutatennamen aus der Liste"""


def _build_ingredient_suggestion_prompt(step_instruction: str, ingredients: list[dict]) -> str:
    """Build the prompt for ingredient assignment suggestions."""
    ingredients_str = ", ".join(ing["name"] for ing in ingredients)

    return f"""Du bist ein Kochexperte. Analysiere diesen Schritt und schlage vor, welche Zutaten darin verwendet werden.

Schritt-Anweisung:
"{step_instruction}"

Verfügbare Zutaten:
{ingredients_str}

Antworte im folgenden JSON-Format (valid JSON):
{{
  "suggestions": [
    {{
      "ingredient_name": "Zutatname",
      "preparation": "z.B. gewürfelt, geraspelt",
      "confidence": 0.95
    }}
  ]
}}

Wichtig:
- Nur Zutaten vorschlagen, die in der Liste vorhanden sind
- Confidence 0.0-1.0 angeben
- Nur gültige JSON"""


def _build_markdown_conversion_prompt(title: str, description: str, ingredients: list[dict]) -> str:
    """Build the prompt for markdown conversion."""
    ingredients_str = ", ".join(ing["name"] for ing in ingredients)

    return f"""Du bist ein Kochexperte. Konvertiere diese Rezeptbeschreibung in strukturierte Schritte.

Rezepttitel: {title}

Beschreibung:
{description}

Verfügbare Zutaten:
{ingredients_str}

Generiere strukturierte Schritte wie im folgenden JSON-Format:
{{
  "steps": [
    {{
      "sort_order": 0,
      "instruction": "Klare Schritt-Anweisung",
      "duration_minutes": null,
      "section": "",
      "referenced_ingredient_names": ["Zutat1", "Zutat2"]
    }}
  ]
}}

Wichtig:
- Extrahiere logische Schritte aus dem Text
- Verwende nur Zutatennamen aus der Liste
- Gültige JSON"""


# --- Response Parsers ---


def _parse_step_generation_response(response_text: str, item_id_map: dict) -> list[dict]:
    """Parse the Gemini response from step generation.

    Args:
        response_text: The raw response text from Gemini
        item_id_map: Map of ingredient name (lowercase) to recipe_item_id

    Returns:
        List of step dictionaries
    """
    # Try to extract JSON from response
    try:
        # Try to find JSON block in response
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        if start == -1 or end == 0:
            raise ValueError("No JSON found in response")
        
        json_str = response_text[start:end]
        data = json.loads(json_str)
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in response: {exc}") from exc

    steps_data = data.get("steps", [])
    if not steps_data:
        raise ValueError("No steps found in response")

    # Convert to step format
    steps = []
    for idx, step_data in enumerate(steps_data):
        # Extract ingredient IDs from referenced names
        ingredient_ids = []
        referenced_names = step_data.get("referenced_ingredient_names", [])
        for name in referenced_names:
            item_id = item_id_map.get(name.lower())
            if item_id:
                ingredient_ids.append(item_id)

        step = {
            "sort_order": idx,
            "instruction": step_data.get("instruction", "").strip(),
            "duration_minutes": step_data.get("duration_minutes"),
            "section": step_data.get("section", "").strip(),
            "step_ingredients": [
                {
                    "recipe_item_id": ing_id,
                    "quantity_modifier": 1.0,
                    "preparation": "",
                    "sort_order": 0,
                }
                for ing_id in ingredient_ids
            ],
        }
        steps.append(step)

    return steps


def _parse_ingredient_suggestion_response(response_text: str) -> list[dict]:
    """Parse the Gemini response from ingredient suggestion.

    Returns a list of suggestion dictionaries (or empty list on error).
    """
    try:
        # Try to extract JSON
        start = response_text.find("{")
        end = response_text.rfind("}") + 1
        if start == -1 or end == 0:
            return []
        
        json_str = response_text[start:end]
        data = json.loads(json_str)
    except (json.JSONDecodeError, ValueError):
        return []

    suggestions = data.get("suggestions", [])
    
    # Filter and return
    return [
        {
            "ingredient_name": s.get("ingredient_name", ""),
            "preparation": s.get("preparation", ""),
            "confidence": float(s.get("confidence", 0.5)),
        }
        for s in suggestions
        if s.get("ingredient_name")
    ]
