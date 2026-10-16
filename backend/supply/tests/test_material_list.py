"""Material list, shopping list consumables, recipe cost and material filter."""

import json
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.contrib.contenttypes.models import ContentType
from django.test import Client

from planner.tests import make_meal, make_meal_item, make_meal_plan
from recipe.models import Recipe
from recipe.tests import make_recipe
from supply.models import ContentMaterialItem, Material
from supply.services.material_aggregation import aggregate_materials, scaled_amount


def _link(recipe: Recipe, material: Material, amount: float = 1, mode: str = "total") -> ContentMaterialItem:
    ct = ContentType.objects.get_for_model(Recipe, for_concrete_model=False)
    return ContentMaterialItem.objects.create(
        content_type=ct, object_id=recipe.pk, material=material, amount=amount, quantity_mode=mode
    )


@pytest.fixture
def plate(db):
    return Material.objects.create(
        name="Pappteller", is_consumable=True, package_size=50, price_per_package=Decimal("3.00")
    )


@pytest.fixture
def toothpick(db):
    return Material.objects.create(name="Zahnstocher", is_consumable=True)


@pytest.fixture
def pot(db):
    return Material.objects.create(name="Topf", is_consumable=False)


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(username="matuser", email="m@example.com", password="x")


@pytest.fixture
def client(user):
    c = Client()
    c.force_login(user)
    return c


@pytest.mark.django_db
class TestAggregation:
    def test_per_portion_scales_and_total_is_fixed(self, plate, toothpick):
        recipe = make_recipe(title="Spieße")
        _link(recipe, plate, 1, "per_portion")
        _link(recipe, toothpick, 30, "total")
        result = aggregate_materials([(recipe, 8)])
        amounts = {r.material.name: r.amount for r in result.consumables}
        assert amounts == {"Pappteller": 8, "Zahnstocher": 30}

    def test_consumables_sum_devices_take_maximum(self, plate, pot):
        a, b = make_recipe(title="A"), make_recipe(title="B")
        for recipe in (a, b):
            _link(recipe, plate, 20, "total")
            _link(recipe, pot, 1, "total")
        result = aggregate_materials([(a, 4), (b, 4)])
        assert result.consumables[0].amount == 40
        assert result.devices[0].amount == 1
        assert {r.title for r in result.devices[0].recipes} == {"A", "B"}

    def test_fractional_amounts_round_up_without_float_noise(self, plate):
        recipe = make_recipe(title="R")
        link = _link(recipe, plate, 0.1, "per_portion")
        assert scaled_amount(link, 30) == 3
        assert scaled_amount(link, 31) == 4

    def test_zero_servings_ignored(self, plate):
        recipe = make_recipe(title="R")
        _link(recipe, plate, 1, "per_portion")
        assert aggregate_materials([(recipe, 0)]).is_empty

    def test_cost_uses_piece_price(self, plate):
        recipe = make_recipe(title="R")
        _link(recipe, plate, 1, "per_portion")
        result = aggregate_materials([(recipe, 10)])
        assert result.consumables[0].cost == pytest.approx(0.6)
        assert result.total_cost == pytest.approx(0.6)


@pytest.mark.django_db
class TestMaterialListEndpoints:
    def test_recipe_material_list(self, client, plate, pot):
        recipe = make_recipe(title="Eintopf")
        _link(recipe, plate, 1, "per_portion")
        _link(recipe, pot, 1)
        data = client.get(f"/api/recipes/{recipe.id}/material-list/?servings=8").json()
        assert data["consumables"][0]["amount"] == 8
        assert data["devices"][0]["name"] == "Topf"
        assert data["devices"][0]["amount"] == 1

    def test_recipe_material_list_rejects_zero_servings(self, client):
        recipe = make_recipe(title="Eintopf")
        assert client.get(f"/api/recipes/{recipe.id}/material-list/?servings=0").status_code == 422

    def test_plan_material_list_sums_over_meals(self, client, user, plate, pot):
        plan = make_meal_plan(created_by=user, norm_portions=10)
        recipe = make_recipe(title="Eintopf")
        _link(recipe, plate, 1, "per_portion")
        _link(recipe, pot, 1)
        for meal_type in ("lunch", "dinner"):
            make_meal_item(meal=make_meal(meal_plan=plan, meal_type=meal_type), recipe=recipe)
        data = client.get(f"/api/meal-plans/{plan.id}/material-list/").json()
        assert data["consumables"][0]["amount"] == 20
        assert data["devices"][0]["amount"] == 1

    def test_soft_deleted_material_is_hidden_in_recipe_and_plan(self, client, user, plate, pot):
        plan = make_meal_plan(created_by=user, norm_portions=10)
        recipe = make_recipe(title="Eintopf")
        _link(recipe, plate, 1, "per_portion")
        _link(recipe, pot, 1)
        make_meal_item(meal=make_meal(meal_plan=plan, meal_type="lunch"), recipe=recipe)
        plate.soft_delete()
        plan_data = client.get(f"/api/meal-plans/{plan.id}/material-list/").json()
        assert [m["name"] for m in plan_data["devices"]] == ["Topf"]
        assert plan_data["consumables"] == []
        recipe_data = client.get(f"/api/recipes/{recipe.id}/material-list/?servings=10").json()
        assert [m["name"] for m in recipe_data["devices"]] == ["Topf"]
        assert recipe_data["consumables"] == []

    def test_plan_material_list_forbidden_for_strangers(self, plate, django_user_model):
        owner = django_user_model.objects.create_user(username="own", email="o@example.com", password="x")
        stranger = Client()
        stranger.force_login(django_user_model.objects.create_user(username="st", email="s@example.com", password="x"))
        plan = make_meal_plan(created_by=owner)
        assert stranger.get(f"/api/meal-plans/{plan.id}/material-list/").status_code in (403, 404)

    def test_empty_plan_list(self, client, user):
        plan = make_meal_plan(created_by=user)
        data = client.get(f"/api/meal-plans/{plan.id}/material-list/").json()
        assert data["devices"] == [] and data["consumables"] == []


