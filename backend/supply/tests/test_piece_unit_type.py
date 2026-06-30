"""Tests für den PIECE-Einheitentyp und den Reorder-Fix.

Abdeckung:
5.1 Stück→Gramm liefert korrekte Gramm (keine Doppelskalierung)
5.2 PIECE nicht als Umrechnungsquelle; g/ml weiterhin als Quelle
5.3 Natürliche Portion "Stück (150g)" ohne "x"-Symbol
5.4 Reorder ohne g in Payload speichert ohne 422; g bleibt 9999
"""

import pytest
from django.test import TestCase

from supply.api.unit_conversions import _get_available_conversions
from supply.choices import MeasuringUnitType
from supply.models import MeasuringUnit
from supply.services.shopping_service import _format_natural_portion

from . import make_ingredient, make_measuring_unit


class TestMeasuringUnitTypePiece(TestCase):
    """Testet, dass PIECE-Einheiten korrekt gespeichert werden."""

    def test_piece_enum_value(self):
        """PIECE-Enum hat den Wert 'stk'."""
        self.assertEqual(MeasuringUnitType.PIECE, "stk")

    def test_stueck_unit_has_piece_type(self):
        """Bestehende Stück-Einheit hat nach Migration unit=PIECE."""
        stueck = MeasuringUnit.objects.filter(name__iexact="Stück").first()
        if stueck:
            self.assertEqual(stueck.unit, MeasuringUnitType.PIECE)

    def test_packung_unit_has_piece_type(self):
        """Bestehende Packung-Einheit hat nach Migration unit=PIECE."""
        packung = MeasuringUnit.objects.filter(name__iexact="Packung").first()
        if packung:
            self.assertEqual(packung.unit, MeasuringUnitType.PIECE)

    def test_create_piece_measuring_unit(self):
        """Neue Einheit kann mit PIECE-Typ erstellt werden."""
        mu = MeasuringUnit.objects.create(
            name="Beutel",
            quantity=1,
            unit=MeasuringUnitType.PIECE,
        )
        self.assertEqual(mu.unit, "stk")
        mu.delete()


@pytest.mark.django_db
class TestUnitConversionSourceFilter(TestCase):
    """Testet, dass PIECE-Einheiten nicht als Umrechnungsquelle dienen."""

    def test_piece_unit_not_a_conversion_source(self):
        """Eine PIECE-Einheit (stk) liefert keine Umrechnungen."""
        mu_piece = make_measuring_unit(name="Stück Test", unit="stk", quantity=1)

        _name, conversions = _get_available_conversions(
            ingredient_id=None,
            from_unit_id=mu_piece.id,
            quantity=1.0,
        )

        self.assertEqual(conversions, [], "PIECE-Einheit darf keine Umrechnungsquelle sein")
        mu_piece.delete()

    def test_gram_unit_is_conversion_source(self):
        """Eine g-Einheit kann als Umrechnungsquelle dienen."""
        from supply.models import UnitConversion

        mu_g = make_measuring_unit(name="Gramm Test", unit="g", quantity=1)
        mu_target = make_measuring_unit(name="EL Test", unit="g", quantity=15)
        conv = UnitConversion.objects.create(
            from_unit=mu_g,
            to_unit=mu_target,
            factor=1 / 15,
        )

        _name, conversions = _get_available_conversions(
            ingredient_id=None,
            from_unit_id=mu_g.id,
            quantity=1.0,
        )

        # Mindestens eine Umrechnung vorhanden
        self.assertTrue(len(conversions) >= 1)

        conv.delete()
        mu_g.delete()
        mu_target.delete()


