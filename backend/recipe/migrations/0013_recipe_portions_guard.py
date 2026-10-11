"""Prepare ``Recipe.portions`` for the ``portions = 1`` constraint in 0014.

NULL and values below 1 were read as 1 by every consumer (``portions or 1`` /
``max(portions, 1)``), so setting them to 1 keeps all quantities unchanged.
Values above 1 mean the stored quantities may be totals for several people;
they are never rewritten here and abort the migration instead.
"""

from django.apps.registry import Apps
from django.db import migrations
from django.db.backends.base.schema import BaseDatabaseSchemaEditor
from django.db.models import Q


def ensure_recipe_portions_one(apps: Apps, schema_editor: BaseDatabaseSchemaEditor) -> None:
    recipe_model = apps.get_model("recipe", "Recipe")
    # _base_manager includes soft-deleted recipes; the constraint applies to every row.
    recipes = recipe_model._base_manager.using(schema_editor.connection.alias)
    legacy_ids = sorted(recipes.filter(portions__gt=1).values_list("id", flat=True))
    if legacy_ids:
        raise RuntimeError(
            f"{len(legacy_ids)} recipe(s) still have portions > 1 (ids: {legacy_ids}). "
            "Their quantities may be totals for several people. Normalize them first with "
            "`manage.py normalize_recipe_servings` (dry run, then --apply with "
            "--treat-as-total/--treat-as-per-person for review cases) and rerun the migration."
        )
    recipes.filter(Q(portions__isnull=True) | Q(portions__lt=1)).update(portions=1)


class Migration(migrations.Migration):
    dependencies = [
        ("recipe", "0012_recipeitem_standard_measure_key"),
    ]

    operations = [
        migrations.RunPython(ensure_recipe_portions_one, migrations.RunPython.noop),
    ]
