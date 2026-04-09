# Hand-written migration: flatten MealDay into Meal

import django.db.models.deletion
from django.db import migrations, models


def copy_meal_day_data(apps, schema_editor):
    """Copy meal_plan and date from MealDay to each Meal."""
    Meal = apps.get_model("planner", "Meal")
    for meal in Meal.objects.select_related("meal_day").all():
        meal.meal_plan_new_id = meal.meal_day.meal_plan_id
        meal.date_new = meal.meal_day.date
        meal.save(update_fields=["meal_plan_new_id", "date_new"])


class Migration(migrations.Migration):
    dependencies = [
        ("planner", "0002_initial"),
    ]

    operations = [
        # Step 1: Add new nullable fields to Meal
        migrations.AddField(
            model_name="meal",
            name="meal_plan_new",
            field=models.ForeignKey(
                null=True,
                blank=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="+",
                to="planner.mealplan",
            ),
        ),
        migrations.AddField(
            model_name="meal",
            name="date_new",
            field=models.DateField(null=True, blank=True),
        ),
        # Step 2: Copy data from MealDay
        migrations.RunPython(copy_meal_day_data, migrations.RunPython.noop),
        # Step 3: Remove old meal_day FK
        migrations.RemoveField(
            model_name="meal",
            name="meal_day",
        ),
        # Step 4: Rename new fields to final names
        migrations.RenameField(
            model_name="meal",
            old_name="meal_plan_new",
            new_name="meal_plan",
        ),
        migrations.RenameField(
            model_name="meal",
            old_name="date_new",
            new_name="date",
        ),
        # Step 5: Make fields non-nullable
        migrations.AlterField(
            model_name="meal",
            name="meal_plan",
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name="meals",
                to="planner.mealplan",
                verbose_name="Essensplan",
            ),
        ),
        migrations.AlterField(
            model_name="meal",
            name="date",
            field=models.DateField(verbose_name="Datum"),
        ),
        # Step 6: Delete MealDay model
        migrations.DeleteModel(
            name="MealDay",
        ),
        # Step 7: Add unique constraint and ordering
        migrations.AlterUniqueTogether(
            name="meal",
            unique_together={("meal_plan", "date", "meal_type")},
        ),
        migrations.AlterModelOptions(
            name="meal",
            options={
                "ordering": ["date", "meal_type"],
                "verbose_name": "Mahlzeit",
                "verbose_name_plural": "Mahlzeiten",
            },
        ),
    ]
