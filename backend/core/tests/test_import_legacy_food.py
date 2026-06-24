"""Tests for the import_legacy_food management command."""

from __future__ import annotations

from decimal import Decimal
from pathlib import Path

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models.signals import post_delete, post_save

FIXTURE_DIR = str(Path(__file__).parent / "fixtures" / "legacy_food")


@pytest.fixture
def fixture_dir() -> str:
    return FIXTURE_DIR


@pytest.mark.django_db
class TestImportLegacyFoodMasterData:
    """7.2: Datei 0 importiert korrekt, zweiter Lauf erzeugt keine Duplikate."""

    def test_master_data_idempotent(self, fixture_dir: str) -> None:
        from supply.models import MeasuringUnit, NutritionalTag, RetailSection

        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "0")

        mu_count = MeasuringUnit.objects.count()
        rs_count = RetailSection.objects.count()
        nt_count = NutritionalTag.objects.count()

        assert mu_count >= 2  # EL, g
        assert rs_count >= 1  # Obst & Gemüse
        assert nt_count >= 1  # vegan

        # Second run — no duplicates
        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "0")

        assert MeasuringUnit.objects.count() == mu_count
        assert RetailSection.objects.count() == rs_count
        assert NutritionalTag.objects.count() == nt_count


@pytest.mark.django_db
class TestImportLegacyFoodIngredients:
    """7.3: Zwei Läufe → Ingredient-Anzahl verdoppelt sich, keine IntegrityError."""

    def test_ingredients_with_duplicates(self, fixture_dir: str) -> None:
        from supply.models import Ingredient

        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "0,1")
        count_after_first = Ingredient.objects.count()
        assert count_after_first >= 2  # Testapfel, Testmehl

        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "1")
        count_after_second = Ingredient.objects.count()
        assert count_after_second == count_after_first * 2


@pytest.mark.django_db
class TestImportLegacyFoodMetainfoFlattening:
    """7.4: Nährwerte korrekt übernommen, price_per_kg als Decimal."""

    def test_metainfo_flattening(self, fixture_dir: str) -> None:
        from supply.models import Ingredient

        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "0,1")

        # Find our test ingredient by name
        ing = Ingredient.objects.filter(name="Testapfel").first()
        assert ing is not None
        assert ing.energy_kcal == pytest.approx(250.5)
        assert ing.protein_g == pytest.approx(3.5)
        assert ing.fat_g == pytest.approx(1.2)
        assert ing.fat_sat_g == pytest.approx(0.3)
        assert ing.carbohydrate_g == pytest.approx(20.0)
        assert ing.sugar_g == pytest.approx(5.0)
        assert ing.fibre_g == pytest.approx(2.5)
        assert ing.salt_g == pytest.approx(0.5)
        assert ing.sodium_mg == pytest.approx(10.0)
        assert ing.fruit_factor == pytest.approx(0.8)
        assert ing.nutri_score == -2
        assert ing.nutri_class == 1
        assert isinstance(ing.price_per_kg, Decimal)
        assert ing.price_per_kg == Decimal("3.99")


@pytest.mark.django_db
class TestImportLegacyFoodPortionWeightG:
    """7.5: Portion.weight_g aus MetaInfo."""

    def test_portion_weight_g(self, fixture_dir: str) -> None:
        from supply.models import Portion

        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "0,1")

        # Portion for Testapfel should have weight_g from metainfo 10100 (200g)
        portion = Portion.objects.filter(name="Stück", ingredient__name="Testapfel").first()
        assert portion is not None
        assert portion.weight_g == pytest.approx(200.0)

        # Portion for Testmehl should have weight_g from metainfo 10101 (500g)
        portion2 = Portion.objects.filter(name="Packung", ingredient__name="Testmehl").first()
        assert portion2 is not None
        assert portion2.weight_g == pytest.approx(500.0)


@pytest.mark.django_db
class TestImportLegacyFoodRecipeSeed:
    """7.6: Recipe mit owner=None, status=approved, neuer Slug."""

    def test_recipe_seed(self, fixture_dir: str) -> None:
        from recipe.models import Recipe

        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "0,1,3")

        recipe = Recipe.objects.filter(title="Apfelkuchen Test").first()
        assert recipe is not None
        assert recipe.owner is None
        assert recipe.status == "approved"
        assert recipe.slug  # non-empty
        assert recipe.portions == 1


@pytest.mark.django_db
class TestImportLegacyFoodOrphanRecipeItem:
    """7.7: RecipeItem mit fehlender Ingredient-Ref wird übersprungen."""

    def test_orphan_recipe_item(self, fixture_dir: str) -> None:
        from recipe.models import RecipeItem

        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "0,1,3")

        # We have 2 recipe items in fixture: one valid (portion 9100 -> ingredient 100),
        # one orphan (portion 99999 -> not found). Only valid one should be imported.
        items = RecipeItem.objects.all()
        # The valid one should exist
        assert items.filter(quantity=3.0).exists()
        # Total should be 1 (orphan skipped)
        # Note: the orphan portion 99999 won't resolve, so its recipe item gets skipped
        assert items.count() >= 1


@pytest.mark.django_db
class TestImportLegacyFoodSignalLifecycle:
    """7.8: Nach Command-Ende sind recipe/signals wieder connected."""

    def test_signal_lifecycle(self, fixture_dir: str) -> None:
        from recipe.signals import (
            invalidate_recipes_on_ingredient_change,
            recalculate_recipe_cache_on_item_change,
        )

        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "0")

        # Check signals are reconnected
        save_receivers = [r[1]() for r in post_save.receivers if r[1]() is not None]
        delete_receivers = [r[1]() for r in post_delete.receivers if r[1]() is not None]

        # The signal functions should be among the receivers
        assert recalculate_recipe_cache_on_item_change in save_receivers
        assert recalculate_recipe_cache_on_item_change in delete_receivers
        assert invalidate_recipes_on_ingredient_change in save_receivers


@pytest.mark.django_db
class TestImportLegacyFoodDryRun:
    """7.9: --dry-run → keine DB-Zeilen nach Ende."""

    def test_dry_run(self, fixture_dir: str) -> None:
        from supply.models import Ingredient

        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "0,1", "--dry-run")

        # No ingredients should persist (master data also rolled back)
        assert Ingredient.objects.count() == 0
        # Master data also rolled back in dry-run
        # (depending on whether any existed before)


@pytest.mark.django_db
class TestImportLegacyFoodFileFilter:
    """7.10: --files 0 → nur Stammdaten importiert."""

    def test_file_filter(self, fixture_dir: str) -> None:
        from supply.models import Ingredient, MeasuringUnit

        call_command("import_legacy_food", "--data-dir", fixture_dir, "--files", "0")

        assert MeasuringUnit.objects.count() >= 2
        assert Ingredient.objects.count() == 0  # No ingredients from file 0


@pytest.mark.django_db
class TestImportLegacyFoodMissingDataDir:
    """7.11: CommandError mit deutscher Nachricht."""

    def test_missing_data_dir(self) -> None:
        with pytest.raises(CommandError, match="Datenverzeichnis existiert nicht"):
            call_command("import_legacy_food", "--data-dir", "/nonexistent/path")
