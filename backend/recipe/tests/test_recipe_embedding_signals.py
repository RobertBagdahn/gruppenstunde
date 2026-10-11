"""Tests for the recipe embedding signals on RecipeItem changes."""

import concurrent.futures.thread
import logging
from collections.abc import Callable

import pytest
from django.db import transaction

from content.services.embedding_service import EMBEDDING_OUTPUT_DIM
from recipe import signals as recipe_signals
from recipe.models import Recipe, RecipeItem
from recipe.tests import make_recipe
from supply.tests import make_ingredient

FAKE_EMBEDDING = [0.1] * EMBEDDING_OUTPUT_DIM


@pytest.fixture
def fake_embedding(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("content.services.embedding_service.create_embedding", lambda *args, **kwargs: FAKE_EMBEDDING)


@pytest.fixture
def worker_during_shutdown(monkeypatch: pytest.MonkeyPatch) -> list[Callable[[], None]]:
    """Run background tasks like the worker thread does after a management command exits.

    Tasks submitted while the command ran still execute during interpreter
    shutdown, outside any transaction (``on_commit`` runs immediately), but
    every new ``submit`` raises ``RuntimeError``. Nested background work
    scheduled by such a task therefore fails.
    """
    real_run_in_background = recipe_signals.run_in_background
    nested: list[Callable[[], None]] = []
    running = False

    def run(fn: Callable[[], None]) -> None:
        nonlocal running
        if running:
            nested.append(fn)
            real_run_in_background(fn)
            return
        running = True
        try:
            with monkeypatch.context() as task_patch:
                task_patch.setattr(transaction, "on_commit", lambda callback, *args, **kwargs: callback())
                fn()
        finally:
            running = False

    monkeypatch.setattr(recipe_signals, "run_in_background", run)
    monkeypatch.setattr(concurrent.futures.thread, "_shutdown", True)
    return nested


@pytest.mark.django_db
class TestRecipeItemEmbeddingSignal:
    def test_item_change_updates_embedding_without_nested_background_work(
        self, fake_embedding, worker_during_shutdown, django_capture_on_commit_callbacks, caplog
    ):
        recipe = make_recipe(title="Linsensuppe")
        ingredient = make_ingredient(name="Rote Linsen")
        item = RecipeItem.objects.create(recipe=recipe, ingredient=ingredient, quantity=320)

        caplog.set_level(logging.WARNING, logger="recipe.signals")
        with django_capture_on_commit_callbacks(execute=True):
            item.quantity = 80
            item.save(update_fields=["quantity"])

        assert worker_during_shutdown == []
        assert "Failed to update embedding" not in caplog.text
        recipe = Recipe.objects.get(pk=recipe.pk)
        assert recipe.embedding is not None
        assert recipe.embedding_text_hash

    def test_items_deleted_with_their_recipe_do_not_warn(
        self, fake_embedding, django_capture_on_commit_callbacks, monkeypatch, caplog
    ):
        monkeypatch.setattr(recipe_signals, "run_in_background", lambda fn: fn())
        recipe = make_recipe(title="Wird gelöscht")
        RecipeItem.objects.create(recipe=recipe, ingredient=make_ingredient(name="Möhre"), quantity=100)

        caplog.set_level(logging.WARNING, logger="recipe.signals")
        with django_capture_on_commit_callbacks(execute=True) as callbacks:
            recipe.delete()

        assert callbacks
        assert "Failed to update embedding" not in caplog.text
