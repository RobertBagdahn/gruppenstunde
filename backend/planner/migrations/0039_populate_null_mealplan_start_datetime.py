from django.db import migrations
from django.db.models import F


def populate_null_start_datetime(apps, schema_editor):
    MealPlan = apps.get_model("planner", "MealPlan")
    MealPlan.objects.filter(start_datetime__isnull=True).update(start_datetime=F("created_at"))


class Migration(migrations.Migration):
    dependencies = [
        ("planner", "0038_delete_mealitemsplit"),
    ]

    operations = [
        migrations.RunPython(populate_null_start_datetime, migrations.RunPython.noop),
    ]
