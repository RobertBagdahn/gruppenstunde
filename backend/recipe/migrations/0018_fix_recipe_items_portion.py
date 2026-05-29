"""Data migration: Map RecipeItems without portion to base portion, delete orphans."""

from django.db import migrations


def fix_recipe_items(apps, schema_editor):
    RecipeItem = apps.get_model("recipe", "RecipeItem")
    Portion = apps.get_model("supply", "Portion")

    # Items with portion already set — nothing to do
    # Items with ingredient but no portion — map to base portion
    items_without_portion = RecipeItem.objects.filter(portion__isnull=True, ingredient__isnull=False)
    for item in items_without_portion:
        # Find is_default portion for this ingredient
        base_portion = Portion.objects.filter(
            ingredient_id=item.ingredient_id,
            is_default=True,
            deleted_at__isnull=True,
        ).first()

        if not base_portion:
            # Fallback: any non-deleted portion
            base_portion = Portion.objects.filter(
                ingredient_id=item.ingredient_id,
                deleted_at__isnull=True,
            ).first()

        if base_portion:
            item.portion = base_portion
            item.save(update_fields=["portion"])
        else:
            # No portion available at all — delete orphan
            item.delete()

    # Delete items without portion AND without ingredient (orphans)
    RecipeItem.objects.filter(portion__isnull=True, ingredient__isnull=True).delete()


def reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):
    dependencies = [
        ("recipe", "0017_remove_recipeitem_quantity_type"),
        ("supply", "0016_portion_fields_mandatory"),
    ]

    operations = [
        migrations.RunPython(fix_recipe_items, reverse),
    ]
