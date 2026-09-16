"""AI-powered material suggestions for recipes (Gemini Flash).

Suggests consumable and helper materials (toothpicks, baking paper, twine, ...)
separate from ingredients and kitchen equipment, matches them against the
Material catalog and applies confirmed suggestions atomically.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.contrib.auth.models import AbstractBaseUser
from django.contrib.contenttypes.models import ContentType
from ninja.errors import HttpError
from pydantic import BaseModel, Field

from core.services.gemini import gemini_call
from core.services.prompt_context import build_prompt_context

if TYPE_CHECKING:
    from recipe.models import Recipe

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"
AI_TIMEOUT_SECONDS = 30


class AiMaterialSuggestionItem(BaseModel):
    """Single material suggestion from Gemini."""

    name: str = Field(description="Name des Materials auf Deutsch, z.B. 'Zahnstocher', 'Backpapier'")
    quantity: str = Field(default="", description="Mengenangabe, z.B. '30 Stück', '1 Rolle', 'nach Bedarf'")


class AiMaterialsOutput(BaseModel):
    """Gemini response: list of suggested materials."""

    items: list[AiMaterialSuggestionItem] = Field(
        default_factory=list, description="Liste der vorgeschlagenen Materialien"
    )


class MatchedMaterialResult:
    """Result of matching one AI suggestion against the Material catalog."""

    def __init__(
        self,
        material_id: int | None,
        suggested_name: str,
        quantity: str,
        matched_name: str | None,
        is_new: bool,
    ):
        self.material_id = material_id
        self.suggested_name = suggested_name
        self.quantity = quantity
        self.matched_name = matched_name
        self.is_new = is_new


class RecipeAiMaterialsService:
    """Service for AI-powered recipe material suggestions and atomic apply."""

    def get_full_suggestions(
        self, recipe: Recipe, user: AbstractBaseUser | None = None
    ) -> tuple[list[MatchedMaterialResult] | None, str | None]:
        """Suggest materials, match them against the DB and filter existing links.

        Returns (results, ai_interaction_id). Results are None when the AI
        returned no usable suggestions; nothing is persisted at this stage.
        """
        ai_output, interaction_id = self._suggest(recipe, user)
        if ai_output is None or not ai_output.items:
            return None, interaction_id

        from content.services.ai_supply_service import match_materials_to_database

        suggestions = [item.model_dump() for item in ai_output.items]
        matched = match_materials_to_database(suggestions)

        existing_material_ids = self._linked_material_ids(recipe)
        results = [
            MatchedMaterialResult(
                material_id=m.get("material_id"),
                suggested_name=m.get("name", ""),
                quantity=m.get("quantity", ""),
                matched_name=m.get("matched_name"),
                is_new=m.get("material_id") is None,
            )
            for m in matched
            if m.get("name") and m.get("material_id") not in existing_material_ids
        ]

        return results, interaction_id

    def apply_materials(self, recipe: Recipe, payload: list) -> list:
        """Create material links for confirmed suggestions.

        Only matched material ids are applied; unresolved names are never
        silently created. Links for materials already present in the recipe
        are skipped. The caller is responsible for running this atomically.
        """
        from supply.models import ContentMaterialItem, Material

        existing_material_ids = self._linked_material_ids(recipe)
        valid_material_ids = set(
            Material.objects.filter(
                id__in=[item.material_id for item in payload],
                deleted_at__isnull=True,
            ).values_list("id", flat=True)
        )

        ct = ContentType.objects.get_for_model(recipe, for_concrete_model=False)
        last_sort = (
            ContentMaterialItem.objects.filter(content_type=ct, object_id=recipe.pk)
            .order_by("-sort_order")
            .values_list("sort_order", flat=True)
            .first()
        ) or 0

        created = []
        seen: set[int] = set()
        for index, item_in in enumerate(payload):
            if item_in.material_id not in valid_material_ids:
                continue
            if item_in.material_id in existing_material_ids or item_in.material_id in seen:
                continue
            seen.add(item_in.material_id)
            item = ContentMaterialItem.objects.create(
                content_type=ct,
                object_id=recipe.pk,
                material_id=item_in.material_id,
                quantity=item_in.quantity,
                sort_order=last_sort + index + 1,
            )
            created.append(item)

        return (
            ContentMaterialItem.objects.select_related("material")
            .filter(id__in=[item.id for item in created])
            .order_by("sort_order")
        )

    def _linked_material_ids(self, recipe: Recipe) -> set[int]:
        from supply.models import ContentMaterialItem

        ct = ContentType.objects.get_for_model(recipe, for_concrete_model=False)
        return set(
            ContentMaterialItem.objects.filter(content_type=ct, object_id=recipe.pk).values_list(
                "material_id", flat=True
            )
        )

    def _suggest(
        self, recipe: Recipe, user: AbstractBaseUser | None = None
    ) -> tuple[AiMaterialsOutput | None, str | None]:
        """Call Gemini to suggest recipe materials."""
        prompt = self._build_prompt(recipe, user)

        try:
            from google.genai import types

            response, interaction_id = gemini_call(
                user=user,
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AiMaterialsOutput,
                    http_options=types.HttpOptions(timeout=AI_TIMEOUT_SECONDS * 1000),
                ),
                context="recipe_materials",
            )
            if response is None:
                return None, None
            result = AiMaterialsOutput.model_validate_json(response.text)
            return result, str(interaction_id) if interaction_id else None
        except HttpError:
            raise
        except Exception:
            logger.warning("AI recipe material suggestion failed", exc_info=True)
            return None, None

    def _build_prompt(self, recipe: Recipe, user: AbstractBaseUser | None = None) -> str:
        """Build the suggestion prompt restricted to consumable/helper materials."""
        parts = [
            "Du bist ein erfahrener Küchenhelfer für eine Pfadfinder-Gruppe. ",
            f'Für das Rezept "{recipe.title}"',
        ]
        if recipe.description:
            parts.append(f"\nBeschreibung: {recipe.description}")
        parts.append(
            "\n\nSchlage nur Verbrauchs- und Hilfsmaterialien vor, die beim Kochen dieses "
            "Rezepts benötigt werden, zum Beispiel Zahnstocher, Holzspieße, Backpapier, "
            "Alufolie, Küchengarn oder Einweghandschuhe.\n"
            "REGELN:\n"
            "- KEINE Zutaten oder Lebensmittel\n"
            "- KEINE wiederverwendbaren Küchengeräte wie Töpfe, Pfannen, Messer, "
            "Schneidebretter oder Schüsseln (das ist Equipment)\n"
            "- Mengen als Anzeigeangabe, z.B. '30 Stück', '1 Rolle', 'nach Bedarf'\n"
            "Gib nur Materialien zurück, die wirklich benötigt werden."
        )

        context_block = build_prompt_context(user)
        if context_block:
            parts.append(f"\n\n{context_block}")

        return "".join(parts)
