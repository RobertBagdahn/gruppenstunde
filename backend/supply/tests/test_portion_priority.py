"""Tests for Portion priority and is_default logic (supply app)."""

import pytest

from supply.models import Portion
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
class TestPortionPriority:
    """Portion ordering should respect priority (desc), then rank (asc), then name."""

    def test_ordering_by_priority_desc(self):
        ing = make_ingredient()
        mu = make_measuring_unit()
        p_low = make_portion(ing, name="Low", priority=0, rank=1, measuring_unit=mu)
        p_high = make_portion(ing, name="High", priority=10, rank=1, measuring_unit=mu)
        p_mid = make_portion(ing, name="Mid", priority=5, rank=1, measuring_unit=mu)

        portions = list(Portion.objects.filter(ingredient=ing))
        assert portions[0].id == p_high.id
        assert portions[1].id == p_mid.id
        assert portions[2].id == p_low.id

    def test_ordering_by_rank_asc_within_same_priority(self):
        ing = make_ingredient()
        mu = make_measuring_unit()
        p2 = make_portion(ing, name="B", priority=5, rank=2, measuring_unit=mu)
        p1 = make_portion(ing, name="A", priority=5, rank=1, measuring_unit=mu)

        portions = list(Portion.objects.filter(ingredient=ing))
        assert portions[0].id == p1.id
        assert portions[1].id == p2.id


@pytest.mark.django_db
class TestPortionIsDefault:
    """Only one Portion per Ingredient should be is_default=True."""

    def test_set_is_default(self):
        ing = make_ingredient()
        mu = make_measuring_unit()
        p1 = make_portion(ing, name="A", is_default=True, measuring_unit=mu)
        assert p1.is_default is True

    def test_auto_reset_previous_default(self):
        ing = make_ingredient()
        mu = make_measuring_unit()
        p1 = make_portion(ing, name="A", is_default=True, measuring_unit=mu)
        p2 = make_portion(ing, name="B", is_default=True, measuring_unit=mu)

        p1.refresh_from_db()
        p2.refresh_from_db()
        assert p1.is_default is False
        assert p2.is_default is True

    def test_no_reset_across_ingredients(self):
        """Setting is_default on one ingredient must not affect another."""
        mu = make_measuring_unit()
        ing1 = make_ingredient(name="Mehl")
        ing2 = make_ingredient(name="Zucker")
        p1 = make_portion(ing1, name="A", is_default=True, measuring_unit=mu)
        p2 = make_portion(ing2, name="B", is_default=True, measuring_unit=mu)

        p1.refresh_from_db()
        p2.refresh_from_db()
        assert p1.is_default is True
        assert p2.is_default is True

    def test_no_default_if_not_set(self):
        ing = make_ingredient()
        mu = make_measuring_unit()
        p1 = make_portion(ing, name="A", is_default=False, measuring_unit=mu)
        p2 = make_portion(ing, name="B", is_default=False, measuring_unit=mu)

        assert p1.is_default is False
        assert p2.is_default is False

    def test_update_existing_to_default(self):
        ing = make_ingredient()
        mu = make_measuring_unit()
        p1 = make_portion(ing, name="A", is_default=True, measuring_unit=mu)
        p2 = make_portion(ing, name="B", is_default=False, measuring_unit=mu)

        # Switch default from p1 to p2
        p2.is_default = True
        p2.save()

        p1.refresh_from_db()
        p2.refresh_from_db()
        assert p1.is_default is False
        assert p2.is_default is True
