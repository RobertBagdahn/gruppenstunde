"""Tests for the repair_unweighted_portions command."""

from __future__ import annotations

import json
from unittest.mock import patch

import pytest
from django.core.management import call_command

from recipe.models import Recipe, RecipeItem
from supply.choices import PortionWeightSource, PortionWeightStatus
from supply.management.commands.repair_unweighted_portions import PortionVerdict
from supply.models import Ingredient, MeasuringUnit, Portion
from supply.services.portion_resolution import resolve_trusted_weight

AI = "supply.management.commands.repair_unweighted_portions._ask_ai"


@pytest.fixture
def gramm():
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)


def _verdicts(*verdicts: PortionVerdict):
    return lambda batch: [v for v in verdicts if v.portion_id in {row["portion_id"] for row in batch}]


@pytest.mark.django_db
def test_keeps_renames_and_confirms_weight(gramm):
    garlic = Ingredient.objects.create(name="Knoblauch", slug="knoblauch")
    clove = Portion.objects.create(name="Zehe", ingredient=garlic, measuring_unit=gramm, weight_g=None)
    bulb = Portion.objects.create(name="1 Stück (150g)", ingredient=garlic, measuring_unit=gramm, weight_g=150, rank=2)

    verdicts = _verdicts(
        PortionVerdict(portion_id=clove.id, action="keep", name="Zehe", weight_g=4, confidence=0.9),
        PortionVerdict(portion_id=bulb.id, action="keep", name="Knolle", weight_g=50, confidence=0.8),
    )
    with patch(AI, side_effect=verdicts):
        call_command("repair_unweighted_portions", apply=True)

    clove.refresh_from_db()
    bulb.refresh_from_db()
    assert resolve_trusted_weight(clove) == 4
    assert clove.weight_status == PortionWeightStatus.CONFIRMED
    assert clove.weight_source == PortionWeightSource.AI
    assert bulb.name == "Knolle"
    assert resolve_trusted_weight(bulb) == 50


@pytest.mark.django_db
def test_deletes_meaningless_portion(gramm):
    pesto = Ingredient.objects.create(name="Pesto", slug="pesto")
    piece = Portion.objects.create(name="1 Stück (150g)", ingredient=pesto, measuring_unit=gramm, weight_g=150)

    with patch(AI, side_effect=_verdicts(PortionVerdict(portion_id=piece.id, action="delete"))):
        call_command("repair_unweighted_portions", apply=True)

    piece.refresh_from_db()
    assert piece.deleted_at is not None


@pytest.mark.django_db
def test_duplicate_clean_name_is_dropped(gramm):
    onion = Ingredient.objects.create(name="Zwiebel", slug="zwiebel")
    Portion.objects.create(
        name="Stück", ingredient=onion, measuring_unit=gramm, weight_g=80, weight_status=PortionWeightStatus.CONFIRMED
    )
    legacy = Portion.objects.create(name="1 Stück (100g)", ingredient=onion, measuring_unit=gramm, weight_g=100, rank=2)

    verdict = PortionVerdict(portion_id=legacy.id, action="keep", name="Stück", weight_g=80)
    with patch(AI, side_effect=_verdicts(verdict)):
        call_command("repair_unweighted_portions", apply=True)

    legacy.refresh_from_db()
    assert legacy.deleted_at is not None


@pytest.mark.django_db
def test_referenced_portion_is_never_deleted_or_reweighed(gramm):
    onion = Ingredient.objects.create(name="Zwiebel", slug="zwiebel")
    piece = Portion.objects.create(name="Stück", ingredient=onion, measuring_unit=gramm, weight_g=150)
    recipe = Recipe.objects.create(title="Suppe", portions=1)
    RecipeItem.objects.create(recipe=recipe, portion=piece, quantity=1)

    verdict = PortionVerdict(portion_id=piece.id, action="keep", name="Zwiebel", weight_g=80)
    with patch(AI, side_effect=_verdicts(verdict)):
        call_command("repair_unweighted_portions", apply=True)

    piece.refresh_from_db()
    assert piece.name == "Stück"
    assert piece.weight_g == 150
    assert resolve_trusted_weight(piece) is None


@pytest.mark.django_db
def test_referenced_portion_confirms_close_weight(gramm):
    onion = Ingredient.objects.create(name="Zwiebel", slug="zwiebel")
    piece = Portion.objects.create(name="Stück", ingredient=onion, measuring_unit=gramm, weight_g=100)
    recipe = Recipe.objects.create(title="Suppe", portions=1)
    RecipeItem.objects.create(recipe=recipe, portion=piece, quantity=1)

    verdict = PortionVerdict(portion_id=piece.id, action="keep", name="Stück", weight_g=80)
    with patch(AI, side_effect=_verdicts(verdict)):
        call_command("repair_unweighted_portions", apply=True)

    piece.refresh_from_db()
    assert resolve_trusted_weight(piece) == 100


@pytest.mark.django_db
def test_dry_run_writes_plan_and_from_plan_applies_without_ai(gramm, tmp_path):
    pesto = Ingredient.objects.create(name="Pesto", slug="pesto")
    piece = Portion.objects.create(name="Stück", ingredient=pesto, measuring_unit=gramm, weight_g=None)
    plan = tmp_path / "plan.json"

    with patch(AI, side_effect=_verdicts(PortionVerdict(portion_id=piece.id, action="delete"))):
        call_command("repair_unweighted_portions", output=str(plan))

    piece.refresh_from_db()
    assert piece.deleted_at is None
    assert json.loads(plan.read_text())[0]["action"] == "delete"

    with patch(AI) as ai:
        call_command("repair_unweighted_portions", from_plan=str(plan), apply=True)
        ai.assert_not_called()

    piece.refresh_from_db()
    assert piece.deleted_at is not None
