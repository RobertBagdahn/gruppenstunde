"""AI package suggestions: selection, cost estimate, API permissions and acceptance."""

from unittest.mock import patch

import pytest
from model_bakery import baker

from content.choices import ContentStatus
from planner.models import MealItem
from planner.tests import make_meal
from recipe.tests import make_recipe, make_recipe_item
from supply.models import IngredientPackageSuggestion, Package
from supply.services import package_suggestions as packages
from supply.services.package_suggestions import PackageProposal
from supply.tests import make_ingredient

BASE = "/api/admin/data-quality/offensive/packages"


def _used(name: str, **kwargs):
    ingredient = make_ingredient(name=name, **kwargs)
    make_recipe_item(recipe=make_recipe(), ingredient=ingredient)
    return ingredient


def _proposal(ingredient, **kwargs) -> PackageProposal:
    defaults = {
        "id": ingredient.id,
        "package_name": "500-g-Packung",
        "weight_g": 500,
        "physical_viscosity": "solid",
        "confidence": 0.9,
        "reason": "Übliche Größe",
    }
    defaults.update(kwargs)
    return PackageProposal(**defaults)


def _suggestion(ingredient, **kwargs) -> IngredientPackageSuggestion:
    defaults = {
        "package_name": "500-g-Packung",
        "weight_g": 500,
        "physical_viscosity": "solid",
        "confidence": 0.9,
    }
    defaults.update(kwargs)
    return IngredientPackageSuggestion.objects.create(ingredient=ingredient, **defaults)


# ---------------------------------------------------------------------------
# Selection and estimate
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCandidates:
    def test_used_ingredients_without_package_are_candidates(self):
        in_recipe = _used("Nudeln")
        in_meal_plan = make_ingredient(name="Äpfel")
        # make_meal_item always attaches a recipe; a direct ingredient item needs recipe=None.
        baker.make(MealItem, meal=make_meal(), recipe=None, ingredient=in_meal_plan, quantity=100, factor=1.0)
        make_ingredient(name="Ungenutzt")

        assert set(packages.candidate_queryset()) == {in_recipe, in_meal_plan}

    def test_existing_standard_package_is_excluded(self):
        ingredient = _used("Reis")
        Package.objects.create(ingredient=ingredient, name="1-kg-Packung", weight_g=1000, rank=1)
        assert ingredient not in packages.candidate_queryset()

    def test_archived_recipes_and_deleted_ingredients_do_not_count(self):
        archived = make_ingredient(name="Archiviert")
        make_recipe_item(recipe=make_recipe(status=ContentStatus.ARCHIVED), ingredient=archived)
        deleted = _used("Gelöscht")
        deleted.soft_delete()
        assert list(packages.candidate_queryset()) == []

    def test_open_or_rejected_suggestions_are_excluded(self):
        pending = _used("Mehl")
        rejected = _used("Zucker")
        _suggestion(pending)
        _suggestion(rejected, status="rejected")
        assert list(packages.candidate_queryset()) == []

    def test_estimate(self):
        assert packages.estimate(638) == (43, 0.129)
        assert packages.estimate(0) == (0, 0.0)


# ---------------------------------------------------------------------------
# Suggest run (Gemini mocked)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestSuggest:
    def test_stores_suggestions_without_applying(self):
        pasta = _used("Spaghetti")
        milk = _used("Milch")
        proposals = {
            pasta.id: _proposal(pasta),
            milk.id: _proposal(
                milk,
                package_name="1-l-Packung",
                weight_g=None,
                volume_ml=1000,
                physical_viscosity="beverage",
                physical_density=1.03,
            ),
        }
        with patch.object(packages, "request_package_batch", return_value=proposals) as mocked:
            result = packages.suggest_packages(ingredient_ids=[pasta.id, milk.id])

        assert mocked.call_count == 1
        assert (result.suggested, result.calls) == (2, 1)
        milk_suggestion = IngredientPackageSuggestion.objects.get(ingredient=milk)
        assert milk_suggestion.weight_g == 1030.0
        assert milk_suggestion.physical_density == 1.03
        assert not Package.objects.exists()
        milk.refresh_from_db()
        assert milk.physical_viscosity == "solid"

    def test_batches_of_fifteen(self):
        ingredients = [_used(f"Zutat {i:02d}") for i in range(16)]
        with patch.object(packages, "request_package_batch", return_value={}) as mocked:
            result = packages.suggest_packages(ingredient_ids=[i.id for i in ingredients])
        assert mocked.call_count == 2
        assert result.skipped == 16

    def test_implausible_proposals_are_skipped(self):
        ingredient = _used("Salz")
        with patch.object(
            packages, "request_package_batch", return_value={ingredient.id: _proposal(ingredient, weight_g=0)}
        ):
            result = packages.suggest_packages(ingredient_ids=[ingredient.id])
        assert result.suggested == 0
        assert not IngredientPackageSuggestion.objects.exists()

    def test_rerun_is_idempotent(self):
        ingredient = _used("Haferflocken")
        with patch.object(
            packages, "request_package_batch", return_value={ingredient.id: _proposal(ingredient)}
        ) as mocked:
            packages.suggest_packages(ingredient_ids=[ingredient.id])
            second = packages.suggest_packages(ingredient_ids=[ingredient.id])
        assert mocked.call_count == 1
        assert second.skipped == 1
        assert IngredientPackageSuggestion.objects.count() == 1

    def test_failed_batch_is_reported(self):
        ingredient = _used("Linsen")
        with patch.object(packages, "request_package_batch", side_effect=RuntimeError("KI down")):
            result = packages.suggest_packages(ingredient_ids=[ingredient.id])
        assert result.errors == ["KI down"]
        assert result.skipped == 1


