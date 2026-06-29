"""Tests for Portion rank ordering logic (supply app).

Note: is_default and priority fields were removed in migration 0044.
The canonical default portion is now rank=1. Ordering is by rank ASC.
"""

import pytest

from supply.models import Portion
from supply.tests import make_ingredient, make_measuring_unit, make_portion


@pytest.mark.django_db
class TestPortionRankOrdering:
    """Portion ordering should respect rank (asc), then name."""

    def test_ordering_by_rank_asc(self):
        ing = make_ingredient()
        mu = make_measuring_unit()
        p3 = make_portion(ing, name="High-rank", rank=3, measuring_unit=mu)
        p1 = make_portion(ing, name="Low-rank", rank=1, measuring_unit=mu)
        p2 = make_portion(ing, name="Mid-rank", rank=2, measuring_unit=mu)

        # Default ordering is by rank ASC (set in Meta)
        portions = list(Portion.objects.filter(ingredient=ing).order_by("rank"))
        ids = [p.id for p in portions]
        assert ids.index(p1.id) < ids.index(p2.id) < ids.index(p3.id)

    def test_rank_1_is_normalportion(self):
        """rank=1 is the canonical normal portion."""
        ing = make_ingredient()
        mu = make_measuring_unit()
        normal = make_portion(ing, name="Normal", rank=1, measuring_unit=mu)
        extra = make_portion(ing, name="Extra", rank=2, measuring_unit=mu)

        first = Portion.objects.filter(ingredient=ing).order_by("rank").first()
        assert first.id == normal.id

    def test_rank_independent_across_ingredients(self):
        """rank=1 on one ingredient does not affect another."""
        mu = make_measuring_unit()
        ing1 = make_ingredient(name="Mehl")
        ing2 = make_ingredient(name="Zucker")
        p1 = make_portion(ing1, name="Normal", rank=1, measuring_unit=mu)
        p2 = make_portion(ing2, name="Normal", rank=1, measuring_unit=mu)

        # Each ingredient has its own rank=1 portion
        assert Portion.objects.filter(ingredient=ing1, rank=1).count() == 1
        assert Portion.objects.filter(ingredient=ing2, rank=1).count() == 1

    def test_multiple_ranks_per_ingredient(self):
        """An ingredient can have multiple portions with different ranks."""
        ing = make_ingredient()
        mu = make_measuring_unit()
        p1 = make_portion(ing, name="Knapp", rank=1, measuring_unit=mu)
        p2 = make_portion(ing, name="Normal", rank=2, measuring_unit=mu)
        p3 = make_portion(ing, name="Uppig", rank=3, measuring_unit=mu)

        assert Portion.objects.filter(ingredient=ing).count() >= 3

    def test_update_rank(self):
        """Changing rank on a portion works correctly."""
        ing = make_ingredient()
        mu = make_measuring_unit()
        p1 = make_portion(ing, name="A", rank=2, measuring_unit=mu)

        p1.rank = 1
        p1.save()
        p1.refresh_from_db()
        assert p1.rank == 1
