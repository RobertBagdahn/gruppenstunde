"""
Data migration: converts snack recipe_type to simple_meal.

Snack was removed from RecipeTypeChoices. Existing data with
recipe_type='snack' is migrated to 'simple_meal'.
"""

from django.db import migrations


def convert_snack_to_simple_meal(apps, schema_editor):
    Recipe = apps.get_model("recipe", "Recipe")
    Ingredient = apps.get_model("supply", "Ingredient")

    Recipe.objects.filter(recipe_type="snack").update(recipe_type="simple_meal")
    Ingredient.objects.filter(standalone_type="snack").update(standalone_type="simple_meal")


class Migration(migrations.Migration):
    dependencies = [
        ("recipe", "0028_alter_recipe_recipe_type"),
        ("supply", "0027_alter_ingredient_standalone_type"),
    ]
    operations = [
        migrations.RunPython(convert_snack_to_simple_meal, migrations.RunPython.noop),
    ]
