"""Regression tests for portion resolution during recipe URL import.

Covers `recipe.services.url_import_service._resolve_portion`:
- an existing portion of the same ingredient MUST NOT be renamed, because the
  partial unique constraint
  `UNIQUE (lower(name), ingredient_id) WHERE deleted_at IS NULL`
  is violated as soon as another active portion already carries the target name
- soft-deleted portions must never be resurrected and reused
"""

import pytest
from django.utils import timezone

from recipe.services.url_import_service import _resolve_portion
from supply.models import Portion
from supply.tests import make_ingredient, make_measuring_unit


@pytest.mark.django_db
class TestResolvePortionNameCollision:
    def test_does_not_rename_existing_portion_on_name_collision(self):
        """Reproduces the HTTP 500 seen for real Chefkoch imports.

        Setup mirrors production data for "Korianderpulver": one active portion
        already named "TL" bound to a different unit, plus an unused portion
        bound to the Teelöffel unit. The old implementation renamed the latter
        to "TL" and violated the unique constraint.
        """
        ingredient = make_ingredient(name="Korianderpulver")
        gram_unit = make_measuring_unit(name="Gramm", unit="g")
        teaspoon_unit = make_measuring_unit(name="Teelöffel", unit="TL")

        blocking = Portion.objects.create(
            ingredient=ingredient,
            name="TL",
            measuring_unit=gram_unit,
            quantity=1.0,
            weight_g=1.0,
            rank=2,
        )
        reusable = Portion.objects.create(
            ingredient=ingredient,
            name="Teelöffel",
            measuring_unit=teaspoon_unit,
            quantity=1.0,
            weight_g=3.0,
            rank=3,
        )

        portion_id = _resolve_portion(
            ingredient_id=ingredient.id,
            measuring_unit_id=teaspoon_unit.id,
            estimated_weight_g=5.0,
            unit_name="TL",
            portion_quantity=1.0,
        )

        assert portion_id is not None

        reusable.refresh_from_db()
        blocking.refresh_from_db()
        assert reusable.name == "Teelöffel", "existing portion must not be renamed"
        assert blocking.name == "TL"

    def test_repeated_resolution_is_stable(self):
        """Importing the same source twice must not fail on the second run."""
        ingredient = make_ingredient(name="Currypulver")
        teaspoon_unit = make_measuring_unit(name="Teelöffel", unit="TL")

        first = _resolve_portion(
            ingredient_id=ingredient.id,
            measuring_unit_id=teaspoon_unit.id,
            estimated_weight_g=5.0,
            unit_name="TL",
            portion_quantity=1.0,
        )
        second = _resolve_portion(
            ingredient_id=ingredient.id,
            measuring_unit_id=teaspoon_unit.id,
            estimated_weight_g=5.0,
            unit_name="TL",
            portion_quantity=1.0,
        )

        assert first is not None
        assert first == second

    def test_soft_deleted_portion_is_not_reused(self):
        """A soft-deleted portion must never be resurrected by the import."""
        ingredient = make_ingredient(name="Petersilie")
        spoon_unit = make_measuring_unit(name="Esslöffel", unit="EL")

        deleted = Portion.objects.create(
            ingredient=ingredient,
            name="EL",
            measuring_unit=spoon_unit,
            quantity=1.0,
            weight_g=4.0,
            rank=2,
            deleted_at=timezone.now(),
        )

        portion_id = _resolve_portion(
            ingredient_id=ingredient.id,
            measuring_unit_id=spoon_unit.id,
            estimated_weight_g=4.0,
            unit_name="EL",
            portion_quantity=1.0,
        )

        assert portion_id is not None
        assert portion_id != deleted.id
        assert Portion.objects.get(id=portion_id).deleted_at is None

    def test_gram_portion_never_accepts_estimated_weight(self):
        """Mass units (Gramm) must always have weight_g=1.0, never AI estimates like 100g."""
        ingredient = make_ingredient(name="Lauch")
        gram_unit = make_measuring_unit(name="Gramm", unit="g")

        portion_id = _resolve_portion(
            ingredient_id=ingredient.id,
            measuring_unit_id=gram_unit.id,
            estimated_weight_g=100.0,
            unit_name="g",
            portion_quantity=1.0,
        )

        portion = Portion.objects.get(id=portion_id)
        assert portion.weight_g == 1.0
        assert "100" not in portion.name

    def test_milliliter_portion_never_accepts_arbitrary_estimated_weight(self):
        """Volume units (Milliliter) must have weight_g=1.0, never arbitrary AI estimates like 250g."""
        ingredient = make_ingredient(name="Milch")
        ml_unit = make_measuring_unit(name="Milliliter", unit="ml")

        portion_id = _resolve_portion(
            ingredient_id=ingredient.id,
            measuring_unit_id=ml_unit.id,
            estimated_weight_g=250.0,
            unit_name="ml",
            portion_quantity=1.0,
        )

        portion = Portion.objects.get(id=portion_id)
        assert portion.weight_g == 1.0
        assert "250" not in portion.name
