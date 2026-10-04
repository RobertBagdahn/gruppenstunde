from io import StringIO

import pytest
from django.core.management import CommandError, call_command

from supply.models import Ingredient, IngredientAlias
from supply.tests import make_ingredient, make_portion


@pytest.fixture
def eggs():
    target = make_ingredient(name="Hühnerei (Größe M)", status="verified", usage_count=22)
    make_portion(target, name="Stück", quantity=1.0, weight_g=60.0, rank=1)
    others = [
        make_ingredient(name=name, status="verified")
        for name in ("Eier (Größe M)", "Hühnereier Größe M", "Hühnerei", "Hühnereier")
    ]
    return (target, *others)


@pytest.mark.django_db
class TestConsolidateEggIngredients:
    def test_dry_run_changes_nothing(self, eggs):
        target, *others = eggs
        out = StringIO()

        call_command("consolidate_egg_ingredients", stdout=out)

        assert Ingredient.objects.filter(pk__in=[o.pk for o in others], deleted_at__isnull=True).count() == 4
        assert not IngredientAlias.objects.filter(ingredient=target).exists()
        assert "Dry-run: 4 merge(s), 2 alias(es)" in out.getvalue()

    def test_apply_merges_and_adds_aliases(self, eggs):
        target, *others = eggs

        call_command("consolidate_egg_ingredients", "--apply", stdout=StringIO())

        assert Ingredient.objects.filter(pk__in=[o.pk for o in others], deleted_at__isnull=True).count() == 0
        alias_names = {name.lower() for name in target.aliases.values_list("name", flat=True)}
        assert {"ei", "eier", "eier (größe m)", "hühnereier größe m", "hühnerei", "hühnereier"} <= alias_names

    def test_apply_is_idempotent(self, eggs):
        call_command("consolidate_egg_ingredients", "--apply", stdout=StringIO())
        out = StringIO()

        call_command("consolidate_egg_ingredients", "--apply", stdout=out)

        assert "not found (already merged?)" in out.getvalue()

    def test_missing_target_is_an_error(self, db):
        with pytest.raises(CommandError):
            call_command("consolidate_egg_ingredients", stdout=StringIO())
