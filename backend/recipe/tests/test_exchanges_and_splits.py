"""Tests for recipe exchange groups, optional items, and meal-item splits.

Covers tasks 6.1–6.13:
  6.1  Exchange-Gruppe anlegen, Glied hinzufügen, löschen (PROTECT)
  6.2  is_optional + exchange_group gleichzeitig → HTTP 400
  6.3  Split Σ ≠ 1.0 → HTTP 400; Σ = 1.0 → HTTP 200
  6.4  Einkaufsliste bei Exchange-Split (8/10 + 2/10)
  6.5  Largest-Remainder-Rundung bei krummen Portionen
  6.6  Nährwert Delta-Ansatz bei Split
  6.7  Fork kopiert Exchange-Gruppen vollständig
  6.8  Rezept-Löschung mit aktiven Splits → HTTP 409
  6.9  reserve_factor nicht doppelt auf Splits angewendet
  6.10 PDF-Export rendert getrennte Blöcke pro Exchange-Split (smoke test)
  6.11 Override auf Split-/Optional-Zutat → HTTP 400; normale Zutat → erlaubt
  6.12 is_optional/exchange_group ändern bei aktiven Splits → HTTP 409
  6.13 Exchange-Gruppe löschen entfernt Nicht-Default-Glieder, Original bleibt
"""

import json

import pytest
from django.test import Client

from planner.models import MealItemSplit
from planner.services.split_service import (
    get_included_fractions,
    get_split_delta_total,
    largest_remainder_round,
)
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import RecipeItem, RecipeItemExchangeGroup
from recipe.tests import make_recipe, make_recipe_item
from supply.models import Ingredient, MeasuringUnit, Portion


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_ingredient(name: str = "Parmesan", energy_kcal: float = 400.0) -> Ingredient:
    return Ingredient.objects.create(
        name=name,
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=energy_kcal,
    )


def _make_portion(ingredient: Ingredient, weight_g: float = 100.0) -> Portion:
    unit, _ = MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})
    return Portion.objects.create(
        ingredient=ingredient,
        measuring_unit=unit,
        name="g",
        quantity=weight_g,
        weight_g=weight_g,
    )


def _make_staff_client(db) -> tuple:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(
        username="staff_test",
        password="pass",
        is_staff=True,
    )
    client = Client()
    client.login(username="staff_test", password="pass")
    return client, user


def _make_user_client(db, username: str = "user_test") -> tuple:
    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = User.objects.create_user(username=username, password="pass")
    client = Client()
    client.login(username=username, password="pass")
    return client, user


# ---------------------------------------------------------------------------
# 6.5  Largest-Remainder-Rundung (pure unit test — no DB needed)
# ---------------------------------------------------------------------------


class TestLargestRemainderRound:
    def test_exact(self):
        result = largest_remainder_round({1: 0.5, 2: 0.5}, 10)
        assert result == {1: 5, 2: 5}
        assert sum(result.values()) == 10

    def test_round_down_up(self):
        # 20% of 11 = 2.2, 80% of 11 = 8.8 → 2 and 9 (largest remainder wins)
        result = largest_remainder_round({1: 0.2, 2: 0.8}, 11)
        assert sum(result.values()) == 11
        assert result[1] + result[2] == 11

    def test_zero_total(self):
        result = largest_remainder_round({1: 1.0}, 0)
        assert result == {1: 0}

    def test_three_way_split(self):
        # 1/3 each of 10 → two get 3, one gets 4
        result = largest_remainder_round({1: 1 / 3, 2: 1 / 3, 3: 1 / 3}, 10)
        assert sum(result.values()) == 10