@pytest.mark.django_db
class TestShoppingListConsumables:
    def _recipe(self, plate, pot):
        recipe = make_recipe(title="Eintopf")
        _link(recipe, plate, 1, "per_portion")
        _link(recipe, pot, 1)
        return recipe

    def test_from_recipe_includes_consumables_by_default(self, client, plate, pot):
        recipe = self._recipe(plate, pot)
        res = client.post(
            f"/api/shopping-lists/from-recipe/{recipe.id}/",
            data=json.dumps({"portions": 8}),
            content_type="application/json",
        )
        assert res.status_code == 200, res.content
        items = res.json()["items"]
        assert [(i["name"], i["quantity"], i["unit"], i["is_material"]) for i in items] == [
            ("Pappteller", 8.0, "Stück", True)
        ]
        assert items[0]["sources"][0]["recipe_id"] == recipe.id

    def test_from_recipe_opt_out(self, client, plate, pot):
        recipe = self._recipe(plate, pot)
        res = client.post(
            f"/api/shopping-lists/from-recipe/{recipe.id}/",
            data=json.dumps({"portions": 8, "include_consumables": False}),
            content_type="application/json",
        )
        assert res.json()["items"] == []

    def test_from_meal_plan_default_and_opt_out(self, client, user, plate, pot):
        plan = make_meal_plan(created_by=user, norm_portions=10)
        make_meal_item(meal=make_meal(meal_plan=plan), recipe=self._recipe(plate, pot))
        default = client.post(f"/api/shopping-lists/from-meal-plan/{plan.id}/").json()
        assert [i["name"] for i in default["items"] if i["is_material"]] == ["Pappteller"]
        opted_out = client.post(f"/api/shopping-lists/from-meal-plan/{plan.id}/?include_consumables=false").json()
        assert not [i for i in opted_out["items"] if i["is_material"]]

    def test_list_material_list_uses_source(self, client, plate, pot):
        recipe = self._recipe(plate, pot)
        created = client.post(
            f"/api/shopping-lists/from-recipe/{recipe.id}/",
            data=json.dumps({"portions": 6}),
            content_type="application/json",
        ).json()
        data = client.get(f"/api/shopping-lists/{created['id']}/material-list/").json()
        assert data["consumables"][0]["amount"] == 6
        assert data["devices"][0]["name"] == "Topf"

    def test_manual_list_has_empty_material_list(self, client):
        created = client.post(
            "/api/shopping-lists/", data=json.dumps({"name": "Frei"}), content_type="application/json"
        ).json()
        data = client.get(f"/api/shopping-lists/{created['id']}/material-list/").json()
        assert data["devices"] == [] and data["consumables"] == []


@pytest.mark.django_db
class TestRecipeCostAndFilter:
    def test_per_portion_consumable_cost_in_cached_price(self, plate):
        recipe = make_recipe(title="Teller")
        _link(recipe, plate, 2, "per_portion")
        recipe.refresh_from_db()
        assert float(recipe.cached_price_total) == pytest.approx(0.12)

    def test_material_without_price_adds_no_cost(self, toothpick):
        recipe = make_recipe(title="Spieße")
        _link(recipe, toothpick, 2, "per_portion")
        recipe.refresh_from_db()
        assert recipe.cached_price_total is None

    def test_price_change_recalculates_recipe(self, plate):
        recipe = make_recipe(title="Teller")
        _link(recipe, plate, 1, "per_portion")
        plate.price_per_package = Decimal("5.00")
        plate.save()
        recipe.refresh_from_db()
        assert float(recipe.cached_price_total) == pytest.approx(0.1)

    def test_filter_with_and_without_material(self, client, pot):
        with_pot = make_recipe(title="Mit Topf", status="approved", visibility="public")
        without = make_recipe(title="Ohne Topf", status="approved", visibility="public")
        _link(with_pot, pot)
        ids_with = {r["id"] for r in client.get(f"/api/recipes/?material_slug={pot.slug}").json()["items"]}
        ids_without = {r["id"] for r in client.get(f"/api/recipes/?exclude_material_slug={pot.slug}").json()["items"]}
        assert with_pot.id in ids_with and without.id not in ids_with
        assert without.id in ids_without and with_pot.id not in ids_without
