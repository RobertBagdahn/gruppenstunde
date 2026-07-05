from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("planner", "0039_populate_null_mealplan_start_datetime"),
    ]

    operations = [
        migrations.AlterField(
            model_name="mealplan",
            name="start_datetime",
            field=models.DateTimeField(verbose_name="Startdatum/-zeit"),
        ),
    ]
