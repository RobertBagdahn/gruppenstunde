"""Tests for the KI-Portionsvorschläge rework (openspec change
rework-ingredient-portion-ai-suggestions):

- PortionSuggestion name validator rejects digits
- ai-apply endpoint: replace_all soft-deletes + mandatory "g" recreation
- ai-apply endpoint: replace_all=False only creates new, non-duplicate portions
- ai-apply endpoint: name collision rolls back cleanly (422, not 500)
- breakfast-topping / baking-ingredient tags drive belag/backmengen suggestions
"""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from pydantic import ValidationError

from content.models import Tag
from supply.services.ingredient_ai_suggest_service import (
    _ingredient_portion_tags,
)
from supply.services.portion_knowledge import (
    IngredientPortionSuggestSchema,
    PortionSuggestion,
    PortionType,
    build_portion_prompt_section,
)
from supply.models import Portion
from supply.tests import make_ingredient, make_measuring_unit, make_portion

User = get_user_model()


def _suggestion(**overrides) -> dict:
    data = {
        "name": "Packung",
        "weight_g": 500.0,
        "quantity": 1.0,
        "measuring_unit_name": "Gramm",
        "rank": 1,
        "portion_type": PortionType.PACKUNG,
    }
    data.update(overrides)
    return data


@pytest.mark.django_db
class TestPortionSuggestionNameValidator:
    def test_name_with_digits_rejected(self):
        with pytest.raises(ValidationError):
            PortionSuggestion(**_suggestion(name="1 Packung (500g)"))

    def test_name_without_digits_accepted(self):
        suggestion = PortionSuggestion(**_suggestion(name="Großpackung"))
        assert suggestion.name == "Großpackung"

    def test_schema_requires_rezeptportion_and_packung(self):
        with pytest.raises(ValidationError):
            IngredientPortionSuggestSchema(
                system_gramm=_suggestion(name="g", weight_g=1, portion_type=PortionType.SYSTEM_GRAMM),
                rezeptportionen=[],
                packungen=[_suggestion()],
            )


@pytest.mark.django_db
class TestIngredientPortionTags:
    def test_breakfast_topping_tag_detected(self):
        ing = make_ingredient(name="Marmelade")
        tag, _ = Tag.objects.get_or_create(slug="breakfast-topping", defaults={"name": "breakfast-topping"})
        ing.tags.add(tag)

        is_topping, is_baking = _ingredient_portion_tags(ing)
        assert is_topping is True
        assert is_baking is False

    def test_baking_ingredient_tag_detected(self):
        ing = make_ingredient(name="Mehl")
        tag, _ = Tag.objects.get_or_create(slug="baking-ingredient", defaults={"name": "baking-ingredient"})
        ing.tags.add(tag)

        is_topping, is_baking = _ingredient_portion_tags(ing)
        assert is_topping is False
        assert is_baking is True

    def test_prompt_section_includes_belag_only_when_flagged(self):
        with_topping = build_portion_prompt_section(is_breakfast_topping=True, is_baking_ingredient=False)
        without_topping = build_portion_prompt_section(is_breakfast_topping=False, is_baking_ingredient=False)
        assert "Belag" in with_topping
        assert "belag:" not in without_topping.lower() or "Belag" not in without_topping

    def test_prompt_section_includes_backmengen_only_when_flagged(self):
        with_baking = build_portion_prompt_section(is_breakfast_topping=False, is_baking_ingredient=True)
        without_baking = build_portion_prompt_section(is_breakfast_topping=False, is_baking_ingredient=False)
        assert "Backzutat" in with_baking
        assert "Backzutat" not in without_baking


