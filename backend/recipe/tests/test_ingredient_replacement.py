"""Tests for ingredient replacement mappings, matcher integration and the replace endpoint."""

from unittest.mock import patch

import pytest

from content.choices import ContentStatus
from recipe.models import Recipe, RecipeItem, RecipeItemIdempotencyRecord, RecipeStep, RecipeStepIngredient
from recipe.services.ai_ingredients_service import (
    AiIngredientsOutput,
    AiIngredientSuggestion,
    MatchedIngredientResult,
    RecipeAiIngredientsService,
)
from recipe.services.ingredient_matcher import IngredientMatcher
from supply.models import Ingredient, IngredientAlias, IngredientReplacementMapping, MeasuringUnit, Portion
from supply.tests import make_ingredient


@pytest.fixture
def gramm_unit(db):
    return MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})[0]


@pytest.fixture
def salz(db, gramm_unit):
    ingredient = make_ingredient(name="Salz", energy_kcal=0.0)
    Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=gramm_unit,
        name="1 g",
        quantity=1.0,
        weight_g=1.0,
        rank=1,
    )
    return ingredient


@pytest.fixture
def jodsalz(db, gramm_unit):
    ingredient = make_ingredient(name="Jodsalz", energy_kcal=400.0)
    Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=gramm_unit,
        name="1 g",
        quantity=1.0,
        weight_g=1.0,
        rank=1,
    )
    return ingredient


@pytest.fixture
def recipe_with_salz(db, auth_client, salz):
    user = auth_client._user
    recipe = Recipe.objects.create(title="Salzrezept", status=ContentStatus.DRAFT, created_by=user)
    recipe.authors.add(user)
    portion = salz.portions.active().first()
    item = RecipeItem.objects.create(
        recipe=recipe,
        portion=portion,
        quantity=5.0,
        sort_order=3,
        note="gehackt",
    )
    return recipe, item


@pytest.fixture
def salz_jodsalz_mapping(db, salz, jodsalz):
    return IngredientReplacementMapping.objects.create(
        source_ingredient=salz,
        replacement_ingredient=jodsalz,
        relation_kind="generic_to_concrete",
        is_active=True,
        provenance="seed:reviewed",
    )


