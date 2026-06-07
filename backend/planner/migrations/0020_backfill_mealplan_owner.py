from django.db import migrations
from django.db.models import F


def backfill_owner(apps, schema_editor):
    MealPlan = apps.get_model("planner", "MealPlan")
    MealPlan.objects.filter(owner__isnull=True).update(owner=F("created_by"))


class Migration(migrations.Migration):
    dependencies = [
        ("planner", "0019_add_owner_visibility_to_mealplan"),
    ]

    operations = [
        migrations.RunPython(backfill_owner, migrations.RunPython.noop),
    ]