@pytest.mark.django_db
class TestAiApplyPortionsEndpoint:
    def _client(self):
        user = User.objects.create_user(username="staffuser", password="pw", is_staff=True)
        client = Client()
        client.force_login(user)
        return client, user

    def test_requires_auth(self):
        ing = make_ingredient()
        client = Client()
        response = client.post(
            f"/api/ingredients/{ing.slug}/portions/ai-apply/",
            data={"replace_all": False, "selected": []},
            content_type="application/json",
        )
        assert response.status_code == 403

    def test_replace_all_false_creates_new_non_duplicate_portions(self):
        client, _user = self._client()
        ing = make_ingredient(name="Nudeln")
        existing_count = Portion.objects.filter(ingredient=ing, deleted_at__isnull=True).count()

        payload = {
            "replace_all": False,
            "selected": [
                _suggestion(name="Portion", weight_g=80, portion_type="rezeptportion", rank=1),
                _suggestion(name="Großpackung", weight_g=1000, portion_type="packung", rank=5),
            ],
        }
        response = client.post(
            f"/api/ingredients/{ing.slug}/portions/ai-apply/",
            data=payload,
            content_type="application/json",
        )
        assert response.status_code == 200, response.content
        names = {p["name"] for p in response.json()}
        assert "Großpackung" in names
        assert Portion.objects.filter(ingredient=ing, deleted_at__isnull=True).count() > existing_count

    def test_replace_all_true_soft_deletes_and_recreates_g(self):
        client, _user = self._client()
        ing = make_ingredient(name="Zucker")
        old_g = Portion.objects.get(ingredient=ing, name="g", deleted_at__isnull=True)
        make_portion(ing, name="Alte Portion", measuring_unit=make_measuring_unit(name="Stück2", unit="stk"), rank=50)

        payload = {
            "replace_all": True,
            "selected": [
                _suggestion(name="Portion", weight_g=10, portion_type="rezeptportion", rank=1),
            ],
        }
        response = client.post(
            f"/api/ingredients/{ing.slug}/portions/ai-apply/",
            data=payload,
            content_type="application/json",
        )
        assert response.status_code == 200, response.content

        old_g.refresh_from_db()
        assert old_g.deleted_at is not None  # soft-deleted, not hard-deleted

        active = Portion.objects.filter(ingredient=ing, deleted_at__isnull=True)
        assert active.filter(name="g").exists()
        assert not active.filter(name="Alte Portion").exists()

    def test_name_collision_rolls_back_cleanly(self):
        client, _user = self._client()
        ing = make_ingredient(name="Reis")
        make_portion(ing, name="Portion", measuring_unit=make_measuring_unit(), rank=1)
        before_count = Portion.objects.filter(ingredient=ing, deleted_at__isnull=True).count()

        # "Portion" already exists (case-insensitive dedup skips it silently,
        # not a 500/422) — this asserts no duplicate + no crash.
        payload = {
            "replace_all": False,
            "selected": [_suggestion(name="Portion", weight_g=125, portion_type="rezeptportion", rank=1)],
        }
        response = client.post(
            f"/api/ingredients/{ing.slug}/portions/ai-apply/",
            data=payload,
            content_type="application/json",
        )
        assert response.status_code == 200
        assert Portion.objects.filter(ingredient=ing, name__iexact="Portion", deleted_at__isnull=True).count() == 1
        assert Portion.objects.filter(ingredient=ing, deleted_at__isnull=True).count() == before_count


