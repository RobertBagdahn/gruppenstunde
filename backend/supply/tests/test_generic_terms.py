"""Tests for generic ingredient terms, name-validation, and stemming normalization.

Covers:
- IngredientAlias.is_generic partial unique constraint (model level)
- term_normalization.normalize_term
- generic_terms.is_generic_name / get_generic_terms
- API: IngredientDetailOut.name_warning on create/update, alias is_generic
"""

import json

import pytest
from django.db import IntegrityError, transaction

from supply.models import Ingredient, IngredientAlias
from supply.services.generic_terms import get_generic_terms, is_generic_name
from supply.services.term_normalization import normalize_term


@pytest.fixture
def ingredient_a(db):
    return Ingredient.objects.create(name="Fusilli trocken", status="approved")


@pytest.fixture
def ingredient_b(db):
    return Ingredient.objects.create(name="Spaghetti trocken", status="approved")


# ---------------------------------------------------------------------------
# 6.1 Model / migration: partial unique constraint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestIngredientAliasIsGenericConstraint:
    def test_generic_alias_allowed_on_multiple_ingredients(self, ingredient_a, ingredient_b):
        IngredientAlias.objects.create(ingredient=ingredient_a, name="Nudeln", is_generic=True)
        # Should not raise — generic aliases are exempt from global uniqueness.
        IngredientAlias.objects.create(ingredient=ingredient_b, name="Nudeln", is_generic=True)

        assert IngredientAlias.objects.filter(name__iexact="Nudeln", is_generic=True).count() == 2

    def test_non_generic_alias_globally_unique(self, ingredient_a, ingredient_b):
        IngredientAlias.objects.create(ingredient=ingredient_a, name="Speisestärke", is_generic=False)

        with pytest.raises(IntegrityError):
            with transaction.atomic():
                IngredientAlias.objects.create(ingredient=ingredient_b, name="Speisestärke", is_generic=False)


# ---------------------------------------------------------------------------
# 6.2 term_normalization
# ---------------------------------------------------------------------------


class TestNormalizeTerm:
    def test_regular_plural(self):
        assert normalize_term("Zwiebel") == normalize_term("Zwiebeln")

    def test_irregular_plural(self):
        assert normalize_term("Apfel") == normalize_term("Äpfel")

    def test_critical_pair_not_merged(self):
        assert normalize_term("Tomate") != normalize_term("Tomatenmark")

    def test_empty_string(self):
        assert normalize_term("") == ""
        assert normalize_term("   ") == ""


# ---------------------------------------------------------------------------
# 6.3 is_generic_name
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestIsGenericName:
    @pytest.fixture(autouse=True)
    def _seed_generic_alias(self, ingredient_a):
        IngredientAlias.objects.create(ingredient=ingredient_a, name="Nudeln", is_generic=True)

    def test_exact_match(self):
        assert is_generic_name("Nudeln") is True

    def test_specific_name_is_not_generic(self):
        assert is_generic_name("Fusilli trocken") is False

    def test_case_and_whitespace_insensitive(self):
        assert is_generic_name("  nudeln ") is True

    def test_get_generic_terms_contains_lowercased_name(self):
        assert "nudeln" in get_generic_terms()


# ---------------------------------------------------------------------------
# 6.6 API: name_warning on create/update responses
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestIngredientNameWarningApi:
    @pytest.fixture(autouse=True)
    def _seed_generic_alias(self, ingredient_a):
        IngredientAlias.objects.create(ingredient=ingredient_a, name="Nudeln", is_generic=True)

    def test_create_generic_name_returns_warning(self, auth_client):
        resp = auth_client.post(
            "/api/ingredients/",
            data=json.dumps({"name": "Nudeln"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["name_warning"] is not None

    def test_create_specific_name_returns_no_warning(self, auth_client):
        resp = auth_client.post(
            "/api/ingredients/",
            data=json.dumps({"name": "Tortellini frisch"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["name_warning"] is None

    def test_alias_create_response_includes_is_generic(self, auth_client, ingredient_b):
        resp = auth_client.post(
            f"/api/ingredients/{ingredient_b.slug}/aliases/",
            data=json.dumps({"name": "Pasta", "is_generic": True}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["is_generic"] is True
