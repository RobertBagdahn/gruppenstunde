"""Data migration: Normalize RecipeItem quantities to 1 Normportion.

Divides each RecipeItem.quantity by its parent Recipe.servings,
then sets Recipe.servings to 1.
"""

from django.db import migrations, models


def normalize_to_one_portion(apps, schema_editor):
    """Convert all RecipeItem quantities from N-portion basis to 1-portion basis."""
    Recipe = apps.get_model("recipe", "Recipe")
    RecipeItem = apps.get_model("recipe", "RecipeItem")

    recipes = Recipe.objects.filter(servings__gt=1).exclude(servings__isnull=True)
    for recipe in recipes:
        servings = recipe.servings
        items = RecipeItem.objects.filter(recipe=recipe)
        for item in items:
            item.quantity = item.quantity / servings
            item.save(update_fields=["quantity"])
        recipe.servings = 1
        recipe.save(update_fields=["servings"])


def reverse_normalize(apps, schema_editor):
    """Reverse is not feasible — original servings value is lost."""
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("recipe", "0004_health_rule"),
    ]

    operations = [
        migrations.AlterField(
            model_name="recipe",
            name="servings",
            field=models.IntegerField(
                blank=True,
                default=1,
                help_text="Basis-Portionsanzahl (Normportionen)",
                null=True,
                verbose_name="Portionen",
            ),
        ),
        migrations.RunPython(
            normalize_to_one_portion,
            reverse_code=reverse_normalize,
        ),
    ]
