# Hand-written migration: MealPlan → MealEvent, Meal datetime refactor
#
# This migration:
# 1. Renames MealPlan model to MealEvent (db_table stays "planner_mealplan")
# 2. Renames FK meal_plan → meal_event on Meal
# 3. Adds start_datetime/end_datetime, migrates data from date+time_start/time_end
# 4. Removes old date, time_start, time_end fields
# 5. Updates Meta options and constraints

import datetime as dt

from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone as tz


def convert_datetime_forward(apps, schema_editor):
    """Convert date + time_start/time_end → start_datetime/end_datetime."""
    Meal = apps.get_model("planner", "Meal")
    for meal in Meal.objects.all():
        date = meal.date
        time_start = meal.time_start or dt.time(12, 0)
        time_end = meal.time_end or dt.time(13, 0)
        meal.start_datetime = tz.make_aware(dt.datetime.combine(date, time_start))
        meal.end_datetime = tz.make_aware(dt.datetime.combine(date, time_end))
        meal.save(update_fields=["start_datetime", "end_datetime"])


def convert_datetime_backward(apps, schema_editor):
    """Reverse: extract date + times from start_datetime/end_datetime."""
    Meal = apps.get_model("planner", "Meal")
    for meal in Meal.objects.all():
        if meal.start_datetime:
            local_start = tz.localtime(meal.start_datetime)
            local_end = tz.localtime(meal.end_datetime) if meal.end_datetime else local_start
            meal.date = local_start.date()
            meal.time_start = local_start.time()
            meal.time_end = local_end.time()
            meal.save(update_fields=["date", "time_start", "time_end"])


class Migration(migrations.Migration):
    dependencies = [
        ("planner", "0003_remove_meal_day_flatten"),
    ]

    operations = [
        # ── Phase 1: Rename model MealPlan → MealEvent ──
        migrations.RenameModel(
            old_name="MealPlan",
            new_name="MealEvent",
        ),
        # The table name stays "planner_mealplan" via db_table Meta option,
        # so RenameModel only updates Django's internal state.
        migrations.AlterModelTable(
            name="mealevent",
            table="planner_mealplan",
        ),
        # Update Meta options on MealEvent
        migrations.AlterModelOptions(
            name="mealevent",
            options={
                "verbose_name": "Essensplan",
                "verbose_name_plural": "Essenspläne",
                "ordering": ["-created_at"],
            },
        ),
        # ── Phase 2: Rename FK meal_plan → meal_event on Meal ──
        migrations.RenameField(
            model_name="meal",
            old_name="meal_plan",
            new_name="meal_event",
        ),
        # ── Phase 3: Add new datetime fields (nullable initially) ──
        migrations.AddField(
            model_name="meal",
            name="start_datetime",
            field=models.DateTimeField(
                null=True,
                blank=True,
                db_index=True,
                verbose_name="Startzeit",
            ),
        ),
        migrations.AddField(
            model_name="meal",
            name="end_datetime",
            field=models.DateTimeField(
                null=True,
                blank=True,
                verbose_name="Endzeit",
            ),
        ),
        # ── Phase 4: Migrate data ──
        migrations.RunPython(convert_datetime_forward, convert_datetime_backward),
        # ── Phase 5: Make new fields non-nullable ──
        migrations.AlterField(
            model_name="meal",
            name="start_datetime",
            field=models.DateTimeField(
                db_index=True,
                verbose_name="Startzeit",
            ),
        ),
        migrations.AlterField(
            model_name="meal",
            name="end_datetime",
            field=models.DateTimeField(
                verbose_name="Endzeit",
            ),
        ),
        # ── Phase 6: Remove old fields ──
        migrations.AlterUniqueTogether(
            name="meal",
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name="meal",
            name="date",
        ),
        migrations.RemoveField(
            model_name="meal",
            name="time_start",
        ),
        migrations.RemoveField(
            model_name="meal",
            name="time_end",
        ),
        # ── Phase 7: Update Meal Meta ──
        migrations.AlterModelOptions(
            name="meal",
            options={
                "verbose_name": "Mahlzeit",
                "verbose_name_plural": "Mahlzeiten",
                "ordering": ["start_datetime", "meal_type"],
            },
        ),
    ]
