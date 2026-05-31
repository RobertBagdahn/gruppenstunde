"""Fix salt_g values: divide by 1000 where salt_g == sodium_mg * 2.5.

Legacy import calculated salt_g = sodium_mg * 2.5 instead of
salt_g = sodium_mg * 2.5 / 1000. This migration corrects those values
and recalculates recipe caches.
"""

from django.db import migrations


def fix_salt_g(apps, schema_editor):
    """Divide salt_g by 1000 for all ingredients where salt_g == sodium_mg * 2.5."""
    Ingredient = apps.get_model("supply", "Ingredient")

    affected = Ingredient.objects.filter(
        salt_g__gt=0,
        sodium_mg__isnull=False,
        sodium_mg__gt=0,
    )

    fixed_ingredient_ids = []
    for ing in affected.iterator():
        expected = float(ing.sodium_mg) * 2.5
        if abs(float(ing.salt_g) - expected) < 0.01:
            ing.salt_g = float(ing.salt_g) / 1000.0
            ing.save(update_fields=["salt_g"])
            fixed_ingredient_ids.append(ing.id)

    # Recalculate recipe caches for affected recipes
    if fixed_ingredient_ids:
        RecipeItem = apps.get_model("recipe", "RecipeItem")
        recipe_ids = (
            RecipeItem.objects.filter(
                portion__ingredient_id__in=fixed_ingredient_ids
            )
            .values_list("recipe_id", flat=True)
            .distinct()
        )

        # Import the service function for cache recalculation
        try:
            from recipe.services.recipe_checks import recalculate_recipe_cache
            Recipe = apps.get_model("recipe", "Recipe")
            for recipe in Recipe.objects.filter(id__in=list(recipe_ids)):
                try:
                    recalculate_recipe_cache(recipe)
                except Exception:
                    pass  # Don't fail migration on cache errors
        except ImportError:
            pass  # Service not available in test environment


def reverse_salt_g(apps, schema_editor):
    """Multiply salt_g by 1000 to reverse the fix."""
    Ingredient = apps.get_model("supply", "Ingredient")

    affected = Ingredient.objects.filter(
        salt_g__gt=0,
        sodium_mg__isnull=False,
        sodium_mg__gt=0,
    )

    for ing in affected.iterator():
        expected = float(ing.sodium_mg) * 2.5 / 1000.0
        if abs(float(ing.salt_g) - expected) < 0.01:
            ing.salt_g = float(ing.salt_g) * 1000.0
            ing.save(update_fields=["salt_g"])


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0019_seed_ingredient_conversions"),
        ("recipe", "0024_add_usage_count"),
    ]

    operations = [
        migrations.RunPython(fix_salt_g, reverse_salt_g),
    ]