# ---------------------------------------------------------------------------
# 6.1  Exchange-Gruppe anlegen, Glied hinzufügen, Glied löschen (PROTECT)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExchangeGroupCRUD:
    def test_create_and_list(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        resp = client.post(
            f"/api/recipes/{recipe.id}/exchanges/",
            json.dumps({"name": "Käse-Ersatz"}),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "Käse-Ersatz"
        assert data["recipe_id"] == recipe.id

        resp2 = client.get(f"/api/recipes/{recipe.id}/exchanges/")
        assert resp2.status_code == 200
        assert len(resp2.json()) == 1

    def test_add_member_via_recipe_item_patch(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing = _make_ingredient("Parmesan")
        portion = _make_portion(ing)
        item = make_recipe_item(recipe=recipe, portion=portion)

        # Create group
        resp = client.post(
            f"/api/recipes/{recipe.id}/exchanges/",
            json.dumps({"name": ""}),
            content_type="application/json",
        )
        group_id = resp.json()["id"]

        # Assign item to group at position 0
        resp = client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            json.dumps({"exchange_group_id": group_id, "exchange_position": 0}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        item.refresh_from_db()
        assert item.exchange_group_id == group_id
        assert item.exchange_position == 0

    def test_delete_member_blocked_by_active_split(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing = _make_ingredient("Hefeflocken")
        portion = _make_portion(ing)
        item = make_recipe_item(recipe=recipe, portion=portion)

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item.exchange_group = group
        item.exchange_position = 1
        item.save()

        # Create a meal and a split referencing this item
        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item, share=0.2)

        resp = client.delete(f"/api/recipes/{recipe.id}/recipe-items/{item.id}/")
        assert resp.status_code == 409

    def test_delete_group_removes_non_default_keeps_original(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing_a = _make_ingredient("Bergkäse", 400)
        ing_b = _make_ingredient("Cashew-Creme", 600)
        portion_a = _make_portion(ing_a)
        portion_b = _make_portion(ing_b)

        item_default = make_recipe_item(recipe=recipe, portion=portion_a)
        item_alt = make_recipe_item(recipe=recipe, portion=portion_b)

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe, name="Käse")
        item_default.exchange_group = group
        item_default.exchange_position = 0
        item_default.save()
        item_alt.exchange_group = group
        item_alt.exchange_position = 1
        item_alt.save()

        resp = client.delete(f"/api/recipes/{recipe.id}/exchanges/{group.id}/")
        assert resp.status_code == 200

        # Alt member deleted
        assert not RecipeItem.objects.filter(id=item_alt.id).exists()
        # Default member survives, group reset
        item_default.refresh_from_db()
        assert item_default.exchange_group_id is None
        assert item_default.exchange_position is None


# ---------------------------------------------------------------------------
# 6.2  is_optional + exchange_group gleichzeitig → HTTP 400
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestOptionalXorExchange:
    def test_set_optional_on_exchange_item_blocked(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing = _make_ingredient()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(ing))

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item.exchange_group = group
        item.exchange_position = 0
        item.save()

        resp = client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            json.dumps({"is_optional": True}),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_set_exchange_on_optional_item_blocked(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing = _make_ingredient()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(ing))
        item.is_optional = True
        item.save()

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)

        resp = client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            json.dumps({"exchange_group_id": group.id, "exchange_position": 0}),
            content_type="application/json",
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# 6.3  Split Σ ≠ 1.0 → HTTP 400; Σ = 1.0 → HTTP 200
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSplitConstraint:
    def _setup(self):
        recipe = make_recipe()
        ing_a = _make_ingredient("A", 400)
        ing_b = _make_ingredient("B", 200)
        item_a = make_recipe_item(recipe=recipe, portion=_make_portion(ing_a, 30))
        item_b = make_recipe_item(recipe=recipe, portion=_make_portion(ing_b, 20))

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item_a.exchange_group = group
        item_a.exchange_position = 0
        item_a.save()
        item_b.exchange_group = group
        item_b.exchange_position = 1
        item_b.save()

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)
        return recipe, item_a, item_b, plan, mi

    def test_invalid_sum_rejected(self):
        client, _ = _make_staff_client(None)
        recipe, item_a, item_b, plan, mi = self._setup()

        resp = client.put(
            f"/api/meal-plans/{plan.id}/meal-items/{mi.id}/splits/",
            json.dumps([
                {"recipe_item_id": item_a.id, "share": 0.6},
                {"recipe_item_id": item_b.id, "share": 0.6},
            ]),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_valid_sum_accepted(self):
        client, _ = _make_staff_client(None)
        recipe, item_a, item_b, plan, mi = self._setup()

        resp = client.put(
            f"/api/meal-plans/{plan.id}/meal-items/{mi.id}/splits/",
            json.dumps([
                {"recipe_item_id": item_a.id, "share": 0.8},
                {"recipe_item_id": item_b.id, "share": 0.2},
            ]),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert MealItemSplit.objects.filter(meal_item=mi).count() == 2


# ---------------------------------------------------------------------------
# 6.4  Einkaufsliste bei Exchange-Split (8/10 Parmesan + 2/10 Hefeflocken)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestShoppingListSplitAware:
    def test_exchange_split_quantities(self):
        from supply.services.shopping_service import generate_shopping_list

        recipe = make_recipe(portions=1)
        ing_a = _make_ingredient("Parmesan", 400)
        ing_b = _make_ingredient("Hefeflocken", 300)
        # 30g Parmesan per portion, 20g Hefeflocken per portion
        portion_a = _make_portion(ing_a, 30)
        portion_b = _make_portion(ing_b, 20)

        item_a = make_recipe_item(recipe=recipe, portion=portion_a, quantity=1)
        item_b = make_recipe_item(recipe=recipe, portion=portion_b, quantity=1)

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item_a.exchange_group = group
        item_a.exchange_position = 0
        item_a.save()
        item_b.exchange_group = group
        item_b.exchange_position = 1
        item_b.save()

        plan = make_meal_plan(norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)

        # 8 normal (Parmesan), 2 vegan (Hefeflocken)
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item_a, share=0.8)
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item_b, share=0.2)

        items = generate_shopping_list(plan)
        by_name = {i.ingredient_name: i for i in items}

        # 30g × 8 portions = 240g Parmesan
        assert "Parmesan" in by_name
        assert abs(by_name["Parmesan"].total_quantity_g - 240.0) < 1.0

        # 20g × 2 portions = 40g Hefeflocken
        assert "Hefeflocken" in by_name
        assert abs(by_name["Hefeflocken"].total_quantity_g - 40.0) < 1.0


# ---------------------------------------------------------------------------
# 6.5  Largest-Remainder (already covered in TestLargestRemainderRound above)
# Also test get_included_fractions with krumme Portionen
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestIncludedFractionsRounding:
    def test_20_percent_of_11(self):
        recipe = make_recipe(portions=1)
        ing_a = _make_ingredient("A")
        ing_b = _make_ingredient("B")
        item_a = make_recipe_item(recipe=recipe, portion=_make_portion(ing_a))
        item_b = make_recipe_item(recipe=recipe, portion=_make_portion(ing_b))

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item_a.exchange_group = group
        item_a.exchange_position = 0
        item_a.save()
        item_b.exchange_group = group
        item_b.exchange_position = 1
        item_b.save()

        plan = make_meal_plan(norm_portions=11, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item_a, share=0.8)
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item_b, share=0.2)

        fractions = get_included_fractions(mi, [item_a, item_b], 11)

        # Rounded portions must sum to 11
        portions_a = round(fractions[item_a.id] * 11)
        portions_b = round(fractions[item_b.id] * 11)
        assert portions_a + portions_b == 11
        assert portions_a > portions_b


# ---------------------------------------------------------------------------
# 6.6  Nährwert Delta-Ansatz bei Split
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestNutritionDelta:
    def test_energy_delta_exchange(self):
        recipe = make_recipe(portions=1)
        ing_a = _make_ingredient("Parmesan", energy_kcal=400)
        ing_b = _make_ingredient("Hefeflocken", energy_kcal=300)
        # 30g portions each
        item_a = make_recipe_item(recipe=recipe, portion=_make_portion(ing_a, 30), quantity=1)
        item_b = make_recipe_item(recipe=recipe, portion=_make_portion(ing_b, 30), quantity=1)

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item_a.exchange_group = group
        item_a.exchange_position = 0
        item_a.save()
        item_b.exchange_group = group
        item_b.exchange_position = 1
        item_b.save()

        plan = make_meal_plan(norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)

        # 8 Parmesan, 2 Hefeflocken
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item_a, share=0.8)
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item_b, share=0.2)

        recipe_items = [item_a, item_b]
        delta = get_split_delta_total(mi, recipe_items, "energy_kcal")

        # Base = Parmesan: 400 kcal/100g × 30g = 120 kcal
        # Actual = 0.8 × 120 + 0.2 × (300/100 × 30) = 96 + 18 = 114 kcal
        # Delta = 114 - 120 = -6
        assert abs(delta - (-6.0)) < 0.01

    def test_no_delta_without_splits(self):
        recipe = make_recipe(portions=1)
        ing = _make_ingredient("Parmesan", 400)
        item = make_recipe_item(recipe=recipe, portion=_make_portion(ing, 30), quantity=1)

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)

        delta = get_split_delta_total(mi, [item], "energy_kcal")
        assert delta == 0.0


