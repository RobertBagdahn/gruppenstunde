# Generated migration for breakfast wizard performance indexes

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0056_ingredient_visibility_ownership"),
    ]

    operations = [
        # Add index for visibility + owner filtering
        migrations.AddIndex(
            model_name="ingredient",
            index=models.Index(
                fields=["visibility", "owner", "created_at"],
                name="supply_ingr_visib_owner_idx",
            ),
        ),
        # Add index for tag-based filtering (used for breakfast-base, etc)
        migrations.AddIndex(
            model_name="ingredient",
            index=models.Index(
                fields=["status", "created_at"],
                name="supply_ingr_status_idx",
            ),
        ),
    ]
