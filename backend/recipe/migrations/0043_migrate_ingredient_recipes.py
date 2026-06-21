"""
Datenmigration: Rezepte mit recipe_type='ingredient' auf passenden Typ umstellen.

Die recipe_type-Option 'ingredient' wird entfernt. Vorhandene Rezepte
mit diesem Typ werden auf den standalone_type der verknüpften Zutat
umgestellt, falls vorhanden, sonst auf 'snack'.
"""

from django.db import migrations


def migrate_ingredient_recipes_forward(apps, schema_editor):
    Recipe = apps.get_model("recipe", "Recipe")
    RecipeItem = apps.get_model("recipe", "RecipeItem")
    Ingredient = apps.get_model("supply", "Ingredient")

    recipes = Recipe.objects.filter(recipe_type="ingredient")

    for recipe in recipes.select_related(None).iterator():
        # Find the linked ingredient via RecipeItem -> Portion -> Ingredient
        item = (
            RecipeItem.objects.filter(recipe=recipe)
            .select_related("portion__ingredient")
            .first()
        )
        new_type = "snack"
        if item and item.portion and item.portion.ingredient:
            ingredient = item.portion.ingredient
            if ingredient.standalone_type:
                new_type = ingredient.standalone_type

        Recipe.objects.filter(pk=recipe.pk).update(recipe_type=new_type)


def migrate_ingredient_recipes_backward(apps, schema_editor):
    # No backward migration — the choice is gone
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("recipe", "0042_remove_recipe_costs_rating"),
    ]

    operations = [
        migrations.RunPython(
            migrate_ingredient_recipes_forward,
            migrate_ingredient_recipes_backward,
        ),
    ]
