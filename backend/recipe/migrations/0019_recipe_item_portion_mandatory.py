"""Schema migration: Make RecipeItem.portion mandatory, remove ingredient and measuring_unit fields."""

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recipe", "0018_fix_recipe_items_portion"),
        ("supply", "0016_portion_fields_mandatory"),
    ]

    operations = [
        # Make portion non-nullable
        migrations.AlterField(
            model_name="recipeitem",
            name="portion",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.PROTECT,
                related_name="recipe_items",
                to="supply.portion",
                verbose_name="Portion",
            ),
        ),
        # Remove ingredient field
        migrations.RemoveField(
            model_name="recipeitem",
            name="ingredient",
        ),
        # Remove measuring_unit field
        migrations.RemoveField(
            model_name="recipeitem",
            name="measuring_unit",
        ),
        # Add check constraint
        migrations.AddConstraint(
            model_name="recipeitem",
            constraint=models.CheckConstraint(
                check=models.Q(("quantity__gt", 0)),
                name="recipe_item_quantity_positive",
            ),
        ),
    ]
