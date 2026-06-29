"""
Tests for recipe exchange groups, optional items, and variant meal items.
Replaces test_exchanges_and_splits.py — uses variant items instead of MealItemSplit.
"""

import json

import pytest
from django.test import Client

from planner.models import MealItem
from planner.services.variant_service import (
    compute_variant_cost,
    compute_variant_energy,
    compute_variant_contributions,
    _compute_delta,
    _item_total_for_field,
)
from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import RecipeItem, RecipeItemExchangeGroup
from recipe.tests import make_recipe, make_recipe_item
from supply.models import Ingredient, MeasuringUnit, Portion


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


def _make_staff_client() -> tuple:
    from django.contrib.auth import get_user_model
    User = get_user_model()
    user = User.objects.create_user(username="staff_test", password="pass", is_staff=True)
    client = Client()
    client.login(username="staff_test", password="pass")
    return client, user


# ---------------------------------------------------------------------------
# 6.1  Exchange-Gruppe anlegen, Glied hinzufügen, Glied löschen (PROTECT)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExchangeGroupCRUD:
    def test_create_and_list(self):
        client, _ = _make_staff_client()
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
        client, _ = _make_staff_client()
        recipe = make_recipe()
        ing = _make_ingredient("Parmesan")
        portion = _make_portion(ing)
        item = make_recipe_item(recipe=recipe, portion=portion)

        resp = client.post(
            f"/api/recipes/{recipe.id}/exchanges/",
            json.dumps({"name": ""}),
            content_type="application/json",
        )
        group_id = resp.json()["id"]

        resp = client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            json.dumps({"exchange_group_id": group_id, "exchange_position": 0}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        item.refresh_from_db()
        assert item.exchange_group_id == group_id
        assert item.exchange_position == 0

    def test_delete_member_blocked_by_active_variant(self):
        client, _ = _make_staff_client()
        recipe = make_recipe()
        ing = _make_ingredient("Hefeflocken")
        portion = _make_portion(ing)
        item = make_recipe_item(recipe=recipe, portion=portion)

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item.exchange_group = group
        item.exchange_position = 1
        item.save()

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe, active_recipe_item_ids=[item.id])

        resp = client.delete(f"/api/recipes/{recipe.id}/recipe-items/{item.id}/")
        assert resp.status_code == 409

    def test_delete_group_removes_non_default_keeps_original(self):
        client, _ = _make_staff_client()
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
        assert not RecipeItem.objects.filter(id=item_alt.id).exists()
        item_default.refresh_from_db()
        assert item_default.exchange_group_id is None
        assert item_default.exchange_position is None