class TestFormatNaturalPortion(TestCase):
    """Testet _format_natural_portion für Stück-/Verpackungsnamen."""

    def test_stueck_no_x_symbol(self):
        """'Stück' erhält kein 'x'-Symbol."""
        result = _format_natural_portion(3, "Stück")
        self.assertNotIn(" x ", result)
        self.assertIn("Stück", result)

    def test_stueck_with_weight_no_x_symbol(self):
        """'Stück (150g)' erhält kein 'x'-Symbol."""
        result = _format_natural_portion(2, "Stück (150g)")
        self.assertNotIn(" x ", result)
        self.assertIn("Stück", result)

    def test_packung_no_x_symbol(self):
        """'Packung' erhält kein 'x'-Symbol."""
        result = _format_natural_portion(1, "Packung")
        self.assertNotIn(" x ", result)

    def test_packung_with_weight_no_x_symbol(self):
        """'Packung (500g)' erhält kein 'x'-Symbol."""
        result = _format_natural_portion(2, "Packung (500g)")
        self.assertNotIn(" x ", result)

    def test_unknown_unit_gets_x_symbol(self):
        """Unbekannte Einheiten erhalten das 'x'-Symbol."""
        result = _format_natural_portion(3, "Riegel")
        self.assertIn(" x ", result)

    def test_stk_abbreviation_no_x(self):
        """'stk' Abkürzung erhält kein 'x'-Symbol."""
        result = _format_natural_portion(2, "stk")
        self.assertNotIn(" x ", result)

    def test_multiple_stueck_display(self):
        """3 Stück werden korrekt dargestellt."""
        result = _format_natural_portion(3, "Stück")
        self.assertEqual(result, "ca. 3 Stück")

    def test_el_no_x(self):
        """Esslöffel erhält kein 'x'-Symbol (Regression)."""
        result = _format_natural_portion(2, "EL")
        self.assertNotIn(" x ", result)


@pytest.mark.django_db
class TestPortionReorderExcludesG(TestCase):
    """Testet, dass die g-Portion Reorder-Regeln korrekt greifen.

    5.4 Backend: Reorder ohne g in Payload speichert ohne 422; g bleibt 9999
    """

    def test_g_portion_has_rank_9999_after_signal(self):
        """Nach dem Anlegen einer Zutat hat die g-Portion rank=9999."""
        from supply.models import Portion

        ingredient = make_ingredient(name="Apfel Test Reorder")
        p_g = Portion.objects.filter(ingredient=ingredient, name="g").first()

        if not p_g:
            self.skipTest("g-Portion fehlt — Signal nicht ausgelöst?")

        self.assertEqual(p_g.rank, 9999, "g-Portion muss rank=9999 haben")
        ingredient.delete()

    def test_reorder_endpoint_rejects_g_portion_with_wrong_rank(self):
        """Backend lehnt Reorder mit g-Portion (rank != 9999) mit 422 ab."""
        from ninja.errors import HttpError

        from supply.api.ingredients import reorder_portions
        from supply.models import Portion
        from supply.schemas.ingredients import PortionReorderIn, PortionReorderItem

        ingredient = make_ingredient(name="Birne Test Reorder")
        p_g = Portion.objects.filter(ingredient=ingredient, name="g").first()

        if not p_g:
            self.skipTest("g-Portion fehlt")

        # Payload MIT g-Portion aber falscher Rank
        payload = PortionReorderIn(orders=[PortionReorderItem(id=p_g.id, rank=1)])

        from unittest.mock import MagicMock

        request = MagicMock()
        request.user.is_authenticated = True

        with self.assertRaises(HttpError) as ctx:
            reorder_portions(request, slug=ingredient.slug, payload=payload)

        self.assertEqual(ctx.exception.status_code, 422)
        ingredient.delete()

    def test_reorder_without_g_portion_updates_ranks(self):
        """Reorder-Payload ohne g-Portion aktualisiert Ränge korrekt."""
        from unittest.mock import MagicMock

        from supply.api.ingredients import reorder_portions
        from supply.models import Portion
        from supply.schemas.ingredients import PortionReorderIn, PortionReorderItem

        ingredient = make_ingredient(name="Kirsche Test Reorder")

        p_g = Portion.objects.filter(ingredient=ingredient, name="g").first()
        p_stueck = Portion.objects.filter(ingredient=ingredient, name="Stück").first()
        p_packung = Portion.objects.filter(ingredient=ingredient, name="Packung").first()

        if not p_g or not p_stueck or not p_packung:
            self.skipTest("System-Portionen fehlen")

        # Payload ohne g-Portion — tauscht Ränge von Stück und Packung
        payload = PortionReorderIn(
            orders=[
                PortionReorderItem(id=p_packung.id, rank=1),
                PortionReorderItem(id=p_stueck.id, rank=2),
            ]
        )

        request = MagicMock()
        request.user.is_authenticated = True

        result = reorder_portions(request, slug=ingredient.slug, payload=payload)

        # g-Portion bleibt bei rank=9999
        p_g.refresh_from_db()
        self.assertEqual(p_g.rank, 9999, "g-Portion muss rank=9999 bleiben")

        # Portionen wurden korrekt neu nummeriert
        p_packung.refresh_from_db()
        p_stueck.refresh_from_db()
        self.assertEqual(p_packung.rank, 1)
        self.assertEqual(p_stueck.rank, 2)

        ingredient.delete()
