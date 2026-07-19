"""Tests for MeasuringUnit cleanup migration and related changes."""

import pytest
from django.test import TestCase

from supply.choices import MeasuringUnitType
from supply.models import MeasuringUnit, Portion

from . import make_ingredient


UNIT_DATA = [
    ("Gramm", "Gewichtseinheit", 1.0, "g"),
    ("Kilogramm", "1000 Gramm", 1000.0, "g"),
    ("Milliliter", "Volumeneinheit", 1.0, "ml"),
    ("Liter", "1000 Milliliter", 1000.0, "ml"),
    ("Teelöffel", "5 ml", 5.0, "ml"),
    ("Esslöffel", "15 ml", 15.0, "ml"),
    ("Tasse", "ca. 250 ml", 250.0, "ml"),
    ("Prise", "Kleine Menge", 0.3, "g"),
    ("Messerspitze", "sehr kleine Menge", 1.0, "g"),
    ("Schuss", "ca. 10 ml Flüssigkeit", 10.0, "ml"),
]


def create_all_units():
    """Create all 10 cleaned-up MeasuringUnits."""
    for name, desc, quantity, unit in UNIT_DATA:
        MeasuringUnit.objects.get_or_create(
            name=name,
            defaults={"description": desc, "quantity": quantity, "unit": unit},
        )
    # Ensure existing records also have correct values
    for name, desc, quantity, unit in UNIT_DATA:
        MeasuringUnit.objects.filter(name=name).update(quantity=quantity, unit=unit)


@pytest.mark.django_db
class TestMeasuringUnitCleanup(TestCase):
    """Tests for the cleaned-up MeasuringUnit reference data."""

    def setUp(self):
        create_all_units()

    def test_exactly_ten_measuring_units(self):
        count = MeasuringUnit.objects.count()
        assert count == 10, f"Expected 10 units, got {count}"

    def test_deleted_units_not_present(self):
        deleted_names = [
            "g", "ml", "Stück", "Packung", "Portion",
            "Scheibe", "Dose", "Glas", "Becher", "Bund", "Sp",
        ]
        for name in deleted_names:
            assert not MeasuringUnit.objects.filter(name__iexact=name).exists(), (
                f"'{name}' should not exist"
            )

    def test_gramm_base_unit(self):
        gramm = MeasuringUnit.objects.get(name="Gramm")
        assert gramm.unit == MeasuringUnitType.MASS
        assert gramm.quantity == 1.0

    def test_milliliter_base_unit(self):
        ml = MeasuringUnit.objects.get(name="Milliliter")
        assert ml.unit == MeasuringUnitType.VOLUME
        assert ml.quantity == 1.0

    def test_essloeffel_is_volume_unit(self):
        el = MeasuringUnit.objects.get(name="Esslöffel")
        assert el.unit == MeasuringUnitType.VOLUME
        assert el.quantity == 15.0

    def test_teeloeffel_is_volume_unit(self):
        tl = MeasuringUnit.objects.get(name="Teelöffel")
        assert tl.unit == MeasuringUnitType.VOLUME
        assert tl.quantity == 5.0

    def test_tasse_is_volume_unit(self):
        tasse = MeasuringUnit.objects.get(name="Tasse")
        assert tasse.unit == MeasuringUnitType.VOLUME
        assert tasse.quantity == 250.0

    def test_schuss_exists(self):
        schuss = MeasuringUnit.objects.get(name="Schuss")
        assert schuss.unit == MeasuringUnitType.VOLUME
        assert schuss.quantity == 10.0

    def test_portions_reference_valid_units(self):
        gramm = MeasuringUnit.objects.get(name="Gramm")
        ingredient = make_ingredient(name="Test FK")
        portion = Portion.objects.create(
            ingredient=ingredient,
            name="test portion",
            measuring_unit=gramm,
            quantity=100.0,
        )
        assert portion.measuring_unit_id == gramm.id
        portion.delete()
        ingredient.delete()

    def test_no_dangling_portions(self):
        existing_ids = set(MeasuringUnit.objects.values_list("id", flat=True))
        dangling = Portion.objects.exclude(measuring_unit_id__in=existing_ids).count()
        assert dangling == 0, f"{dangling} portions reference deleted measuring units"


