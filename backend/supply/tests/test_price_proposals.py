"""Tests for the AI price proposal lifecycle and centralized missing-price semantics."""

import json
from unittest.mock import MagicMock, patch

import pytest
from django.test import Client

from supply.models import Ingredient, IngredientPriceProposal
from supply.services.ingredient_price_proposal_service import price_source_for
from supply.services.price_service import is_missing_price, price_or_none

BASE = "/api/ingredients"


@pytest.fixture
def staff_client(db, django_user_model) -> Client:
    user = django_user_model.objects.create_superuser(
        username="staff",
        email="staff@inspi.dev",
        password="staffpass123",
    )
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def user_client(db, django_user_model) -> Client:
    user = django_user_model.objects.create_user(username="member", password="memberpass123")
    client = Client()
    client.force_login(user)
    return client


def _proposal_response(price: float = 3.49, confidence: float = 0.8):
    mock = MagicMock()
    mock.text = json.dumps(
        {
            "proposed_price_per_kg": price,
            "confidence": confidence,
            "rationale": "Typischer Supermarktpreis für Weizenmehl.",
            "source": "gemini",
        }
    )
    return mock


@pytest.mark.django_db
class TestMissingPriceSemantics:
    def test_null_and_zero_are_missing(self):
        assert is_missing_price(None) is True
        assert is_missing_price(0) is True
        assert is_missing_price("0.00") is True
        assert is_missing_price(-1) is True
        assert is_missing_price("abc") is True

    def test_positive_price_is_priced(self):
        assert is_missing_price(0.01) is False
        assert float(price_or_none("2.49")) == pytest.approx(2.49)

    def test_price_or_none_returns_none_for_missing(self):
        assert price_or_none(None) is None
        assert price_or_none(0) is None