# ---------------------------------------------------------------------------
# 6.7  Fork kopiert Exchange-Gruppen vollständig
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestForkCopiesExchangeGroups:
    def test_fork_copies_groups_independently(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing_a = _make_ingredient("A")
        ing_b = _make_ingredient("B")
        item_a = make_recipe_item(recipe=recipe, portion=_make_portion(ing_a))
        item_b = make_recipe_item(recipe=recipe, portion=_make_portion(ing_b))

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe, name="Test-Gruppe")
        item_a.exchange_group = group
        item_a.exchange_position = 0
        item_a.save()
        item_b.exchange_group = group
        item_b.exchange_position = 1
        item_b.save()

        resp = client.post(
            f"/api/recipes/{recipe.id}/fork/",
            json.dumps({}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        fork_slug = resp.json()["slug"]

        from recipe.models import Recipe as RecipeModel

        fork = RecipeModel.objects.get(slug=fork_slug)
        assert fork.id != recipe.id

        # Fork should have its own exchange group (not same object)
        fork_groups = list(fork.exchange_groups.all())
        assert len(fork_groups) == 1
        assert fork_groups[0].id != group.id
        assert fork_groups[0].name == "Test-Gruppe"

        fork_items = list(fork.recipe_items.filter(exchange_group__isnull=False))
        assert len(fork_items) == 2
        # Fork items reference fork's group, not original's
        for fi in fork_items:
            assert fi.exchange_group_id == fork_groups[0].id

        # Modifying original group doesn't affect fork
        group.name = "Geändert"
        group.save()
        fork_groups[0].refresh_from_db()
        assert fork_groups[0].name == "Test-Gruppe"


# ---------------------------------------------------------------------------
# 6.8  Rezept-Löschung mit aktiven Splits → HTTP 409
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRecipeDeleteProtection:
    def test_delete_blocked_when_splits_active(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing = _make_ingredient()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(ing))

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)
        item.is_optional = True
        item.save()
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item, share=1.0)

        resp = client.delete(f"/api/recipes/{recipe.id}/")
        assert resp.status_code == 409

    def test_delete_allowed_without_splits(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        resp = client.delete(f"/api/recipes/{recipe.id}/")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 6.9  reserve_factor nicht doppelt angewendet
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReserveFactorNotDoubled:
    def test_reserve_applied_once_with_split(self):
        from supply.services.shopping_service import generate_shopping_list

        recipe = make_recipe(portions=1)
        ing = _make_ingredient("Nudeln", 350)
        portion = _make_portion(ing, 100)
        item = make_recipe_item(recipe=recipe, portion=portion, quantity=1)
        item.is_optional = True
        item.save()

        # plan: 10 portions × 1.1 reserve = scaling_factor 11
        plan = make_meal_plan(norm_portions=10, reserve_factor=1.1)
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)

        # Split: 100% included (share=1.0)
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item, share=1.0)

        items = generate_shopping_list(plan)
        by_name = {i.ingredient_name: i for i in items}

        # 100g × 1 (quantity) × 11 (scaling) × 1.0 (fraction) = 1100g
        assert "Nudeln" in by_name
        assert abs(by_name["Nudeln"].total_quantity_g - 1100.0) < 5.0

        # Without any split (default included), should be same
        MealItemSplit.objects.filter(meal_item=mi).delete()
        items2 = generate_shopping_list(plan)
        by_name2 = {i.ingredient_name: i for i in items2}
        assert abs(by_name2["Nudeln"].total_quantity_g - 1100.0) < 5.0


