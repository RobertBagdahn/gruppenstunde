# Generated migration for breakfast wizard recipe sharing

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recipe", "0039_recipefolder_recipefolder_unique_folder_per_owner"),
        ("profiles", "0001_initial"),
    ]

    operations = [
        # Add shared_groups M2M to Recipe
        migrations.AddField(
            model_name="recipe",
            name="shared_groups",
            field=models.ManyToManyField(
                blank=True,
                help_text="Gruppen, mit denen dieses Rezept geteilt wird",
                related_name="shared_recipes",
                to="profiles.group",
                verbose_name="Geteilte Gruppen",
            ),
        ),
    ]
