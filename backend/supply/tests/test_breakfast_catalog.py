"""Tests for breakfast catalog and leftovers endpoints."""

import json
import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from content.models import Tag
from recipe.models import Recipe
from supply.models import Ingredient, MeasuringUnit, Portion
from supply.tests import make_ingredient, make_portion

User = get_user_model()


def _client_with_user():
    user = baker.make(User)
    c = Client()
    c.force_login(user)
    return c


def _g_unit() -> MeasuringUnit:
    unit, _ = MeasuringUnit.objects.get_or_create(
        name="g", defaults={"quantity": 1.0, "unit": "g"}
    )
    return unit


def _make_tag(slug: str) -> Tag:
    tag, _ = Tag.objects.get_or_create(slug=slug, defaults={"name": slug})
    return tag


# ============================================================================
# Breakfast Catalog
# ============================================================================


@pytest.mark.django_db
class TestBreakfastCatalog:
    def test_catalog_returns_200(self):
        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/")
        assert r.status_code == 200

    def test_catalog_structure(self):
        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/")
        data = r.json()
        assert "base_ingredients" in data
        assert "topping_ingredients" in data
        assert "drink_ingredients" in data
        assert "drink_recipes" in data
        assert "warm_meal_recipes" in data

    def test_catalog_base_ingredients_tagged(self):
        tag = _make_tag("breakfast-base")
        ing = make_ingredient(name="Bauernbrot", is_standalone_food=True)
        ing.tags.add(tag)

        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/")
        ids = [i["id"] for i in r.json()["base_ingredients"]]
        assert ing.id in ids

    def test_catalog_base_excludes_untagged(self):
        untagged = make_ingredient(name="Zufällige Zutat", is_standalone_food=True)

        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/")
        ids = [i["id"] for i in r.json()["base_ingredients"]]
        assert untagged.id not in ids

    def test_catalog_topping_includes_portions(self):
        tag = _make_tag("breakfast-topping")
        g_unit = _g_unit()
        ing = make_ingredient(name="Nutella-Test", is_standalone_food=True, price_per_kg=8.0)
        ing.tags.add(tag)
        make_portion(ingredient=ing, name="Belag normal", measuring_unit=g_unit, weight_g=20.0, is_default=True)
        make_portion(ingredient=ing, name="Packung (450g)", measuring_unit=g_unit, weight_g=450.0)

        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/")
        toppings = r.json()["topping_ingredients"]
        match = next((t for t in toppings if t["id"] == ing.id), None)
        assert match is not None
        portion_names = [p["name"] for p in match["portions"]]
        assert "Belag normal" in portion_names
        assert "Packung (450g)" in portion_names
        assert match["price_per_kg"] == pytest.approx(8.0)

    def test_catalog_includes_drink_ingredients(self):
        tag = _make_tag("breakfast-drink")
        ing = make_ingredient(name="Milch", is_standalone_food=True)
        ing.tags.add(tag)

        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/")
        drink_ings = r.json()["drink_ingredients"]
        names = [d["name"] for d in drink_ings]
        assert "Milch" in names

    def test_catalog_includes_drink_recipes(self):
        tag = _make_tag("breakfast-drink")
        coffee = baker.make(Recipe, title="Kaffee", recipe_type="drink", status="approved")
        coffee.tags.add(tag)

        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/")
        drinks = r.json()["drink_recipes"]
        titles = [d["title"] for d in drinks]
        assert "Kaffee" in titles

    def test_catalog_includes_warm_meals(self):
        tag = _make_tag("breakfast-warm-meal")
        eggs = baker.make(Recipe, title="Rührei", recipe_type="breakfast", status="approved")
        eggs.tags.add(tag)

        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/")
        warm = r.json()["warm_meal_recipes"]
        titles = [d["title"] for d in warm]
        assert "Rührei" in titles

    def test_catalog_requires_no_auth(self):
        """Catalog is public."""
        r = Client().get("/api/supply/breakfast-catalog/")
        assert r.status_code in (200, 403)


# ============================================================================
# Breakfast Drinks
# ============================================================================


@pytest.mark.django_db
class TestBreakfastDrinks:
    def test_drinks_endpoint_returns_tagged_drinks(self):
        tag = _make_tag("breakfast-drink")
        coffee = baker.make(Recipe, title="Kaffee", recipe_type="drink", status="approved")
        coffee.tags.add(tag)
        cocoa = baker.make(Recipe, title="Kakao", recipe_type="drink", status="approved")
        cocoa.tags.add(tag)

        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/drinks/")
        assert r.status_code == 200
        titles = [d["title"] for d in r.json()]
        assert "Kaffee" in titles
        assert "Kakao" in titles

    def test_drinks_excludes_untagged_drinks(self):
        tag = _make_tag("breakfast-drink")
        tagged = baker.make(Recipe, title="Kaffee", recipe_type="drink", status="approved")
        tagged.tags.add(tag)
        untagged = baker.make(Recipe, title="Energy Drink", recipe_type="drink", status="approved")

        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/drinks/")
        titles = [d["title"] for d in r.json()]
        assert "Kaffee" in titles
        assert "Energy Drink" not in titles

    def test_drinks_excludes_non_drink_recipes(self):
        tag = _make_tag("breakfast-drink")
        drink = baker.make(Recipe, title="Kaffee", recipe_type="drink", status="approved")
        drink.tags.add(tag)
        breakfast = baker.make(Recipe, title="Porridge", recipe_type="breakfast", status="approved")
        breakfast.tags.add(tag)

        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/drinks/")
        titles = [d["title"] for d in r.json()]
        assert "Kaffee" in titles
        assert "Porridge" not in titles

    def test_drinks_fallback_all_when_tag_missing(self):
        coffee = baker.make(Recipe, title="Kaffee", recipe_type="drink", status="approved")
        tea = baker.make(Recipe, title="Tee", recipe_type="drink", status="approved")

        c = _client_with_user()
        r = c.get("/api/supply/breakfast-catalog/drinks/")
        titles = [d["title"] for d in r.json()]
        assert "Kaffee" in titles
        assert "Tee" in titles

    def test_drinks_returns_no_auth(self):
        """Drinks endpoint is public."""
        r = Client().get("/api/supply/breakfast-catalog/drinks/")
        assert r.status_code in (200, 403)