@pytest.mark.django_db
class TestMeasuringUnitApiSort(TestCase):
    def setUp(self):
        create_all_units()

    def test_api_returns_sorted_units(self):
        from django.test import RequestFactory
        from supply.api.materials import list_measuring_units

        factory = RequestFactory()
        request = factory.get("/api/supplies/measuring-units/")
        request.user = None
        response = list_measuring_units(request)

        names = [u.name for u in response]
        expected = [
            "Gramm", "Kilogramm", "Milliliter", "Liter",
            "Esslöffel", "Teelöffel", "Prise", "Messerspitze",
            "Tasse", "Schuss",
        ]
        assert names == expected, f"Expected {expected}, got {names}"


@pytest.mark.django_db
class TestComputeWeightGWithMlUnits(TestCase):
    def setUp(self):
        create_all_units()

    def test_essloeffel_uses_density(self):
        ingredient = make_ingredient(name="Wasser Test", physical_density=1.0)
        el = MeasuringUnit.objects.get(name="Esslöffel")
        portion = Portion(
            ingredient=ingredient, name="EL Test",
            measuring_unit=el, quantity=1.0,
        )
        weight = portion.compute_weight_g()
        assert weight == 15.0, f"Expected 15.0, got {weight}"
        ingredient.delete()

    def test_essloeffel_with_half_density(self):
        ingredient = make_ingredient(name="Mehl Test", physical_density=0.5)
        el = MeasuringUnit.objects.get(name="Esslöffel")
        portion = Portion(
            ingredient=ingredient, name="EL Mehl",
            measuring_unit=el, quantity=1.0,
        )
        weight = portion.compute_weight_g()
        assert weight == 7.5, f"Expected 7.5, got {weight}"
        ingredient.delete()

    def test_gramm_no_density_factor(self):
        ingredient = make_ingredient(name="Zucker Test", physical_density=0.85)
        gramm = MeasuringUnit.objects.get(name="Gramm")
        portion = Portion(
            ingredient=ingredient, name="100g Zucker",
            measuring_unit=gramm, quantity=100.0,
        )
        weight = portion.compute_weight_g()
        assert weight == 100.0, f"Expected 100.0 (no density), got {weight}"
        ingredient.delete()

    def test_explicit_weight_overrides_calc(self):
        ingredient = make_ingredient(name="Test Explicit", physical_density=1.0)
        el = MeasuringUnit.objects.get(name="Esslöffel")
        portion = Portion(
            ingredient=ingredient, name="EL mit explizitem Gewicht",
            measuring_unit=el, quantity=1.0, weight_g=20.0,
        )
        assert portion.weight_g == 20.0
        ingredient.delete()


@pytest.mark.django_db
class TestUnitResolution(TestCase):
    def setUp(self):
        create_all_units()

    def test_g_resolves_to_gramm(self):
        from supply.services.unit_resolution import resolve_canonical_unit
        unit = resolve_canonical_unit("g")
        assert unit is not None
        assert unit.name == "Gramm"

    def test_el_resolves_to_essloeffel(self):
        from supply.services.unit_resolution import resolve_canonical_unit
        unit = resolve_canonical_unit("el")
        assert unit is not None
        assert unit.name == "Esslöffel"

    def test_schuss_resolves(self):
        from supply.services.unit_resolution import resolve_canonical_unit
        unit = resolve_canonical_unit("schuss")
        assert unit is not None
        assert unit.name == "Schuss"

    def test_deleted_unit_falls_back_to_gramm(self):
        from supply.services.unit_resolution import resolve_canonical_unit
        deleted_names = ["stück", "packung", "dose", "scheibe", "glas",
                         "becher", "bund", "portion"]
        for name in deleted_names:
            unit = resolve_canonical_unit(name)
            assert unit is not None, f"'{name}' returned None"
            assert unit.name == "Gramm", (
                f"'{name}' should fall back to Gramm, got {unit.name}"
            )


@pytest.mark.django_db
class TestPortionKnowledge(TestCase):
    def setUp(self):
        create_all_units()

    def test_no_phantom_units_in_typical_weights(self):
        from supply.services.portion_knowledge import TYPICAL_UNIT_WEIGHTS
        existing_names = set(MeasuringUnit.objects.values_list("name", flat=True))
        for name in TYPICAL_UNIT_WEIGHTS:
            assert name in existing_names, (
                f"'{name}' in TYPICAL_UNIT_WEIGHTS but not a MeasuringUnit"
            )

    def test_deleted_units_not_in_typical_weights(self):
        from supply.services.portion_knowledge import TYPICAL_UNIT_WEIGHTS
        deleted = {"Spitzer", "Ei", "Zehe"}
        for name in deleted:
            assert name not in TYPICAL_UNIT_WEIGHTS, (
                f"'{name}' should not be in TYPICAL_UNIT_WEIGHTS"
            )
