# Generated migration for breakfast wizard enhancements

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0055_ingredientseason"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("profiles", "0001_initial"),  # For Group model
    ]

    operations = [
        # Add owner FK to Ingredient
        migrations.AddField(
            model_name="ingredient",
            name="owner",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="ingredients_owned",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Besitzer",
            ),
        ),
        # Add visibility field
        migrations.AddField(
            model_name="ingredient",
            name="visibility",
            field=models.CharField(
                choices=[("private", "Privat"), ("shared", "Geteilt")],
                default="private",
                max_length=20,
                verbose_name="Sichtbarkeit",
            ),
        ),
        # Add shared_groups M2M
        migrations.AddField(
            model_name="ingredient",
            name="shared_groups",
            field=models.ManyToManyField(
                blank=True,
                help_text="Gruppen, mit denen diese Zutat geteilt wird",
                related_name="shared_ingredients",
                to="profiles.usergroup",
                verbose_name="Geteilte Gruppen",
            ),
        ),
    ]