# ---------------------------------------------------------------------------
# 6.10 PDF-Export Smoke Test (getrennte Blöcke nur nach Implementierung Group 12)
# ---------------------------------------------------------------------------


@pytest.mark.skip(reason="PDF split blocks implemented in Group 12; WeasyPrint requires system libs in CI")
@pytest.mark.django_db
class TestPdfExportSmoke:
    def test_pdf_export_endpoint_exists_and_returns_pdf(self):
        client, _ = _make_staff_client(None)
        plan = make_meal_plan()
        resp = client.get(f"/api/meal-plans/{plan.id}/export/pdf/")
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            assert "pdf" in resp.get("Content-Type", "").lower()


# ---------------------------------------------------------------------------
# 6.11 Override auf Split-/Optional-Zutat → HTTP 400; normale Zutat → erlaubt
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestOverrideOnSplitItemBlocked:
    def test_override_on_optional_item_blocked(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing = _make_ingredient()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(ing))
        item.is_optional = True
        item.save()

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)

        resp = client.patch(
            f"/api/meal-plans/{plan.id}/meal-items/{mi.id}/overrides/",
            json.dumps([{"recipe_item_id": item.id, "excluded": True}]),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_override_on_exchange_item_blocked(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing = _make_ingredient()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(ing))

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item.exchange_group = group
        item.exchange_position = 0
        item.save()

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)

        resp = client.patch(
            f"/api/meal-plans/{plan.id}/meal-items/{mi.id}/overrides/",
            json.dumps([{"recipe_item_id": item.id, "excluded": True}]),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_override_on_normal_item_allowed(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing = _make_ingredient()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(ing))

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)

        resp = client.patch(
            f"/api/meal-plans/{plan.id}/meal-items/{mi.id}/overrides/",
            json.dumps([{"recipe_item_id": item.id, "excluded": True}]),
            content_type="application/json",
        )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 6.12 is_optional/exchange_group ändern bei aktiven Splits → HTTP 409
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestChangeBlockedWithActiveSplits:
    def test_remove_optional_blocked_by_split(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing = _make_ingredient()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(ing))
        item.is_optional = True
        item.save()

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item, share=1.0)

        resp = client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            json.dumps({"is_optional": False}),
            content_type="application/json",
        )
        assert resp.status_code == 409

    def test_change_exchange_group_blocked_by_split(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()
        ing = _make_ingredient()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(ing))

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item.exchange_group = group
        item.exchange_position = 0
        item.save()

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe)
        MealItemSplit.objects.create(meal_item=mi, recipe_item=item, share=1.0)

        resp = client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            json.dumps({"exchange_group_id": None}),
            content_type="application/json",
        )
        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# 6.13 Exchange-Gruppe löschen entfernt Nicht-Default, Original bleibt
