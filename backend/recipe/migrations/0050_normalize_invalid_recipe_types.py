"""Datenmigration: Ungültige recipe_type Werte auf gültige RecipeTypeChoices mappen.

Diese Werte wurden durch KI-generierte Rezepte (recipe_ai_suggest_service.ai_create_recipe)
gespeichert, deren Schema ein anderes Vokabular ('main', 'side', 'soup', ...) beschrieb als
die tatsächlichen RecipeTypeChoices ('warm_meal', 'recipe_part', ...). Das führte u.a. zu
404s auf /api/recipes/type-stats/{recipe_type}/, da für ungültige Typen nie Stats existieren.

- main -> warm_meal
- side_dish -> recipe_part (bereits in 0040 für neue Fälle behandelt, hier erneut für
  zwischenzeitlich neu entstandene Datensätze)
- simple_meal -> snack (siehe 0040)
- alle sonstigen Werte außerhalb der gültigen Choices -> warm_meal (sicherer Fallback)
"""

from django.db import migrations

VALID_RECIPE_TYPES = {
    "breakfast",
    "warm_meal",
    "cold_meal",
    "dessert",
    "recipe_part",
    "drink",
    "snack",
}

# Known legacy/AI-vocabulary values mapped to their closest valid choice.
KNOWN_MAPPING = {
    "main": "warm_meal",
    "side_dish": "recipe_part",
    "side": "recipe_part",
    "simple_meal": "snack",
    "soup": "warm_meal",
    "salad": "cold_meal",
    "baking": "dessert",
}

FALLBACK = "warm_meal"


def normalize_recipe_types_forward(apps, schema_editor):
    Recipe = apps.get_model("recipe", "Recipe")
    invalid_values = (
        Recipe.objects.exclude(recipe_type__in=VALID_RECIPE_TYPES)
        .values_list("recipe_type", flat=True)
        .distinct()
    )
    for value in invalid_values:
        target = KNOWN_MAPPING.get(value, FALLBACK)
        Recipe.objects.filter(recipe_type=value).update(recipe_type=target)


def normalize_recipe_types_backward(apps, schema_editor):
    # Not reversible — original invalid values are not recoverable.
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("recipe", "0049_add_recipe_steps"),
    ]

    operations = [
        migrations.RunPython(
            normalize_recipe_types_forward,
            normalize_recipe_types_backward,
        ),
    ]