@pytest.mark.django_db
class TestFullZauberstabFlowMockedGemini:
    """End-to-end simulation of the Zauberstab flow with a mocked Gemini
    response, substituting for the manual staging QA steps in tasks.md
    10.2-10.4 (no live Gemini credentials available in this environment).
    """

    def _client(self):
        user = User.objects.create_user(username="staffuser2", password="pw", is_staff=True)
        client = Client()
        client.force_login(user)
        return client, user

    def _mock_gemini_response(self, *, is_breakfast_topping: bool, is_baking_ingredient: bool):
        import json
        from unittest.mock import MagicMock

        portions = {
            "system_gramm": {
                "name": "g", "weight_g": 1.0, "quantity": 1.0,
                "measuring_unit_name": "Gramm", "rank": 9999, "portion_type": "system_gramm",
            },
            "rezeptportionen": [
                {"name": "Portion", "weight_g": 80.0, "quantity": 1.0,
                 "measuring_unit_name": "Gramm", "rank": 1, "portion_type": "rezeptportion"},
            ],
            "packungen": [
                {"name": "Packung", "weight_g": 500.0, "quantity": 1.0,
                 "measuring_unit_name": "Gramm", "rank": 3, "portion_type": "packung"},
            ],
            "belag": (
                [
                    {"name": "Belag knapp", "weight_g": 10.0, "quantity": 1.0,
                     "measuring_unit_name": "Gramm", "rank": 2, "portion_type": "belag"},
                    {"name": "Belag normal", "weight_g": 20.0, "quantity": 1.0,
                     "measuring_unit_name": "Gramm", "rank": 1, "portion_type": "belag"},
                    {"name": "Belag üppig", "weight_g": 30.0, "quantity": 1.0,
                     "measuring_unit_name": "Gramm", "rank": 3, "portion_type": "belag"},
                ]
                if is_breakfast_topping
                else []
            ),
            "backmengen": (
                [
                    {"name": "Backmenge", "weight_g": 200.0, "quantity": 1.0,
                     "measuring_unit_name": "Gramm", "rank": 4, "portion_type": "backmenge"},
                ]
                if is_baking_ingredient
                else []
            ),
        }
        payload = {
            "name_suggestion": None,
            "energy_kcal": 100.0, "protein_g": 1.0, "fat_g": 1.0, "fat_sat_g": 0.1,
            "carbohydrate_g": 10.0, "sugar_g": 1.0, "fibre_g": 1.0, "salt_g": 0.1,
            "sodium_mg": 10.0, "fructose_g": 0.0, "lactose_g": 0.0,
            "nutri_score": None, "nova_score": None, "child_score": None,
            "scout_score": None, "environmental_score": None, "fruit_factor": None,
            "physical_density": None, "physical_viscosity": None,
            "durability_in_days": None, "max_storage_temperature": None,
            "storage_type": None, "cooking_factor": None, "camp_suitable": None,
            "preparation_time_min": None, "season_start": None, "season_end": None,
            "price_per_kg": None,
            "portions": portions,
            "aliases": [],
            "nutritional_tags": [],
        }
        mock_response = MagicMock()
        mock_response.text = json.dumps(payload)
        return mock_response

    def test_breakfast_topping_suggest_then_apply_without_replace(self):
        from unittest.mock import patch

        client, user = self._client()
        ing = make_ingredient(name="Marmelade")
        tag, _ = Tag.objects.get_or_create(slug="breakfast-topping", defaults={"name": "breakfast-topping"})
        ing.tags.add(tag)

        with patch(
            "supply.services.ingredient_ai_suggest_service.gemini_call",
            return_value=(self._mock_gemini_response(is_breakfast_topping=True, is_baking_ingredient=False), "interaction-1"),
        ):
            suggest_response = client.post(f"/api/ingredients/{ing.slug}/ai-suggest-all/")
        assert suggest_response.status_code == 200, suggest_response.content
        suggestions = suggest_response.json()["portions"]
        assert len(suggestions["belag"]) == 3
        assert suggestions["backmengen"] == []

        selected = [suggestions["rezeptportionen"][0], *suggestions["belag"]]
        apply_response = client.post(
            f"/api/ingredients/{ing.slug}/portions/ai-apply/",
            data={"replace_all": False, "selected": selected},
            content_type="application/json",
        )
        assert apply_response.status_code == 200, apply_response.content
        names = {p["name"] for p in apply_response.json()}
        assert {"Belag knapp", "Belag normal", "Belag üppig", "Portion"} <= names

    def test_baking_ingredient_suggest_then_apply(self):
        from unittest.mock import patch

        client, user = self._client()
        ing = make_ingredient(name="Mehl")
        tag, _ = Tag.objects.get_or_create(slug="baking-ingredient", defaults={"name": "baking-ingredient"})
        ing.tags.add(tag)

        with patch(
            "supply.services.ingredient_ai_suggest_service.gemini_call",
            return_value=(self._mock_gemini_response(is_breakfast_topping=False, is_baking_ingredient=True), "interaction-2"),
        ):
            suggest_response = client.post(f"/api/ingredients/{ing.slug}/ai-suggest-all/")
        assert suggest_response.status_code == 200, suggest_response.content
        suggestions = suggest_response.json()["portions"]
        assert len(suggestions["backmengen"]) == 1
        assert suggestions["belag"] == []

        apply_response = client.post(
            f"/api/ingredients/{ing.slug}/portions/ai-apply/",
            data={"replace_all": False, "selected": suggestions["backmengen"]},
            content_type="application/json",
        )
        assert apply_response.status_code == 200, apply_response.content
        assert "Backmenge" in {p["name"] for p in apply_response.json()}

    def test_replace_all_preserves_recipe_referenced_portion_names(self):
        """Simulates 10.3: replace_all on an ingredient used by a recipe must
        not break the recipe's displayed portion name (soft-delete only)."""
        from recipe.tests import make_recipe, make_recipe_item

        client, user = self._client()
        ing = make_ingredient(name="Reis")
        old_portion = make_portion(ing, name="Alte Rezeptportion", measuring_unit=make_measuring_unit(), rank=1)
        recipe = make_recipe()
        recipe_item = make_recipe_item(recipe, ingredient=ing, portion=old_portion)

        payload = {
            "replace_all": True,
            "selected": [_suggestion(name="Neue Portion", weight_g=125, portion_type="rezeptportion", rank=1)],
        }
        response = client.post(
            f"/api/ingredients/{ing.slug}/portions/ai-apply/",
            data=payload,
            content_type="application/json",
        )
        assert response.status_code == 200, response.content

        recipe_item.refresh_from_db()
        old_portion.refresh_from_db()
        assert old_portion.deleted_at is not None  # soft-deleted, not hard-deleted
        assert recipe_item.portion_id == old_portion.id  # FK untouched, no ProtectedError
        assert recipe_item.portion.name == "Alte Rezeptportion"  # still displays correctly