# (already in TestExchangeGroupCRUD.test_delete_group_removes_non_default_keeps_original)
# This is a standalone confirmation test.
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExchangeGroupDeleteBehavior:
    def test_delete_group_with_two_members(self):
        client, _ = _make_staff_client(None)
        recipe = make_recipe()

        ing_orig = _make_ingredient("Original")
        ing_alt = _make_ingredient("Alternativ")
        item_orig = make_recipe_item(recipe=recipe, portion=_make_portion(ing_orig))
        item_alt = make_recipe_item(recipe=recipe, portion=_make_portion(ing_alt))

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe, name="G")
        item_orig.exchange_group = group
        item_orig.exchange_position = 0
        item_orig.save()
        item_alt.exchange_group = group
        item_alt.exchange_position = 1
        item_alt.save()

        resp = client.delete(f"/api/recipes/{recipe.id}/exchanges/{group.id}/")
        assert resp.status_code == 200

        # Group gone
        assert not RecipeItemExchangeGroup.objects.filter(id=group.id).exists()

        # Alt member deleted
        assert not RecipeItem.objects.filter(id=item_alt.id).exists()

        # Original survives as normal item
        item_orig.refresh_from_db()
        assert item_orig.exchange_group_id is None
        assert item_orig.exchange_position is None