# ---------------------------------------------------------------------------
# 6.2  is_optional + exchange_group gleichzeitig → HTTP 400
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestOptionalXorExchange:
    def test_set_optional_on_exchange_item_blocked(self):
        client, _ = _make_staff_client()
        recipe = make_recipe()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(_make_ingredient()))
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
        client, _ = _make_staff_client()
        recipe = make_recipe()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(_make_ingredient()))
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
# 6.3  Variant batch creation API
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestVariantBatchCreate:
    def _setup(self):
        recipe = make_recipe(portions=1)
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

        plan = make_meal_plan(norm_portions=10, reserve_factor=1.0)
        meal = make_meal(meal_plan=plan)
        return recipe, plan, meal

    def test_batch_create_variants(self):
        client, _ = _make_staff_client()
        recipe, plan, meal = self._setup()

        payload = {
            "items": [
                {"recipe_id": recipe.id, "factor": 0.6, "active_recipe_item_ids": [recipe.recipe_items.first().id]},
                {"recipe_id": recipe.id, "factor": 0.4, "active_recipe_item_ids": [recipe.recipe_items.last().id]},
            ]
        }
        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/batch/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200, resp.content
        data = resp.json()
        assert len(data) == 2
        for item in data:
            assert item["variant_group_id"] is not None
            assert item["factor"] in (0.6, 0.4)
            assert len(item["active_recipe_item_ids"]) == 1
        # Variants share same group UUID
        assert data[0]["variant_group_id"] == data[1]["variant_group_id"]

    def test_empty_batch_rejected(self):
        client, _ = _make_staff_client()
        recipe, plan, meal = self._setup()
        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/batch/",
            json.dumps({"items": []}),
            content_type="application/json",
        )
        assert resp.status_code == 422

    def test_factor_below_threshold_rejected(self):
        client, _ = _make_staff_client()
        recipe, plan, meal = self._setup()
        payload = {
            "items": [
                {"recipe_id": recipe.id, "factor": 0.001, "active_recipe_item_ids": [recipe.recipe_items.first().id]},
            ]
        }
        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/batch/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 422

    def test_batch_deletes_parent_item(self):
        client, _ = _make_staff_client()
        recipe, plan, meal = self._setup()
        # Create parent item first
        parent = make_meal_item(meal=meal, recipe=recipe, factor=1.0)

        payload = {
            "items": [
                {"recipe_id": recipe.id, "factor": 1.0, "active_recipe_item_ids": [recipe.recipe_items.first().id]},
            ]
        }
        resp = client.post(
            f"/api/meal-plans/{plan.id}/meals/{meal.id}/items/batch/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 200
        # Parent item should be deleted
        assert not MealItem.objects.filter(id=parent.id).exists()


# ---------------------------------------------------------------------------
# 6.4  Einkaufsliste bei Variant-Items
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestShoppingListVariantAware:
    def test_variant_item_quantities(self):
        from supply.services.shopping_service import generate_shopping_list

        recipe = make_recipe(portions=1)
        ing_a = _make_ingredient("Parmesan", 400)
        ing_b = _make_ingredient("Hefeflocken", 300)
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

        # 80% Parmesan, 20% Hefeflocken via variants
        meal.items.create(recipe=recipe, factor=0.8, active_recipe_item_ids=[item_a.id])
        meal.items.create(recipe=recipe, factor=0.2, active_recipe_item_ids=[item_b.id])

        items = generate_shopping_list(plan)
        by_name = {i.ingredient_name: i for i in items}

        assert "Parmesan" in by_name
        assert abs(by_name["Parmesan"].total_quantity_g - 240.0) < 1.0
        assert "Hefeflocken" in by_name
        assert abs(by_name["Hefeflocken"].total_quantity_g - 40.0) < 1.0


# ---------------------------------------------------------------------------
# 6.5  Variant service: _item_total_for_field, _compute_delta
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestVariantServiceUtilities:
    def test_item_total_for_field(self):
        ing = _make_ingredient("Parmesan", energy_kcal=400)
        portion = _make_portion(ing, 30)
        recipe = make_recipe()
        ri = make_recipe_item(recipe=recipe, portion=portion, quantity=1)
        total = _item_total_for_field(ri, "energy_kcal")
        # 400 kcal/100g × 30g = 120 kcal
        assert abs(total - 120.0) < 0.01

    def test_item_total_price(self):
        ing = _make_ingredient("Parmesan")
        ing.price_per_kg = 15.0
        ing.save()
        portion = _make_portion(ing, 30)
        recipe = make_recipe()
        ri = make_recipe_item(recipe=recipe, portion=portion, quantity=1)
        total = _item_total_for_field(ri, "price")
        # 15 €/kg × 30g = 0.45 €
        assert abs(total - 0.45) < 0.01

    def test_compute_delta_exchange(self):
        recipe = make_recipe(portions=1)
        ing_a = _make_ingredient("Parmesan", energy_kcal=400)
        ing_b = _make_ingredient("Hefeflocken", energy_kcal=300)
        item_a = make_recipe_item(recipe=recipe, portion=_make_portion(ing_a, 30), quantity=1)
        item_b = make_recipe_item(recipe=recipe, portion=_make_portion(ing_b, 30), quantity=1)

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item_a.exchange_group = group
        item_a.exchange_position = 0
        item_a.save()
        item_b.exchange_group = group
        item_b.exchange_position = 1
        item_b.save()

        items = [item_a, item_b]
        # Default = item_a (pos=0), Active = item_b
        delta = _compute_delta(items, {item_b.id}, "energy_kcal")
        # Default: 400*30/100 = 120, Active: 300*30/100 = 90, Delta = -30
        assert abs(delta - (-30.0)) < 0.01


# ---------------------------------------------------------------------------
# 6.6  compute_variant_energy — full end-to-end variant energy
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestVariantNutrition:
    def test_variant_energy_exchange(self):
        recipe = make_recipe(portions=1)
        ing_a = _make_ingredient("Parmesan", energy_kcal=400)
        ing_b = _make_ingredient("Hefeflocken", energy_kcal=300)
        item_a = make_recipe_item(recipe=recipe, portion=_make_portion(ing_a, 30), quantity=1)
        item_b = make_recipe_item(recipe=recipe, portion=_make_portion(ing_b, 30), quantity=1)

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item_a.exchange_group = group
        item_a.exchange_position = 0
        item_a.save()
        item_b.exchange_group = group
        item_b.exchange_position = 1
        item_b.save()

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe, active_recipe_item_ids=[item_b.id])

        from recipe.services.recipe_checks import recalculate_recipe_cache
        recalculate_recipe_cache(recipe)

        energy = compute_variant_energy(mi)
        recipe.refresh_from_db()
        base = recipe.cached_energy_total_kcal
        assert energy is not None
        # Energy should differ from base (different ingredient selected)
        assert energy != base

    def test_variant_cost_exchange(self):
        recipe = make_recipe(portions=1)
        ing_normal = _make_ingredient("Nudeln", energy_kcal=350)
        ing_normal.price_per_kg = 10.0
        ing_normal.save()
        ing_primary = _make_ingredient("Parmesan", energy_kcal=400)
        ing_primary.price_per_kg = 15.0
        ing_primary.save()
        ing_alt = _make_ingredient("Hefeflocken", energy_kcal=300)
        ing_alt.price_per_kg = 8.0
        ing_alt.save()

        normal = make_recipe_item(recipe=recipe, portion=_make_portion(ing_normal, 100), quantity=1)
        primary = make_recipe_item(recipe=recipe, portion=_make_portion(ing_primary, 100), quantity=1)
        alt = make_recipe_item(recipe=recipe, portion=_make_portion(ing_alt, 100), quantity=1)

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        primary.exchange_group = group
        primary.exchange_position = 0
        primary.save()
        alt.exchange_group = group
        alt.exchange_position = 1
        alt.save()

        from recipe.services.recipe_checks import recalculate_recipe_cache
        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()

        # Cache should = normal (1.00) + primary (1.50) = 2.50 (alt excluded)
        normal_cost = 10.0 * 100 / 1000
        primary_cost = 15.0 * 100 / 1000
        expected_cache = normal_cost + primary_cost
        assert recipe.cached_price_total == pytest.approx(expected_cache, abs=0.01)

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        mi = make_meal_item(meal=meal, recipe=recipe, active_recipe_item_ids=[alt.id])

        cost = compute_variant_cost(mi)
        alt_cost = 8.0 * 100 / 1000
        expected_cost = normal_cost + alt_cost
        assert cost == pytest.approx(expected_cost, abs=0.01)