@pytest.mark.django_db
class TestMatcherReplacementContext:
    """Task 1.4: mapping direction, inactive mappings, aliases, filtering."""

    def test_mapping_direction_replacement_exposed(self, salz, jodsalz, salz_jodsalz_mapping, recipe_with_salz):
        recipe, item = recipe_with_salz
        result = IngredientMatcher.match("Jodsalz", recipe=recipe)
        assert result.ingredient_id == jodsalz.id
        assert result.replacement_for_item_id == item.id
        assert result.replacement_reason == f"Ersatz für {salz.name}"
        assert result.replacement_confidence == 1.0

    def test_direction_reversed_no_replacement(self, salz, jodsalz, salz_jodsalz_mapping, gramm_unit, db, auth_client):
        # Recipe contains Jodsalz; matching the generic "Salz" must not produce
        # replacement metadata (mapping is generic -> concrete only).
        user = auth_client._user
        recipe = Recipe.objects.create(title="Jodsalzrezept", status=ContentStatus.DRAFT, created_by=user)
        portion = jodsalz.portions.first()
        RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=5.0)
        result = IngredientMatcher.match("Salz", recipe=recipe)
        assert result.replacement_for_item_id is None
        assert result.replacement_reason is None

    def test_inactive_mapping_ignored(self, salz, jodsalz, salz_jodsalz_mapping, recipe_with_salz):
        salz_jodsalz_mapping.is_active = False
        salz_jodsalz_mapping.save(update_fields=["is_active"])
        recipe, _ = recipe_with_salz
        result = IngredientMatcher.match("Jodsalz", recipe=recipe)
        assert result.ingredient_id == jodsalz.id
        assert result.replacement_for_item_id is None
        assert result.replacement_reason is None

    def test_no_recipe_context_returns_plain_result(self, salz, jodsalz, salz_jodsalz_mapping):
        result = IngredientMatcher.match("Jodsalz")
        assert result.ingredient_id == jodsalz.id
        assert result.replacement_for_item_id is None
        assert result.replacement_reason is None
        assert result.replacement_confidence is None

    def test_ambiguous_alias_targets_mapping_source_not_alias(
        self, salz, jodsalz, salz_jodsalz_mapping, gramm_unit, db, auth_client
    ):
        # A second ingredient carries the generic alias "Salz" but is not the
        # mapping source — the replacement must target the real source item.
        meersalz = make_ingredient(name="Meersalz grob")
        alias_portion = Portion.objects.create(
            ingredient=meersalz,
            measuring_unit=gramm_unit,
            name="1 g",
            quantity=1.0,
            weight_g=1.0,
            rank=1,
        )
        IngredientAlias.objects.create(ingredient=meersalz, name="Salz", is_generic=True)

        user = auth_client._user
        recipe = Recipe.objects.create(title="Salzrezept", status=ContentStatus.DRAFT, created_by=user)
        salz_portion = salz.portions.first()
        salz_item = RecipeItem.objects.create(recipe=recipe, portion=salz_portion, quantity=5.0)
        RecipeItem.objects.create(recipe=recipe, portion=alias_portion, quantity=7.0)

        result = IngredientMatcher.match("Jodsalz", recipe=recipe)
        assert result.replacement_for_item_id == salz_item.id

    def test_no_source_in_recipe_stays_add_candidate(self, salz, jodsalz, salz_jodsalz_mapping, db, auth_client):
        user = auth_client._user
        recipe = Recipe.objects.create(title="Leeres Rezept", status=ContentStatus.DRAFT, created_by=user)
        result = IngredientMatcher.match("Jodsalz", recipe=recipe)
        assert result.ingredient_id == jodsalz.id
        assert result.replacement_for_item_id is None

    def test_service_suggestion_returns_replacement_candidate(
        self, salz, jodsalz, salz_jodsalz_mapping, recipe_with_salz
    ):
        recipe, item = recipe_with_salz
        service = RecipeAiIngredientsService()
        ai_output = AiIngredientsOutput(items=[AiIngredientSuggestion(name="Jodsalz", estimated_grams=5.0)])
        with patch.object(service, "suggest_ingredients", return_value=(ai_output, "interaction-1")):
            results, interaction_id = service.get_full_suggestions(recipe)
        assert interaction_id == "interaction-1"
        assert len(results) == 1
        result = results[0]
        assert result.ingredient_id == jodsalz.id
        assert result.replacement_for_item_id == item.id
        assert result.replacement_reason == f"Ersatz für {salz.name}"
        assert result.replacement_confidence == 1.0

    def test_suggest_endpoint_keeps_replacement_candidate(self, auth_client, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        suggestion = MatchedIngredientResult(
            ingredient_id=jodsalz.id,
            ingredient_name=jodsalz.name,
            portion_id=jodsalz.portions.first().id,
            portion_name="1 g",
            quantity=5.0,
            measuring_unit_id=None,
            measuring_unit_name="g",
            replacement_for_item_id=item.id,
            replacement_reason="Ersatz für Salz",
            replacement_confidence=1.0,
        )
        with patch(
            "recipe.services.ai_ingredients_service.RecipeAiIngredientsService.get_full_suggestions",
            return_value=([suggestion], "interaction-2"),
        ):
            response = auth_client.post(f"/api/recipes/{recipe.id}/ai-suggest-ingredients/")

        assert response.status_code == 200
        assert response.json()["items"] == [
            {
                "ingredient_id": jodsalz.id,
                "ingredient_name": jodsalz.name,
                "portion_id": suggestion.portion_id,
                "portion_name": "1 g",
                "quantity": 5.0,
                "is_new_ingredient": False,
                "note": "",
                "replacement_for_item_id": item.id,
                "replacement_reason": "Ersatz für Salz",
                "replacement_confidence": 1.0,
            }
        ]


@pytest.mark.django_db
class TestReplaceEndpoint:
    """Task 2.5: Salz -> Jodsalz, invalid portions, permissions, idempotency, caches."""

    def _replace(self, client, recipe_id, item_id, **payload):
        return client.post(
            f"/api/recipes/{recipe_id}/items/{item_id}/replace/",
            data=payload,
            content_type="application/json",
        )

    def test_replace_success_preserves_item_metadata(self, auth_client, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        target_portion = jodsalz.portions.first()
        resp = self._replace(
            auth_client,
            recipe.id,
            item.id,
            portion_id=target_portion.id,
            ingredient_id=jodsalz.id,
            client_request_id="req-1",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == item.id
        assert data["portion_id"] == target_portion.id
        assert data["ingredient_id"] == jodsalz.id
        # 5 g Salz with weight_g=1 -> 5 g Jodsalz (weight_g=1)
        assert data["quantity"] == 5.0
        assert data["note"] == "gehackt"
        assert data["sort_order"] == 3
        assert data["is_optional"] is False

        item.refresh_from_db()
        assert item.portion_id == target_portion.id
        assert item.quantity == 5.0
        assert item.note == "gehackt"
        assert item.sort_order == 3
        assert item.exchange_group_id is None
        assert RecipeItem.objects.filter(recipe=recipe).count() == 1

    def test_replace_unsafe_conversion_requires_quantity(self, auth_client, gramm_unit, recipe_with_salz):
        recipe, item = recipe_with_salz
        target = make_ingredient(name="Spezialgewürz")
        unknown_unit = MeasuringUnit.objects.create(name="Prise unbekannt", quantity=0.0, unit="g")
        portion = Portion.objects.create(
            ingredient=target,
            measuring_unit=unknown_unit,
            name="1 Prise",
            quantity=1.0,
            weight_g=None,
            rank=1,
        )
        assert portion.weight_g is None
        resp = self._replace(auth_client, recipe.id, item.id, portion_id=portion.id)
        assert resp.status_code == 422
        item.refresh_from_db()
        assert item.portion.ingredient.name == "Salz"
        assert item.quantity == 5.0

    def test_replace_quantity_override(self, auth_client, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        target_portion = jodsalz.portions.first()
        resp = self._replace(auth_client, recipe.id, item.id, portion_id=target_portion.id, quantity=10.0)
        assert resp.status_code == 200
        assert resp.json()["quantity"] == 10.0

    def test_replace_portion_of_other_ingredient_422(self, auth_client, gramm_unit, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        other = make_ingredient(name="Pfeffer")
        other_portion = Portion.objects.create(
            ingredient=other,
            measuring_unit=gramm_unit,
            name="1 g",
            quantity=1.0,
            weight_g=1.0,
            rank=1,
        )
        resp = self._replace(
            auth_client,
            recipe.id,
            item.id,
            portion_id=other_portion.id,
            ingredient_id=jodsalz.id,
        )
        assert resp.status_code == 422
        item.refresh_from_db()
        assert item.portion.ingredient.name == "Salz"

    def test_replace_inactive_portion_404(self, auth_client, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        target_portion = jodsalz.portions.first()
        target_portion.soft_delete()
        resp = self._replace(auth_client, recipe.id, item.id, portion_id=target_portion.id)
        assert resp.status_code == 404
        item.refresh_from_db()
        assert item.portion.ingredient.name == "Salz"

    def test_replace_missing_portion_404(self, auth_client, recipe_with_salz):
        recipe, item = recipe_with_salz
        resp = self._replace(auth_client, recipe.id, item.id, portion_id=999999)
        assert resp.status_code == 404

    def test_replace_missing_item_404(self, auth_client, jodsalz, recipe_with_salz):
        recipe, _ = recipe_with_salz
        target_portion = jodsalz.portions.first()
        resp = self._replace(auth_client, recipe.id, 999999, portion_id=target_portion.id)
        assert resp.status_code == 404

    def test_replace_item_of_other_recipe_404(self, auth_client, jodsalz, recipe_with_salz, db):
        recipe, item = recipe_with_salz
        user = auth_client._user
        other_recipe = Recipe.objects.create(title="Anderes Rezept", status=ContentStatus.DRAFT, created_by=user)
        target_portion = jodsalz.portions.first()
        resp = self._replace(auth_client, other_recipe.id, item.id, portion_id=target_portion.id)
        assert resp.status_code == 404

    def test_replace_unauthenticated_403(self, client, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        target_portion = jodsalz.portions.first()
        resp = self._replace(client, recipe.id, item.id, portion_id=target_portion.id)
        assert resp.status_code == 403

    def test_replace_other_user_forbidden(self, django_user_model, client, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        other = django_user_model.objects.create_user(username="other", password="pw")
        client.force_login(other)
        target_portion = jodsalz.portions.first()
        resp = self._replace(client, recipe.id, item.id, portion_id=target_portion.id)
        assert resp.status_code in (403, 404)

    def test_replace_idempotent_same_request_key(self, auth_client, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        target_portion = jodsalz.portions.first()
        payload = {
            "portion_id": target_portion.id,
            "ingredient_id": jodsalz.id,
            "client_request_id": "same-key",
        }
        first = self._replace(auth_client, recipe.id, item.id, **payload)
        second = self._replace(auth_client, recipe.id, item.id, **payload)
        assert first.status_code == 200
        assert second.status_code == 200
        assert second.json()["id"] == item.id
        assert (
            RecipeItemIdempotencyRecord.objects.filter(
                operation=RecipeItemIdempotencyRecord.OPERATION_REPLACE,
                request_key="same-key",
            ).count()
            == 1
        )
        assert RecipeItem.objects.filter(recipe=recipe).count() == 1

    def test_replace_conflicting_request_key_409(self, auth_client, gramm_unit, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        target_portion = jodsalz.portions.first()
        other = make_ingredient(name="Pfeffer")
        other_portion = Portion.objects.create(
            ingredient=other,
            measuring_unit=gramm_unit,
            name="1 g",
            quantity=1.0,
            weight_g=1.0,
            rank=1,
        )
        first = self._replace(
            auth_client,
            recipe.id,
            item.id,
            portion_id=target_portion.id,
            client_request_id="conflict-key",
        )
        second = self._replace(
            auth_client,
            recipe.id,
            item.id,
            portion_id=other_portion.id,
            client_request_id="conflict-key",
        )
        assert first.status_code == 200
        assert second.status_code == 409

    def test_replace_preserves_step_assignments(self, auth_client, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        step = RecipeStep.objects.create(recipe=recipe, sort_order=0, instruction="Würzen mit {Salz}")
        RecipeStepIngredient.objects.create(step=step, recipe_item=item, quantity_modifier=1.0)
        target_portion = jodsalz.portions.first()

        resp = self._replace(auth_client, recipe.id, item.id, portion_id=target_portion.id)
        assert resp.status_code == 200
        assert resp.json()["id"] == item.id
        assignment = RecipeStepIngredient.objects.get(step=step)
        assert assignment.recipe_item_id == item.id
        assert assignment.recipe_item.portion_id == target_portion.id

    def test_replace_recalculates_cache(self, auth_client, salz, jodsalz, recipe_with_salz):
        recipe, item = recipe_with_salz
        before = recipe.cached_energy_kcal
        target_portion = jodsalz.portions.first()
        resp = self._replace(auth_client, recipe.id, item.id, portion_id=target_portion.id)
        assert resp.status_code == 200
        recipe.refresh_from_db()
        # Salz energy 0 -> Jodsalz energy 400 kcal/100g: cache must change.
        assert recipe.cached_energy_kcal != before
        assert recipe.cached_energy_kcal is not None


@pytest.mark.django_db
class TestApplyTimeCreation:
    """Task 2.4: apply-time creation for confirmed candidates, no preview drafts."""

    def test_apply_creates_unresolved_ingredient(self, auth_client, db):
        user = auth_client._user
        recipe = Recipe.objects.create(title="Gewürzrezept", status=ContentStatus.DRAFT, created_by=user)
        recipe.authors.add(user)

        resp = auth_client.post(
            f"/api/recipes/{recipe.id}/ai-apply-ingredients/",
            data=[{"portion_id": None, "ingredient_id": None, "name": "Spezialgewürz", "quantity": 10.0}],
            content_type="application/json",
        )
        assert resp.status_code == 200
        created = resp.json()
        assert len(created) == 1
        ingredient = Ingredient.objects.get(name="Spezialgewürz")
        assert ingredient.status == "draft"
        item = RecipeItem.objects.get(id=created[0]["id"])
        assert item.portion.ingredient_id == ingredient.id
        assert item.portion.measuring_unit.unit == "g"

    def test_apply_creates_fallback_portion_for_existing_ingredient(self, auth_client, db):
        user = auth_client._user
        recipe = Recipe.objects.create(title="Gewürzrezept", status=ContentStatus.DRAFT, created_by=user)
        recipe.authors.add(user)
        bare = make_ingredient(name="Bare Zutat")

        resp = auth_client.post(
            f"/api/recipes/{recipe.id}/ai-apply-ingredients/",
            data=[{"portion_id": None, "ingredient_id": bare.id, "name": "Bare Zutat", "quantity": 20.0}],
            content_type="application/json",
        )
        assert resp.status_code == 200
        item = RecipeItem.objects.get(id=resp.json()[0]["id"])
        assert item.portion.ingredient_id == bare.id
        assert item.portion.name == "g"

    def test_apply_skips_ingredient_already_in_recipe(self, auth_client, salz, recipe_with_salz):
        recipe, _ = recipe_with_salz
        resp = auth_client.post(
            f"/api/recipes/{recipe.id}/ai-apply-ingredients/",
            data=[{"portion_id": None, "ingredient_id": salz.id, "name": "Salz", "quantity": 5.0}],
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json() == []
        assert RecipeItem.objects.filter(recipe=recipe).count() == 1
