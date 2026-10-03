"""Tests for GET /api/supply/buffet-catalog/ and the breakfast-catalog adapter."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from content.models import Tag
from planner.tests import make_buffet_roles, make_buffet_template
from recipe.tests import make_recipe, make_recipe_item
from supply.models import IngredientAlias
from supply.tests import make_ingredient, make_retail_section

User = get_user_model()


def _client_with_user(**kwargs):
    user = User.objects.create_user(username=kwargs.pop("username", "u1"), password="x", **kwargs)
    c = Client()
    c.force_login(user)
    return c, user


@pytest.mark.django_db
class TestBuffetCatalogRoleOrder:
    def test_returns_roles_in_template_sort_order(self):
        template = make_buffet_template(
            slug="baguettes",
            roles={
                "buffet-bread": (150, "g", True),
                "buffet-savory": (70, "g", True),
                "buffet-sweet": (20, "g", False),
            },
        )
        client, _ = _client_with_user()
        resp = client.get(f"/api/supply/buffet-catalog/?template={template.slug}")
        assert resp.status_code == 200
        data = resp.json()
        slugs = [r["role"]["slug"] for r in data["roles"]]
        assert slugs == ["buffet-bread", "buffet-savory", "buffet-sweet"]
        enabled = {r["role"]["slug"]: r["enabled_by_default"] for r in data["roles"]}
        assert enabled["buffet-sweet"] is False

    def test_unknown_template_returns_404(self):
        client, _ = _client_with_user()
        resp = client.get("/api/supply/buffet-catalog/?template=does-not-exist")
        assert resp.status_code == 404

    def test_without_template_lists_all_nineteen_roles(self):
        make_buffet_roles()
        client, _ = _client_with_user()
        resp = client.get("/api/supply/buffet-catalog/")
        assert resp.status_code == 200
        assert len(resp.json()["roles"]) == 19


@pytest.mark.django_db
class TestBuffetCatalogVisibility:
    def test_draft_ingredient_hidden_for_non_staff(self):
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        draft = make_ingredient(name="Entwurf", owner=None, status="draft")
        draft.tags.add(bread_tag)

        client, _ = _client_with_user()
        resp = client.get(f"/api/supply/buffet-catalog/?template={template.slug}")
        names = [i["name"] for r in resp.json()["roles"] for i in r["items"]]
        assert "Entwurf" not in names

    def test_anonymous_sees_only_public_items(self):
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        verified = make_ingredient(name="Verifiziert", owner=None, status="verified")
        verified.tags.add(bread_tag)
        draft = make_ingredient(name="Entwurf", owner=None, status="draft")
        draft.tags.add(bread_tag)

        resp = Client().get(f"/api/supply/buffet-catalog/?template={template.slug}")
        names = [i["name"] for r in resp.json()["roles"] for i in r["items"]]
        assert "Verifiziert" in names
        assert "Entwurf" not in names

    def test_default_selected_flag_hidden_when_invisible(self):
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        role = template.roles.get(role__slug="buffet-bread")
        bread_tag = role.role
        staff_draft = make_ingredient(name="Tomaten", owner=None, status="draft")
        staff_draft.tags.add(bread_tag)
        role.default_ingredients.add(staff_draft)

        non_staff_client, _ = _client_with_user(username="non_staff")
        resp = non_staff_client.get(f"/api/supply/buffet-catalog/?template={template.slug}")
        names = [i["name"] for r in resp.json()["roles"] for i in r["items"]]
        assert "Tomaten" not in names

        staff_client, _ = _client_with_user(username="staff", is_staff=True)
        resp2 = staff_client.get(f"/api/supply/buffet-catalog/?template={template.slug}")
        items = [i for r in resp2.json()["roles"] for i in r["items"]]
        tomaten = next(i for i in items if i["name"] == "Tomaten")
        assert tomaten["default_selected"] is True

    def test_no_truncation_of_items(self):
        template = make_buffet_template(roles={"buffet-bread": (100, "g", True)})
        bread_tag = template.roles.get(role__slug="buffet-bread").role
        for i in range(15):
            ing = make_ingredient(name=f"Brot {i}")
            ing.tags.add(bread_tag)

        client, _ = _client_with_user()
        resp = client.get(f"/api/supply/buffet-catalog/?template={template.slug}")
        items = resp.json()["roles"][0]["items"]
        assert len(items) == 15


@pytest.mark.django_db
class TestBuffetCatalogSearch:
    @pytest.fixture(autouse=True)
    def _roles(self, db):
        make_buffet_roles()

    def test_search_matches_umlaut_transliterations_and_aliases(self):
        ingredient = make_ingredient(name="Käse", is_standalone_food=True)
        IngredientAlias.objects.create(ingredient=ingredient, name="Kaese")

        client, _ = _client_with_user()
        response = client.get("/api/supply/buffet-catalog/search/?q=Kaese&role=buffet-cheese&meal_type=snack")

        assert response.status_code == 200
        assert [item["name"] for item in response.json()] == ["Käse"]

    def test_search_ranks_favorites_then_standalone_then_relevant_recipes(self):
        roles = make_buffet_roles()
        favorite = make_ingredient(name="Chips Favorit", is_standalone_food=False)
        favorite.tags.add(roles["buffet-salty-snack"])
        standalone = make_ingredient(name="Chips Snack", is_standalone_food=True)
        recipe = make_recipe(title="Chips Rezept", recipe_type="snack")

        client, _ = _client_with_user()
        response = client.get("/api/supply/buffet-catalog/search/?q=Chips&role=buffet-salty-snack&meal_type=snack")

        assert response.status_code == 200
        items = response.json()
        assert [item["name"] for item in items] == ["Chips Favorit", "Chips Snack", "Chips Rezept"]
        assert items[0]["is_favorite"] is True
        assert items[1]["is_favorite"] is False
        assert items[2]["recipe_type"] == "snack"

    def test_non_standalone_filter_is_off_by_default_and_can_be_expanded(self):
        ingredient = make_ingredient(name="Mehl", is_standalone_food=False)
        client, _ = _client_with_user()

        default_response = client.get("/api/supply/buffet-catalog/search/?q=Mehl&role=buffet-fresh&meal_type=lunch")
        expanded_response = client.get(
            "/api/supply/buffet-catalog/search/?q=Mehl&role=buffet-fresh&meal_type=lunch&include_non_standalone=true"
        )

        assert default_response.status_code == expanded_response.status_code == 200
        assert default_response.json() == []
        assert [item["id"] for item in expanded_response.json()] == [ingredient.id]

    def test_alcohol_filter_is_opt_in_and_alcohol_is_never_a_favorite(self):
        roles = make_buffet_roles()
        alcohol_section = make_retail_section(name="Alkoholische Getränke")
        beer = make_ingredient(
            name="Bier",
            retail_section=alcohol_section,
            is_standalone_food=True,
        )
        beer.tags.add(roles["buffet-drink"])
        client, _ = _client_with_user()

        default_response = client.get("/api/supply/buffet-catalog/search/?q=Bier&role=buffet-drink&meal_type=drinks")
        filtered_response = client.get(
            "/api/supply/buffet-catalog/search/?q=Bier&role=buffet-drink&meal_type=drinks&exclude_alcohol=true"
        )
        drink_template = make_buffet_template(roles={"buffet-drink": (300, "ml", True)})
        role_catalog = client.get(f"/api/supply/buffet-catalog/?template={drink_template.slug}")

        assert default_response.status_code == filtered_response.status_code == role_catalog.status_code == 200
        assert default_response.json()[0]["id"] == beer.id
        assert default_response.json()[0]["is_favorite"] is False
        assert filtered_response.json() == []
        assert all(item["name"] != "Bier" for role in role_catalog.json()["roles"] for item in role["items"])

    def test_exclude_alcohol_filters_recipes_containing_alcohol(self):
        alcohol_section = make_retail_section(name="Alkoholische Getränke")
        beer = make_ingredient(name="Bier", retail_section=alcohol_section, is_standalone_food=True)
        recipe = make_recipe(title="Biersauce", recipe_type="warm_meal")
        make_recipe_item(recipe=recipe, ingredient=beer)
        client, _ = _client_with_user()

        response = client.get(
            "/api/supply/buffet-catalog/search/?q=Biersauce&role=buffet-dish&meal_type=dinner&kind=recipe&exclude_alcohol=true"
        )

        assert response.status_code == 200
        assert response.json() == []

    def test_search_filters_kind_and_recipe_type_and_rejects_short_queries(self):
        make_ingredient(name="Tee Zutat", is_standalone_food=True)
        make_recipe(title="Tee Rezept", recipe_type="drink")
        make_recipe(title="Tee Snack", recipe_type="snack")
        client, _ = _client_with_user()

        response = client.get(
            "/api/supply/buffet-catalog/search/?q=Tee&role=buffet-drink&meal_type=drinks&kind=recipe&recipe_type=drink"
        )
        short_response = client.get("/api/supply/buffet-catalog/search/?q=T&role=buffet-drink&meal_type=drinks")

        assert response.status_code == short_response.status_code == 200
        assert [item["name"] for item in response.json()] == ["Tee Rezept"]
        assert short_response.json() == []

    def test_search_does_not_expose_another_users_private_ingredient(self):
        other_user = User.objects.create_user(username="private-search-owner", password="x")
        make_ingredient(name="Private Cocktailtomaten", owner=other_user, visibility="private", is_standalone_food=True)

        response = Client().get(
            "/api/supply/buffet-catalog/search/?q=Cocktailtomaten&role=buffet-fresh&meal_type=snack"
        )

        assert response.status_code == 200
        assert response.json() == []


@pytest.mark.django_db
class TestBreakfastCatalogAdapter:
    """The old 6-step wizard gets its data via the buffet catalog now."""

    def test_adapter_returns_unchanged_shape(self):
        roles = make_buffet_roles()
        bread = make_ingredient(name="Toast")
        bread.tags.add(roles["buffet-bread"])
        cereal = make_ingredient(name="Haferflocken")
        cereal.tags.add(roles["buffet-cereal"])
        legacy_base_tag, _ = Tag.objects.get_or_create(slug="breakfast-base", defaults={"name": "Breakfast base"})
        legacy_cereal = make_ingredient(name="Altes Müsli")
        legacy_cereal.tags.add(legacy_base_tag)
        cheese = make_ingredient(name="Edamer")
        cheese.tags.add(roles["buffet-cheese"])
        savory = make_ingredient(name="Gouda")
        savory.tags.add(roles["buffet-savory"])
        sweet = make_ingredient(name="Nutella")
        sweet.tags.add(roles["buffet-sweet"])
        legacy_topping_tag, _ = Tag.objects.get_or_create(
            slug="breakfast-topping", defaults={"name": "Breakfast topping"}
        )
        legacy_topping = make_ingredient(name="Alter Honig")
        legacy_topping.tags.add(legacy_topping_tag)
        fat = make_ingredient(name="Butter")
        fat.tags.add(roles["buffet-fat"])
        fresh = make_ingredient(name="Apfel")
        fresh.tags.add(roles["buffet-fresh"])
        drink_ing = make_ingredient(name="Milch")
        drink_ing.tags.add(roles["buffet-drink"])
        coffee = make_recipe(title="Kaffee", recipe_type="drink", status="approved")
        coffee.tags.add(roles["buffet-drink"])
        eggs = make_recipe(title="Rührei", recipe_type="breakfast", status="approved")
        eggs.tags.add(roles["buffet-dish"])

        client, _ = _client_with_user()
        resp = client.get("/api/supply/breakfast-catalog/")
        assert resp.status_code == 200
        data = resp.json()
        assert {i["name"] for i in data["base_ingredients"]} == {"Toast", "Haferflocken", "Altes Müsli"}
        topping_names = {i["name"] for i in data["topping_ingredients"]}
        assert topping_names == {"Edamer", "Gouda", "Nutella", "Alter Honig"}
        assert {i["name"] for i in data["fat_ingredients"]} == {"Butter"}
        assert {i["name"] for i in data["extra_ingredients"]} == {"Apfel"}
        assert {i["name"] for i in data["drink_ingredients"]} == {"Milch"}
        assert {r["title"] for r in data["drink_recipes"]} == {"Kaffee"}
        assert {r["title"] for r in data["warm_meal_recipes"]} == {"Rührei"}