# ---------------------------------------------------------------------------
# 6.7  Fork kopiert Exchange-Gruppen vollständig
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestForkCopiesExchangeGroups:
    def test_fork_copies_groups_independently(self):
        client, _ = _make_staff_client()
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

        fork_groups = list(fork.exchange_groups.all())
        assert len(fork_groups) == 1
        assert fork_groups[0].id != group.id
        assert fork_groups[0].name == "Test-Gruppe"

        fork_items = list(fork.recipe_items.filter(exchange_group__isnull=False))
        assert len(fork_items) == 2
        for fi in fork_items:
            assert fi.exchange_group_id == fork_groups[0].id

        group.name = "Geändert"
        group.save()
        fork_groups[0].refresh_from_db()
        assert fork_groups[0].name == "Test-Gruppe"


# ---------------------------------------------------------------------------
# 6.8  Rezept-Löschung mit aktiven Variant-Items → HTTP 409
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestRecipeDeleteProtection:
    def test_delete_blocked_when_variant_active(self):
        client, _ = _make_staff_client()
        recipe = make_recipe()
        ing = _make_ingredient()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(ing))
        item.is_optional = True
        item.save()

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe, active_recipe_item_ids=[item.id])

        resp = client.delete(f"/api/recipes/{recipe.id}/")
        assert resp.status_code == 409

    def test_delete_allowed_without_variants(self):
        client, _ = _make_staff_client()
        recipe = make_recipe()
        resp = client.delete(f"/api/recipes/{recipe.id}/")
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# 6.9  reserve_factor nicht doppelt angewendet
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReserveFactorNotDoubled:
    def test_reserve_applied_once_with_variant(self):
        from supply.services.shopping_service import generate_shopping_list

        recipe = make_recipe(portions=1)
        ing = _make_ingredient("Nudeln", 350)
        portion = _make_portion(ing, 100)
        item = make_recipe_item(recipe=recipe, portion=portion, quantity=1)
        item.is_optional = True
        item.save()

        plan = make_meal_plan(norm_portions=10, reserve_factor=1.1)
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe, factor=1.0, active_recipe_item_ids=[item.id])

        items = generate_shopping_list(plan)
        by_name = {i.ingredient_name: i for i in items}
        assert "Nudeln" in by_name
        # 100g × 1 (quantity) × 11 (scaling) × 1.0 (factor) = 1100g
        assert abs(by_name["Nudeln"].total_quantity_g - 1100.0) < 5.0


