"""Tests for the fill_recipe_steps_from_duplicate management command."""

from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError

from recipe.models import RecipeStep
from recipe.tests import make_recipe


def _run(*args: str) -> str:
    out = StringIO()
    call_command("fill_recipe_steps_from_duplicate", *args, stdout=out)
    return out.getvalue()


@pytest.fixture
def pair(db):
    source = make_recipe(title="Quelle")
    target = make_recipe(title="Ziel")
    RecipeStep.objects.create(recipe=source, sort_order=0, instruction="Erst.", duration_minutes=5)
    RecipeStep.objects.create(recipe=source, sort_order=1, instruction="Dann.")
    return source, target


def test_dry_run_writes_nothing(pair):
    source, target = pair
    output = _run("--source", str(source.pk), "--target", str(target.pk))
    assert "DRY-RUN" in output
    assert target.steps.count() == 0


def test_apply_copies_steps_and_appends(pair):
    source, target = pair
    _run("--source", str(source.pk), "--target", str(target.pk), "--append-step", "Servieren.", "--apply")
    assert [s.instruction for s in target.steps.order_by("sort_order")] == ["Erst.", "Dann.", "Servieren."]
    assert target.steps.order_by("sort_order").first().duration_minutes == 5


def test_apply_is_idempotent(pair):
    source, target = pair
    _run("--source", str(source.pk), "--target", str(target.pk), "--apply")
    output = _run("--source", str(source.pk), "--target", str(target.pk), "--apply")
    assert "already has steps" in output
    assert target.steps.count() == 2


def test_source_without_steps_fails(db):
    source = make_recipe(title="Leer")
    target = make_recipe(title="Ziel")
    with pytest.raises(CommandError):
        _run("--source", str(source.pk), "--target", str(target.pk))
