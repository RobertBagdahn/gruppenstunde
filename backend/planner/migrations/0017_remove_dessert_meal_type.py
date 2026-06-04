from django.db import migrations, models


def delete_dessert_meals(apps, schema_editor):
    Meal = apps.get_model("planner", "Meal")
    Meal.objects.filter(meal_type="dessert").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("planner", "0016_meal_external_cost_per_person_alter_meal_meal_type"),
    ]

    operations = [
        migrations.RunPython(delete_dessert_meals, reverse_code=migrations.RunPython.noop),
        migrations.AlterField(
            model_name="meal",
            name="meal_type",
            field=models.CharField(
                choices=[
                    ("breakfast", "Frühstück"),
                    ("lunch", "Mittagessen"),
                    ("dinner", "Abendessen"),
                    ("snack", "Snack"),
                    ("drinks", "Getränke"),
                ],
                max_length=10,
                verbose_name="Mahlzeittyp",
            ),
        ),
    ]
