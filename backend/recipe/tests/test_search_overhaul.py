"""Tests for recipe search overhaul: filters, sorting, verification."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from content.choices import ContentStatus
from recipe.models import Recipe, Rule
from recipe.tests import make_recipe, make_recipe_item, make_rule

User = get_user_model()


@pytest.fixture
def user(db):
    return User.objects.create_user(username="testuser", password="testpass")


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username="staffuser", password="testpass", is_staff=True
    )


@pytest.fixture
def api_client():
    return Client()


@pytest.fixture
def verified_recipe(db):
    return make_recipe(
        title="Verified Pancakes",
        status=ContentStatus.APPROVED,
        owner=None,
        usage_count=5,
    )


@pytest.fixture
def community_recipe(db, user):
    return make_recipe(
        title="Community Waffles",
        status=ContentStatus.APPROVED,
        owner=user,
        visibility="public",
        usage_count=3,
    )


@pytest.fixture
def draft_recipe(db, user):
    return make_recipe(
        title="Draft Omelette",
        status=ContentStatus.DRAFT,
        owner=user,
        visibility="private",
        usage_count=0,
    )


@pytest.fixture
def another_verified_recipe(db):
    return make_recipe(
        title="Another Verified",
        status=ContentStatus.APPROVED,
        owner=None,
        usage_count=10,
    )


# ---------------------------------------------------------------------------
# list_recipes: default origin
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestListRecipesDefaultOrigin:
    def test_default_only_verified(self, api_client, verified_recipe, community_recipe):
        resp = api_client.get("/api/recipes/?page_size=50")
        assert resp.status_code == 200
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert "Verified Pancakes" in titles
        assert "Community Waffles" not in titles

    def test_origin_verified_plus_community(
        self, api_client, verified_recipe, community_recipe
    ):
        resp = api_client.get(
            "/api/recipes/?origin=verified&origin=community&page_size=50"
        )
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert "Verified Pancakes" in titles
        assert "Community Waffles" in titles

    def test_origin_mine_shows_drafts(
        self, api_client, user, draft_recipe, community_recipe
    ):
        api_client.force_login(user)
        resp = api_client.get("/api/recipes/?origin=mine&page_size=50")
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert "Draft Omelette" in titles
        # community_recipe also owned by user, so it appears in mine too
        assert "Community Waffles" in titles

    def test_no_origin_param_defaults_to_verified(
        self, api_client, verified_recipe, community_recipe
    ):
        resp = api_client.get("/api/recipes/")
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert "Verified Pancakes" in titles


# ---------------------------------------------------------------------------
# list_recipes: multi-value filters
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestListRecipesMultiValueFilters:
    def test_difficulty_list(self, api_client):
        r1 = make_recipe(
            title="Easy Recipe",
            status=ContentStatus.APPROVED,
            owner=None,
            difficulty="easy",
        )
        r2 = make_recipe(
            title="Medium Recipe",
            status=ContentStatus.APPROVED,
            owner=None,
            difficulty="medium",
        )
        resp = api_client.get("/api/recipes/?difficulty=easy&difficulty=medium&page_size=50")
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert "Easy Recipe" in titles
        assert "Medium Recipe" in titles

    def test_recipe_type_list(self, api_client):
        r1 = make_recipe(
            title="Breakfast Bowl",
            status=ContentStatus.APPROVED,
            owner=None,
            recipe_type="breakfast",
        )
        r2 = make_recipe(
            title="Warm Dinner",
            status=ContentStatus.APPROVED,
            owner=None,
            recipe_type="warm_meal",
        )
        resp = api_client.get(
            "/api/recipes/?recipe_type=breakfast&recipe_type=warm_meal&page_size=50"
        )
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert "Breakfast Bowl" in titles
        assert "Warm Dinner" in titles

    def test_execution_time_list(self, api_client):
        r1 = make_recipe(
            title="Quick Snack",
            status=ContentStatus.APPROVED,
            owner=None,
            execution_time="less_30",
        )
        r2 = make_recipe(
            title="Slow Cook",
            status=ContentStatus.APPROVED,
            owner=None,
            execution_time="60_90",
        )
        resp = api_client.get(
            "/api/recipes/?execution_time=less_30&execution_time=60_90&page_size=50"
        )
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert "Quick Snack" in titles
        assert "Slow Cook" in titles

    def test_preparation_method_list(self, api_client):
        r1 = make_recipe(
            title="Baked Bread",
            status=ContentStatus.APPROVED,
            owner=None,
            preparation_method="baking",
        )
        r2 = make_recipe(
            title="Fried Rice",
            status=ContentStatus.APPROVED,
            owner=None,
            preparation_method="frying",
        )
        resp = api_client.get(
            "/api/recipes/?preparation_method=baking&preparation_method=frying&page_size=50"
        )
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert "Baked Bread" in titles
        assert "Fried Rice" in titles


# ---------------------------------------------------------------------------
# list_recipes: use_count sorting
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestListRecipesSortByUseCount:
    def test_default_sort_is_use_count(
        self, api_client, verified_recipe, another_verified_recipe
    ):
        resp = api_client.get("/api/recipes/?page_size=50")
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert titles[0] == "Another Verified"  # usage_count=10
        assert titles[1] == "Verified Pancakes"  # usage_count=5

    def test_use_count_sort_explicit(self, api_client, verified_recipe, another_verified_recipe):
        resp = api_client.get("/api/recipes/?sort=use_count&page_size=50")
        data = resp.json()
        titles = [item["title"] for item in data["items"]]
        assert titles[0] == "Another Verified"


# ---------------------------------------------------------------------------
# Verification endpoints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestVerifyRecipe:
    def test_staff_can_verify(self, api_client, staff_user, verified_recipe):
        verified_recipe.status = "submitted"
        verified_recipe.description = "A great recipe"
        verified_recipe.save()
        make_recipe_item(recipe=verified_recipe)
        api_client.force_login(staff_user)
        resp = api_client.post(
            f"/api/recipes/{verified_recipe.id}/verify/",
            data={"confirm": True},
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["missing_fields"] != []  # image is still missing, steps too

        verified_recipe.refresh_from_db()
        assert verified_recipe.status == "approved"

    def test_staff_verify_with_warnings(self, api_client, staff_user, verified_recipe):
        verified_recipe.status = "submitted"
        verified_recipe.description = ""  # missing description
        verified_recipe.save()
        api_client.force_login(staff_user)
        resp = api_client.post(
            f"/api/recipes/{verified_recipe.id}/verify/",
            data={"confirm": True},
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["warnings"]) > 0

        verified_recipe.refresh_from_db()
        assert verified_recipe.status == "approved"  # still approved despite warnings

    def test_non_staff_cannot_verify(self, api_client, user, verified_recipe):
        api_client.force_login(user)
        resp = api_client.post(
            f"/api/recipes/{verified_recipe.id}/verify/",
            data={"confirm": True},
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_anonymous_cannot_verify(self, api_client, verified_recipe):
        resp = api_client.post(
            f"/api/recipes/{verified_recipe.id}/verify/",
            data={"confirm": True},
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_verify_nonexistent_recipe(self, api_client, staff_user):
        api_client.force_login(staff_user)
        resp = api_client.post(
            "/api/recipes/99999/verify/",
            data={"confirm": True},
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_preview_without_confirm(self, api_client, staff_user, verified_recipe):
        verified_recipe.status = "submitted"
        verified_recipe.save()
        api_client.force_login(staff_user)
        resp = api_client.post(
            f"/api/recipes/{verified_recipe.id}/verify/",
            data={"confirm": False},
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "can_verify" in data
        assert "warnings" in data

        verified_recipe.refresh_from_db()
        assert verified_recipe.status == "submitted"  # unchanged


@pytest.mark.django_db
class TestVerificationStatus:
    def test_get_status(self, api_client, verified_recipe):
        verified_recipe.description = "Full recipe"
        verified_recipe.save()
        resp = api_client.get(
            f"/api/recipes/{verified_recipe.id}/verification-status/"
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "can_verify" in data
        assert "rules_passed" in data
        assert "rules_total" in data
        assert "warnings" in data
        assert "missing_fields" in data

    def test_status_shows_missing_fields(self, api_client, verified_recipe):
        verified_recipe.description = ""
        verified_recipe.save()
        resp = api_client.get(
            f"/api/recipes/{verified_recipe.id}/verification-status/"
        )
        data = resp.json()
        assert len(data["missing_fields"]) > 0


# ---------------------------------------------------------------------------
# Verification service unit tests
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestVerificationService:
    def test_check_readiness_all_good(self, verified_recipe):
        verified_recipe.description = "A full description"
        verified_recipe.save()
        from recipe.services.verification_service import check_verification_readiness

        make_recipe_item(recipe=verified_recipe)
        result = check_verification_readiness(verified_recipe)
        assert "Bild fehlt" in result.missing_fields
        assert result.rules_total > 0

    def test_check_readiness_missing_image(self, verified_recipe):
        verified_recipe.description = "Has desc"
        verified_recipe.image = None
        verified_recipe.save()
        from recipe.services.verification_service import check_verification_readiness

        result = check_verification_readiness(verified_recipe)
        assert result.missing_fields

    def test_rule_evaluation_included(self, verified_recipe):
        verified_recipe.description = "A full recipe"
        verified_recipe.cached_sugar_g = 15.0
        verified_recipe.save()
        rule = make_rule(
            name="Sugar check",
            parameter="sugar_g",
            scope="recipe",
            max_green=10.0,
            max_yellow=20.0,
            tip_text="Reduce sugar",
        )
        from recipe.services.verification_service import check_verification_readiness

        result = check_verification_readiness(verified_recipe)
        has_sugar_warning = any(
            w.get("rule_name") == "Sugar check" for w in result.warnings
        )
        assert has_sugar_warning
