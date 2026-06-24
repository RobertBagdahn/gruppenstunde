# Hand-written migration: MealEvent → MealPlan (revert of 0004 rename)
#
# The model was renamed MealPlan→MealEvent in 0004, but we're reverting
# that rename. The db_table stays "planner_mealplan" throughout.
# The Meal FK is renamed meal_event→meal_plan with db_column="meal_event_id"
# so no actual DB column rename is needed.

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planner", "0005_mealevent_update_related_names"),
        ("event", "0017_event_public_landing_idx"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # ── Phase 1: Rename model MealEvent → MealPlan ──
        migrations.RenameModel(
            old_name="MealEvent",
            new_name="MealPlan",
        ),
        # Keep db_table as "planner_mealplan"
        migrations.AlterModelTable(
            name="mealplan",
            table="planner_mealplan",
        ),
        # Update Meta options
        migrations.AlterModelOptions(
            name="mealplan",
            options={
                "verbose_name": "Essensplan",
                "verbose_name_plural": "Essenspläne",
                "ordering": ["-created_at"],
            },
        ),
        # Update related_name on created_by
        migrations.AlterField(
            model_name="mealplan",
            name="created_by",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="meal_plans",
                to=settings.AUTH_USER_MODEL,
                verbose_name="Erstellt von",
            ),
        ),
        # Update related_name on event
        migrations.AlterField(
            model_name="mealplan",
            name="event",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="meal_plans",
                to="event.event",
                verbose_name="Event",
            ),
        ),
        # ── Phase 2: Rename FK meal_event → meal_plan on Meal ──
        migrations.RenameField(
            model_name="meal",
            old_name="meal_event",
            new_name="meal_plan",
        ),
        # Set db_column so the actual DB column name doesn't change
        migrations.AlterField(
            model_name="meal",
            name="meal_plan",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="meals",
                to="planner.mealplan",
                verbose_name="Essensplan",
                db_column="meal_event_id",
            ),
        ),
    ]
