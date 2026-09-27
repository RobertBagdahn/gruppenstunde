"""Tests for GET /api/supply/buffet-catalog/ and the breakfast-catalog adapter."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from planner.tests import make_buffet_roles, make_buffet_template
from recipe.tests import make_recipe
from supply.tests import make_ingredient

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

    def test_without_template_lists_all_nine_roles(self):
        make_buffet_roles()
        client, _ = _client_with_user()
        resp = client.get("/api/supply/buffet-catalog/")
        assert resp.status_code == 200
        assert len(resp.json()["roles"]) == 9


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
class TestBreakfastCatalogAdapter:
    """The old 6-step wizard gets its data via the buffet catalog now."""

    def test_adapter_returns_unchanged_shape(self):
        roles = make_buffet_roles()
        bread = make_ingredient(name="Toast")
        bread.tags.add(roles["buffet-bread"])
        savory = make_ingredient(name="Gouda")
        savory.tags.add(roles["buffet-savory"])
        sweet = make_ingredient(name="Nutella")
        sweet.tags.add(roles["buffet-sweet"])
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
        assert {i["name"] for i in data["base_ingredients"]} == {"Toast"}
        topping_names = {i["name"] for i in data["topping_ingredients"]}
        assert topping_names == {"Gouda", "Nutella"}
        assert {i["name"] for i in data["fat_ingredients"]} == {"Butter"}
        assert {i["name"] for i in data["extra_ingredients"]} == {"Apfel"}
        assert {i["name"] for i in data["drink_ingredients"]} == {"Milch"}
        assert {r["title"] for r in data["drink_recipes"]} == {"Kaffee"}
        assert {r["title"] for r in data["warm_meal_recipes"]} == {"Rührei"}