@pytest.mark.django_db
class TestCreateProposalAPI:
    def test_staff_can_create_proposal_for_missing_price(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Weizenmehl", slug="weizenmehl", price_per_kg=None)

        with patch("supply.services.ingredient_price_proposal_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (_proposal_response(), "mock-interaction-1")

            res = staff_client.post(f"{BASE}/{ingredient.slug}/price-proposals/")

        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "pending"
        assert data["proposed_price_per_kg"] == 3.49
        assert data["confidence"] == 0.8
        assert data["rationale"]
        assert data["source"] == "gemini"
        assert data["ingredient_id"] == ingredient.id

        proposal = IngredientPriceProposal.objects.get(id=data["id"])
        assert proposal.ingredient == ingredient
        assert proposal.status == IngredientPriceProposal.Status.PENDING

    def test_zero_price_treated_as_missing(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Wasser", slug="wasser", price_per_kg=0)

        with patch("supply.services.ingredient_price_proposal_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (_proposal_response(price=0.15), "mock-int-2")
            res = staff_client.post(f"{BASE}/{ingredient.slug}/price-proposals/")

        assert res.status_code == 200

    def test_positive_price_is_rejected(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Zucker", slug="zucker", price_per_kg=2.49)

        res = staff_client.post(f"{BASE}/{ingredient.slug}/price-proposals/")

        assert res.status_code == 409

    def test_create_is_idempotent_for_pending_proposal(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Haferflocken", slug="haferflocken", price_per_kg=None)

        with patch("supply.services.ingredient_price_proposal_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (_proposal_response(), "mock-int-3")
            first = staff_client.post(f"{BASE}/{ingredient.slug}/price-proposals/")
            second = staff_client.post(f"{BASE}/{ingredient.slug}/price-proposals/")

        assert first.status_code == 200
        assert second.status_code == 200
        assert second.json()["id"] == first.json()["id"]
        assert mock_gemini.call_count == 1
        assert IngredientPriceProposal.objects.filter(ingredient=ingredient).count() == 1

    def test_unauthenticated_gets_403(self, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Reis", slug="reis", price_per_kg=None)

        res = Client().post(f"{BASE}/{ingredient.slug}/price-proposals/")

        assert res.status_code == 403

    def test_non_editor_member_gets_403(self, user_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Milch", slug="milch", price_per_kg=None, status="verified")

        res = user_client.post(f"{BASE}/{ingredient.slug}/price-proposals/")

        assert res.status_code == 403

    def test_invalid_ai_price_gets_422(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Salz", slug="salz", price_per_kg=None)

        with patch("supply.services.ingredient_price_proposal_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (_proposal_response(price=0), "mock-int-4")
            res = staff_client.post(f"{BASE}/{ingredient.slug}/price-proposals/")

        assert res.status_code == 422


@pytest.mark.django_db
class TestAcceptRejectAPI:
    def _make_pending(self, ingredient: Ingredient, price="3.49", **kwargs) -> IngredientPriceProposal:
        return IngredientPriceProposal.objects.create(
            ingredient=ingredient,
            proposed_price_per_kg=price,
            confidence=0.8,
            rationale="Test",
            **kwargs,
        )

    def test_accept_applies_price_and_reviews(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Mehl", slug="mehl", price_per_kg=None)
        proposal = self._make_pending(ingredient)

        res = staff_client.post(
            f"{BASE}/{ingredient.slug}/price-proposals/{proposal.id}/accept/",
            data=json.dumps({"replace": False}),
            content_type="application/json",
        )

        assert res.status_code == 200
        assert res.json()["status"] == "accepted"

        ingredient.refresh_from_db()
        proposal.refresh_from_db()
        assert float(ingredient.price_per_kg) == 3.49
        assert proposal.status == IngredientPriceProposal.Status.ACCEPTED
        assert proposal.reviewed_by is not None
        assert proposal.reviewed_at is not None

    def test_accept_requires_replace_for_existing_positive_price(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Butter", slug="butter", price_per_kg=5.0)
        proposal = self._make_pending(ingredient, price="6.0")

        res = staff_client.post(
            f"{BASE}/{ingredient.slug}/price-proposals/{proposal.id}/accept/",
            data=json.dumps({"replace": False}),
            content_type="application/json",
        )
        assert res.status_code == 409
        ingredient.refresh_from_db()
        assert float(ingredient.price_per_kg) == 5.0

        res = staff_client.post(
            f"{BASE}/{ingredient.slug}/price-proposals/{proposal.id}/accept/",
            data=json.dumps({"replace": True}),
            content_type="application/json",
        )
        assert res.status_code == 200
        ingredient.refresh_from_db()
        assert float(ingredient.price_per_kg) == 6.0

    def test_accept_already_reviewed_gets_409(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Zucker", slug="zucker", price_per_kg=None)
        proposal = self._make_pending(ingredient)
        proposal.status = IngredientPriceProposal.Status.REJECTED
        proposal.save()

        res = staff_client.post(
            f"{BASE}/{ingredient.slug}/price-proposals/{proposal.id}/accept/",
            data=json.dumps({"replace": False}),
            content_type="application/json",
        )
        assert res.status_code == 409

    def test_reject_keeps_price_unchanged(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Olivenöl", slug="olivenoel", price_per_kg=None)
        proposal = self._make_pending(ingredient)

        res = staff_client.post(f"{BASE}/{ingredient.slug}/price-proposals/{proposal.id}/reject/")

        assert res.status_code == 200
        assert res.json()["status"] == "rejected"

        ingredient.refresh_from_db()
        proposal.refresh_from_db()
        assert ingredient.price_per_kg is None
        assert proposal.status == IngredientPriceProposal.Status.REJECTED

    def test_unauthenticated_cannot_accept(self, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Quark", slug="quark", price_per_kg=None)
        proposal = self._make_pending(ingredient)

        res = Client().post(
            f"{BASE}/{ingredient.slug}/price-proposals/{proposal.id}/accept/",
            data=json.dumps({"replace": False}),
            content_type="application/json",
        )
        assert res.status_code == 403

    def test_list_proposals(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Nudeln", slug="nudeln", price_per_kg=None)
        self._make_pending(ingredient)
        self._make_pending(ingredient, status=IngredientPriceProposal.Status.REJECTED)

        res = staff_client.get(f"{BASE}/{ingredient.slug}/price-proposals/")

        assert res.status_code == 200
        data = res.json()
        assert data["total"] == 2
        assert {item["status"] for item in data["items"]} == {"pending", "rejected"}


@pytest.mark.django_db
class TestProvenance:
    def test_price_source_manual(self, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Honig", slug="honig", price_per_kg=8.0)
        assert price_source_for(ingredient) == "manual"

    def test_price_source_ai_accepted(self, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Honig", slug="honig", price_per_kg=None)
        proposal = IngredientPriceProposal.objects.create(
            ingredient=ingredient,
            proposed_price_per_kg="8.00",
            confidence=0.9,
            rationale="Test",
            status=IngredientPriceProposal.Status.ACCEPTED,
        )
        ingredient.price_per_kg = proposal.proposed_price_per_kg
        ingredient.save(update_fields=["price_per_kg"])

        assert price_source_for(ingredient) == "ai_accepted"

    def test_price_source_missing(self, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Honig", slug="honig", price_per_kg=0)
        assert price_source_for(ingredient) == "missing"

    def test_detail_exposes_source_and_pending_proposal(self, staff_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Honig", slug="honig", price_per_kg=None)
        self_proposal = IngredientPriceProposal.objects.create(
            ingredient=ingredient,
            proposed_price_per_kg="8.00",
            confidence=0.9,
            rationale="Test",
        )

        res = staff_client.get(f"{BASE}/{ingredient.slug}/")

        assert res.status_code == 200
        data = res.json()
        assert data["price_source"] == "missing"
        assert data["pending_price_proposal"]["id"] == self_proposal.id


@pytest.mark.django_db
class TestCacheInvalidation:
    def test_accept_recalculates_recipe_cache(self, staff_client, db):
        from recipe.services.recipe_checks import recalculate_recipe_cache
        from recipe.tests import make_recipe, make_recipe_item
        from supply.tests import make_ingredient

        priced = make_ingredient(name="Mehl", slug="mehl", price_per_kg=2.0)
        unpriced = make_ingredient(name="Wasser", slug="wasser", price_per_kg=None)
        recipe = make_recipe(title="Brotteig", slug="brotteig")
        make_recipe_item(recipe=recipe, ingredient=priced, quantity=500)
        make_recipe_item(recipe=recipe, ingredient=unpriced, quantity=100)
        recalculate_recipe_cache(recipe)
        recipe.refresh_from_db()
        assert recipe.cached_price_ingredient_count == 2
        assert recipe.cached_price_priced_count == 1
        assert recipe.cached_price_missing_count == 1

        proposal = IngredientPriceProposal.objects.create(
            ingredient=unpriced,
            proposed_price_per_kg="0.10",
            confidence=0.7,
            rationale="Test",
        )

        res = staff_client.post(
            f"{BASE}/{unpriced.slug}/price-proposals/{proposal.id}/accept/",
            data=json.dumps({"replace": False}),
            content_type="application/json",
        )
        assert res.status_code == 200

        recipe.refresh_from_db()
        assert recipe.cached_price_priced_count == 2
        assert recipe.cached_price_missing_count == 0
        assert float(recipe.cached_price_total) == pytest.approx(1.01, abs=0.01)