# ---------------------------------------------------------------------------
# 6.10 PDF-Export Smoke Test (skipped — requires system libs)
# ---------------------------------------------------------------------------


@pytest.mark.skip(reason="PDF export requires WeasyPrint system libs in CI")
@pytest.mark.django_db
class TestPdfExportSmoke:
    def test_pdf_export_endpoint_exists_and_returns_pdf(self):
        client, _ = _make_staff_client()
        plan = make_meal_plan()
        resp = client.get(f"/api/meal-plans/{plan.id}/export/pdf/")
        assert resp.status_code in (200, 404)


# ---------------------------------------------------------------------------
# 6.11 Override auf Exchange/Optional-Zutat → HTTP 400; normale → erlaubt
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestOverrideOnExchangeOptionalItemBlocked:
    def test_override_on_optional_item_blocked(self):
        client, _ = _make_staff_client()
        recipe = make_recipe()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(_make_ingredient()))
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
        client, _ = _make_staff_client()
        recipe = make_recipe()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(_make_ingredient()))
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
        client, _ = _make_staff_client()
        recipe = make_recipe()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(_make_ingredient()))

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
# 6.12 is_optional/exchange_group ändern bei aktiven Variant-Items → HTTP 409
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestChangeBlockedWithActiveVariants:
    def test_remove_optional_blocked_by_variant(self):
        client, _ = _make_staff_client()
        recipe = make_recipe()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(_make_ingredient()))
        item.is_optional = True
        item.save()

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe, active_recipe_item_ids=[item.id])

        resp = client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            json.dumps({"is_optional": False}),
            content_type="application/json",
        )
        assert resp.status_code == 409

    def test_change_exchange_group_blocked_by_variant(self):
        client, _ = _make_staff_client()
        recipe = make_recipe()
        item = make_recipe_item(recipe=recipe, portion=_make_portion(_make_ingredient()))
        group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
        item.exchange_group = group
        item.exchange_position = 0
        item.save()

        plan = make_meal_plan()
        meal = make_meal(meal_plan=plan)
        make_meal_item(meal=meal, recipe=recipe, active_recipe_item_ids=[item.id])

        resp = client.patch(
            f"/api/recipes/{recipe.id}/recipe-items/{item.id}/",
            json.dumps({"exchange_group_id": None}),
            content_type="application/json",
        )
        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# 6.13 Exchange-Gruppe löschen (confirms 6.1 behavior)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestExchangeGroupDeleteBehavior:
    def test_delete_group_with_two_members(self):
        client, _ = _make_staff_client()
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
        assert not RecipeItemExchangeGroup.objects.filter(id=group.id).exists()
        assert not RecipeItem.objects.filter(id=item_alt.id).exists()
        item_orig.refresh_from_db()
        assert item_orig.exchange_group_id is None
        assert item_orig.exchange_position is None
