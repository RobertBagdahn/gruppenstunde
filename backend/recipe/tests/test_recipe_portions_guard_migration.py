"""Tests for the 0012 migration guard before the ``portions = 1`` constraint."""

import importlib
from types import SimpleNamespace

import pytest
from django.apps import apps
from django.db import connection

from recipe.models import Recipe
from recipe.tests import make_recipe

ensure_recipe_portions_one = importlib.import_module(
    "recipe.migrations.0012_recipe_portions_guard"
).ensure_recipe_portions_one


def _run_guard() -> None:
    # The guard only reads schema_editor.connection; SQLite cannot open a real
    # schema editor inside the test transaction.
    ensure_recipe_portions_one(apps, SimpleNamespace(connection=connection))


@pytest.mark.django_db
@pytest.mark.usefixtures("legacy_recipe_portions")
class TestRecipePortionsGuardMigration:
    def test_fails_with_ids_and_command_hint_for_portions_above_one(self):
        legacy = make_recipe(title="Suppe für vier", portions=4)
        deleted = make_recipe(title="Gelöschter Eintopf", portions=6)
        deleted.soft_delete()

        with pytest.raises(RuntimeError) as exc_info:
            _run_guard()

        message = str(exc_info.value)
        assert f"ids: {sorted([legacy.id, deleted.id])}" in message
        assert "normalize_recipe_servings" in message
        assert Recipe.all_objects.get(id=legacy.id).portions == 4

    def test_sets_portions_below_one_to_one(self):
        zero = make_recipe(title="Ohne Portionen", portions=0)
        regular = make_recipe(title="Normal", portions=1)

        _run_guard()

        assert Recipe.all_objects.get(id=zero.id).portions == 1
        assert Recipe.all_objects.get(id=regular.id).portions == 1
