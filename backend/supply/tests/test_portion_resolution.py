"""Tests for the central piece-like portion classifier and trusted-weight resolver."""

import pytest
from model_bakery import baker

from supply.models import Portion
from supply.services.portion_resolution import (
    build_suggested_portion_name,
    find_matching_piece_portion,
    is_direct_metric_portion,
    is_piece_like_name,
    is_pre_weighed_metric_portion,
    normalize_portion_name,
    resolve_trusted_weight,
)

from . import make_ingredient, make_measuring_unit


@pytest.mark.django_db
class TestPieceLikeName:
    def test_piece_descriptors(self):
        for name in ["Stück", "stück", "Zehe", "zehen", "Scheibe", "Knolle"]:
            assert is_piece_like_name(name), name

    def test_size_descriptor_phrases(self):
        assert is_piece_like_name("kleines Brötchen")
        assert is_piece_like_name("große Zwiebel")
        assert is_piece_like_name("mittelgroße Kartoffeln")

    def test_leading_number_is_stripped(self):
        assert is_piece_like_name("1 Zwiebel")
        assert is_piece_like_name("1 Stück")

    def test_metric_and_kitchen_units_are_not_piece_like(self):
        assert not is_piece_like_name("Gramm")
        assert not is_piece_like_name("100g Zucker")
        assert not is_piece_like_name("Esslöffel")
        assert not is_piece_like_name("Portion")

    def test_normalization(self):
        assert normalize_portion_name(" 1 Zwiebel ") == "zwiebel"
        assert normalize_portion_name("100g Zucker") == "g zucker"
        assert normalize_portion_name("Kleines  Brötchen") == "kleines brötchen"


@pytest.mark.django_db
class TestTrustedWeightResolution:
    def _portion(
        self, ingredient, *, name, unit_name="Gramm", unit="g", mu_qty=1.0, weight_g, status=None, quantity=1.0
    ):
        mu = make_measuring_unit(name=unit_name, unit=unit, quantity=mu_qty)
        return baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=mu,
            name=name,
            quantity=quantity,
            weight_g=weight_g,
            weight_status=status,
        )

    def test_confirmed_piece_weight_is_trusted(self):
        ingredient = make_ingredient()
        portion = self._portion(ingredient, name="kleines Brötchen", weight_g=45.0, status="confirmed")
        assert resolve_trusted_weight(portion) == 45.0

    def test_imported_weight_is_trusted(self):
        ingredient = make_ingredient()
        portion = self._portion(ingredient, name="Portion", weight_g=80.0, status="imported")
        assert resolve_trusted_weight(portion) == 80.0

    def test_unconfirmed_piece_weight_is_not_trusted(self):
        ingredient = make_ingredient()
        portion = self._portion(ingredient, name="Stück", weight_g=45.0, status=None)
        assert resolve_trusted_weight(portion) is None
        portion.weight_status = "ai_proposed"
        portion.save(update_fields=["weight_status"])
        assert resolve_trusted_weight(portion) is None

    def test_metric_base_portion_is_trusted(self):
        ingredient = make_ingredient()
        portion = self._portion(ingredient, name="Gramm", weight_g=1.0, status=None)
        assert resolve_trusted_weight(portion) == 1.0

    def test_legacy_named_portion_stays_trusted(self):
        ingredient = make_ingredient()
        portion = self._portion(ingredient, name="Portion", weight_g=100.0, status=None)
        assert resolve_trusted_weight(portion) == 100.0

    def test_missing_weight_is_never_trusted(self):
        ingredient = make_ingredient()
        portion = self._portion(ingredient, name="Stück", weight_g=None, status=None)
        assert resolve_trusted_weight(portion) is None

    def test_definitionally_computed_weight_is_trusted(self):
        ingredient = make_ingredient(physical_density=1.0)
        portion = self._portion(
            ingredient, name="Esslöffel", unit_name="Esslöffel", unit="ml", mu_qty=15.0, weight_g=15.0, status=None
        )
        assert resolve_trusted_weight(portion) == 15.0


@pytest.mark.django_db
class TestPiecePortionMatching:
    def test_matching_returns_existing_portion(self):
        ingredient = make_ingredient(name="Brötchen")
        existing = baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(),
            name="mittleres Brötchen",
            quantity=1.0,
            weight_g=62.5,
            weight_status="confirmed",
            rank=2,
        )
        result = find_matching_piece_portion(ingredient, "mittleres Brötchen")
        assert result is not None and result.id == existing.id

    def test_size_descriptor_match_is_fuzzy(self):
        ingredient = make_ingredient(name="Brötchen")
        existing = baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(),
            name="großes Brötchen",
            quantity=1.0,
            weight_g=100.0,
            weight_status="confirmed",
        )
        result = find_matching_piece_portion(ingredient, "Brötchen")
        assert result is not None and result.id == existing.id

    def test_no_match_returns_none(self):
        ingredient = make_ingredient(name="Zwiebel")
        result = find_matching_piece_portion(ingredient, "kleine Zwiebeln")
        assert result is None


@pytest.mark.django_db
class TestSuggestedPortionName:
    def test_size_note_with_ingredient(self):
        name = build_suggested_portion_name("Stück", "klein", "Brötchen")
        assert name == "klein brötchen"

    def test_falls_back_to_unit(self):
        name = build_suggested_portion_name("Stück", None, "Brötchen")
        assert name == "stück"

    def test_falls_back_to_default(self):
        name = build_suggested_portion_name(None, None, None)
        assert name == "stück"


@pytest.mark.django_db
class TestDirectMetricPortion:
    def _portion(self, name: str, unit: str, weight_g: float | None, quantity: float = 1.0) -> Portion:
        return baker.make(
            Portion,
            ingredient=make_ingredient(name=f"Zutat {name}"),
            measuring_unit=make_measuring_unit(name=unit),
            name=name,
            quantity=quantity,
            weight_g=weight_g,
        )

    def test_unit_portions_are_direct(self):
        assert is_direct_metric_portion(self._portion("1 Gramm", "Gramm", 1.0))
        assert is_direct_metric_portion(self._portion("Liter", "Liter", 1000.0))

    def test_pre_weighed_gram_portions_are_counts(self):
        for name, weight in [("100g Reis", 100.0), ("Dose 400g", 400.0), ("EL", 15.0)]:
            portion = self._portion(name, "Gramm", weight)
            assert not is_direct_metric_portion(portion), name
            assert is_pre_weighed_metric_portion(portion), name

    def test_composite_and_non_metric_portions(self):
        assert not is_direct_metric_portion(self._portion("1 Portion Nudeln", "Gramm", 125.0, quantity=125))
        assert not is_pre_weighed_metric_portion(self._portion("EL", "EL", 15.0))
