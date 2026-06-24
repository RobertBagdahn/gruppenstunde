"""
Datenmigration: Alte standalone_type Werte auf neue Werte migrieren.
- simple_meal → snack
- side_dish → recipe_part
"""

from django.db import migrations


def migrate_standalone_types_forward(apps, schema_editor):
    Ingredient = apps.get_model("supply", "Ingredient")
    Ingredient.objects.filter(standalone_type="simple_meal").update(standalone_type="snack")
    Ingredient.objects.filter(standalone_type="side_dish").update(standalone_type="recipe_part")


def migrate_standalone_types_backward(apps, schema_editor):
    Ingredient = apps.get_model("supply", "Ingredient")
    Ingredient.objects.filter(standalone_type="snack").update(standalone_type="simple_meal")
    Ingredient.objects.filter(standalone_type="recipe_part").update(standalone_type="side_dish")


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0035_update_recipe_type_choices"),
    ]

    operations = [
        migrations.RunPython(
            migrate_standalone_types_forward,
            migrate_standalone_types_backward,
        ),
    ]
