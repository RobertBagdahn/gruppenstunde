"""
Datenmigration: Alte recipe_type Werte auf neue Werte migrieren.
- simple_meal → snack
- side_dish → recipe_part
"""

from django.db import migrations


def migrate_recipe_types_forward(apps, schema_editor):
    Recipe = apps.get_model("recipe", "Recipe")
    Recipe.objects.filter(recipe_type="simple_meal").update(recipe_type="snack")
    Recipe.objects.filter(recipe_type="side_dish").update(recipe_type="recipe_part")


def migrate_recipe_types_backward(apps, schema_editor):
    Recipe = apps.get_model("recipe", "Recipe")
    Recipe.objects.filter(recipe_type="snack").update(recipe_type="simple_meal")
    Recipe.objects.filter(recipe_type="recipe_part").update(recipe_type="side_dish")


class Migration(migrations.Migration):

    dependencies = [
        ("recipe", "0039_recipetypestats"),
        ("supply", "0035_update_recipe_type_choices"),
    ]

    operations = [
        migrations.RunPython(
            migrate_recipe_types_forward,
            migrate_recipe_types_backward,
        ),
    ]
