"""Seed common unit conversions."""

from django.db import migrations

CONVERSIONS = [
    # Generic conversions (no ingredient)
    # from_unit_name, to_unit_name, factor
    ("EL", "ml", 15.0),
    ("EL", "g", 15.0),
    ("TL", "ml", 5.0),
    ("TL", "g", 5.0),
    ("Tasse", "ml", 250.0),
    ("Tasse", "g", 250.0),
    ("Messerspitze", "g", 0.5),
    ("Prise", "g", 0.3),
    ("Schuss", "ml", 10.0),
    ("Glas", "ml", 200.0),
    ("Becher", "ml", 150.0),
    ("Liter", "ml", 1000.0),
    ("kg", "g", 1000.0),
]


def seed_conversions(apps, schema_editor):
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")
    UnitConversion = apps.get_model("supply", "UnitConversion")

    units_by_name = {u.name: u for u in MeasuringUnit.objects.all()}

    for from_name, to_name, factor in CONVERSIONS:
        from_unit = units_by_name.get(from_name)
        to_unit = units_by_name.get(to_name)

        if from_unit and to_unit:
            UnitConversion.objects.get_or_create(
                from_unit=from_unit,
                to_unit=to_unit,
                ingredient=None,
                defaults={"factor": factor},
            )


def reverse_seed(apps, schema_editor):
    UnitConversion = apps.get_model("supply", "UnitConversion")
    UnitConversion.objects.filter(ingredient__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0006_unit_conversion"),
    ]

    operations = [
        migrations.RunPython(seed_conversions, reverse_seed),
    ]