# ---------------------------------------------------------------------------
# Accept / reject
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAccept:
    def test_accept_creates_standard_package_and_sets_liquid_data(self):
        oil = _used("Rapsöl")
        suggestion = _suggestion(
            oil, package_name="1-l-Flasche", weight_g=920, physical_viscosity="liquid", physical_density=0.92
        )
        assert packages.accept_suggestion(suggestion, user=None) is None

        package = Package.objects.get(ingredient=oil)
        assert (package.name, package.weight_g, package.rank) == ("1-l-Flasche", 920, 1)
        oil.refresh_from_db()
        assert (oil.physical_viscosity, oil.physical_density, oil.viscosity_source) == ("liquid", 0.92, "ai")
        suggestion.refresh_from_db()
        assert suggestion.status == "accepted"

    def test_manual_viscosity_is_never_overwritten(self):
        cream = _used("Sahne", physical_viscosity="solid", physical_density=1.0, viscosity_source="manual")
        suggestion = _suggestion(cream, physical_viscosity="liquid", physical_density=1.01)
        packages.accept_suggestion(suggestion, user=None)

        cream.refresh_from_db()
        assert (cream.physical_viscosity, cream.physical_density, cream.viscosity_source) == ("solid", 1.0, "manual")
        assert Package.objects.filter(ingredient=cream, rank=1).exists()

    def test_existing_standard_package_blocks_accept(self):
        ingredient = _used("Butter")
        suggestion = _suggestion(ingredient)
        Package.objects.create(ingredient=ingredient, name="250-g-Stück", weight_g=250, rank=1)
        assert "Standardpackung" in (packages.accept_suggestion(suggestion, user=None) or "")
        suggestion.refresh_from_db()
        assert suggestion.status == "pending"

    def test_existing_package_with_same_name_is_promoted(self):
        ingredient = _used("Quark")
        Package.objects.create(ingredient=ingredient, name="500-G-Packung", weight_g=None, rank=2)
        packages.accept_suggestion(_suggestion(ingredient), user=None)
        package = Package.objects.get(ingredient=ingredient)
        assert (package.rank, package.weight_g) == (1, 500)


# ---------------------------------------------------------------------------
# API
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestApi:
    @pytest.mark.parametrize(
        ("method", "path"),
        [("post", "/suggest/"), ("get", "/"), ("post", "/accept/"), ("post", "/reject/")],
    )
    def test_anonymous_and_non_staff_are_forbidden(self, api_client, auth_client, method, path):
        for client in (api_client, auth_client):
            response = getattr(client, method)(f"{BASE}{path}", data={}, content_type="application/json")
            assert response.status_code == 403

    def test_dry_run_returns_estimate_without_ai_call(self, admin_client):
        for i in range(16):
            _used(f"Zutat {i:02d}")
        with patch.object(packages, "request_package_batch") as mocked:
            response = admin_client.post(f"{BASE}/suggest/", data={"dry_run": True}, content_type="application/json")
        assert response.status_code == 200
        body = response.json()
        assert (body["candidates"], body["estimated_calls"], body["remaining"]) == (16, 2, 16)
        mocked.assert_not_called()

    def test_suggest_chunk(self, admin_client):
        ingredient = _used("Nudeln")
        with patch.object(packages, "request_package_batch", return_value={ingredient.id: _proposal(ingredient)}):
            response = admin_client.post(f"{BASE}/suggest/", data={"limit": 15}, content_type="application/json")
        body = response.json()
        assert (body["suggested"], body["remaining"], body["calls"]) == (1, 0, 1)

    def test_list_filters_and_pagination(self, admin_client):
        high = _suggestion(_used("Nudeln"), confidence=0.95)
        _suggestion(_used("Reis"), confidence=0.5)
        response = admin_client.get(f"{BASE}/", {"min_confidence": 0.8})
        body = response.json()
        assert body["total"] == 1
        assert body["page_size"] == 50
        assert body["items"][0]["id"] == high.id
        assert body["items"][0]["ingredient_name"] == "Nudeln"

    def test_patch_edits_pending_suggestion(self, admin_client):
        suggestion = _suggestion(_used("Nudeln"))
        response = admin_client.patch(
            f"{BASE}/{suggestion.id}/",
            data={"package_name": "1-kg-Packung", "weight_g": 1000},
            content_type="application/json",
        )
        assert response.status_code == 200
        assert (response.json()["package_name"], response.json()["weight_g"]) == ("1-kg-Packung", 1000)

    def test_bulk_accept_by_confidence(self, admin_client):
        high = _suggestion(_used("Nudeln"), confidence=0.85)
        low = _suggestion(_used("Reis"), confidence=0.6)
        response = admin_client.post(f"{BASE}/accept/", data={"min_confidence": 0.8}, content_type="application/json")
        assert response.json()["changed"] == 1
        high.refresh_from_db()
        low.refresh_from_db()
        assert (high.status, low.status) == ("accepted", "pending")

    def test_reject_by_ids(self, admin_client):
        suggestion = _suggestion(_used("Nudeln"))
        response = admin_client.post(f"{BASE}/reject/", data={"ids": [suggestion.id]}, content_type="application/json")
        assert response.json()["changed"] == 1
        suggestion.refresh_from_db()
        assert suggestion.status == "rejected"
        assert not Package.objects.exists()

    def test_decision_without_selection_is_rejected(self, admin_client):
        response = admin_client.post(f"{BASE}/accept/", data={}, content_type="application/json")
        assert response.status_code == 400
