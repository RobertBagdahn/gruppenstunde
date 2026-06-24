"""Data migration: convert 'once' quantity_type items to per-person, then remove field."""

from django.db import migrations


def convert_once_to_per_person(apps, schema_editor):
    """Convert RecipeItems with quantity_type='once' to per-person quantities."""
    RecipeItem = apps.get_model("recipe", "RecipeItem")
    once_items = RecipeItem.objects.filter(quantity_type="once")
    for item in once_items.select_related("recipe"):
        servings = item.recipe.servings or 1
        if servings > 0:
            item.quantity = item.quantity / servings
        item.save(update_fields=["quantity"])


class Migration(migrations.Migration):
    dependencies = [
        ("recipe", "0016_recipe_source_url"),
    ]

    operations = [
        migrations.RunPython(convert_once_to_per_person, migrations.RunPython.noop),
        migrations.RemoveField(
            model_name="recipeitem",
            name="quantity_type",
        ),
    ]