# ============================================================================
# Breakfast Leftovers
# ============================================================================


@pytest.mark.django_db
class TestBreakfastLeftovers:
    def test_leftovers_basic(self):
        """Simple leftovers: 20g/person × 10 persons × 1 day, Packung 450g."""
        g_unit = _g_unit()
        ing = make_ingredient(name="Marmelade", is_standalone_food=True, price_per_kg=5.0)
        make_portion(ingredient=ing, name="Packung (500g)", measuring_unit=g_unit, weight_g=500.0)

        payload = {
            "toppings": [{"ingredient_id": ing.id, "grams_per_person": 20.0}],
            "norm_portions": 10,
            "days": 1,
        }
        c = _client_with_user()
        r = c.post(
            "/api/supply/breakfast-leftovers/",
            json.dumps(payload),
            content_type="application/json",
        )
        assert r.status_code == 200
        data = r.json()
        result = data["toppings"][0]
        assert result["ingredient_id"] == ing.id
        assert result["total_needed_g"] == pytest.approx(200.0)
        assert result["packages_needed"] == 1
        assert result["leftover_g"] == pytest.approx(300.0)
        assert result["leftover_eur"] == pytest.approx(1.50)

    def test_leftovers_rounding_up(self):
        g_unit = _g_unit()
        ing = make_ingredient(name="Nutella", is_standalone_food=True, price_per_kg=8.0)
        make_portion(ingredient=ing, name="Packung (450g)", measuring_unit=g_unit, weight_g=450.0)

        payload = {
            "toppings": [{"ingredient_id": ing.id, "grams_per_person": 20.0}],
            "norm_portions": 35,
            "days": 1,
        }
        c = _client_with_user()
        r = c.post(
            "/api/supply/breakfast-leftovers/",
            json.dumps(payload),
            content_type="application/json",
        )
        data = r.json()["toppings"][0]
        assert data["packages_needed"] == 2
        assert data["leftover_g"] == pytest.approx(200.0)

    def test_leftovers_multi_day(self):
        g_unit = _g_unit()
        ing = make_ingredient(name="Butter", is_standalone_food=True, price_per_kg=15.0)
        make_portion(ingredient=ing, name="Packung (250g)", measuring_unit=g_unit, weight_g=250.0)

        payload = {
            "toppings": [{"ingredient_id": ing.id, "grams_per_person": 10.0}],
            "norm_portions": 5,
            "days": 4,
        }
        c = _client_with_user()
        r = c.post(
            "/api/supply/breakfast-leftovers/",
            json.dumps(payload),
            content_type="application/json",
        )
        data = r.json()["toppings"][0]
        assert data["total_needed_g"] == pytest.approx(200.0)
        assert data["packages_needed"] == 1

    def test_leftovers_no_package_portion(self):
        ing = make_ingredient(name="Honig", is_standalone_food=True, price_per_kg=12.0)

        payload = {
            "toppings": [{"ingredient_id": ing.id, "grams_per_person": 15.0}],
            "norm_portions": 10,
            "days": 1,
        }
        c = _client_with_user()
        r = c.post(
            "/api/supply/breakfast-leftovers/",
            json.dumps(payload),
            content_type="application/json",
        )
        data = r.json()["toppings"][0]
        assert data["total_needed_g"] == pytest.approx(150.0)
        assert data["packages_needed"] is None
        assert data["leftover_g"] is None

    def test_leftovers_multiple_toppings(self):
        g_unit = _g_unit()
        ing1 = make_ingredient(name="Käse", is_standalone_food=True, price_per_kg=12.0)
        ing2 = make_ingredient(name="Wurst", is_standalone_food=True, price_per_kg=8.0)
        make_portion(ingredient=ing1, name="Packung (200g)", measuring_unit=g_unit, weight_g=200.0)
        make_portion(ingredient=ing2, name="Packung (250g)", measuring_unit=g_unit, weight_g=250.0)

        payload = {
            "toppings": [
                {"ingredient_id": ing1.id, "grams_per_person": 25.0},
                {"ingredient_id": ing2.id, "grams_per_person": 30.0},
            ],
            "norm_portions": 8,
            "days": 1,
        }
        c = _client_with_user()
        r = c.post(
            "/api/supply/breakfast-leftovers/",
            json.dumps(payload),
            content_type="application/json",
        )
        data = r.json()["toppings"]
        assert len(data) == 2
        ids = {d["ingredient_id"] for d in data}
        assert ing1.id in ids
        assert ing2.id in ids
