"""Seed additional kitchen measuring units (Handvoll, Tropfen) and generic conversions."""

from django.db import migrations

NEW_UNITS = [
    # (name, description, quantity, unit_type)
    ("Handvoll", "Eine Handvoll (~30g)", 1, "g"),
    ("Tropfen", "Ein Tropfen (~0.05ml)", 1, "ml"),
]

NEW_GENERIC_CONVERSIONS = [
    # (from_unit_name, to_unit_name, factor)
    ("Handvoll", "g", 30.0),
    ("Tropfen", "ml", 0.05),
    # Fix missing generic conversions (DB uses abbreviated names)
    ("EL", "ml", 15.0),
    ("EL", "g", 15.0),
    ("TL", "ml", 5.0),
    ("TL", "g", 5.0),
    ("Ta", "ml", 250.0),
    ("Ta", "g", 250.0),
    ("Msp", "g", 0.5),
    ("Pr", "g", 0.3),
    ("Kg", "g", 1000.0),
    ("l", "ml", 1000.0),
]


def seed_units_and_conversions(apps, schema_editor):
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")
    UnitConversion = apps.get_model("supply", "UnitConversion")

    for name, description, quantity, unit_type in NEW_UNITS:
        MeasuringUnit.objects.get_or_create(
            name=name,
            defaults={
                "description": description,
                "quantity": quantity,
                "unit": unit_type,
            },
        )

    units_by_name = {u.name: u for u in MeasuringUnit.objects.all()}

    for from_name, to_name, factor in NEW_GENERIC_CONVERSIONS:
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
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")
    UnitConversion = apps.get_model("supply", "UnitConversion")

    names = [name for name, _, _, _ in NEW_UNITS]
    units = MeasuringUnit.objects.filter(name__in=names)
    UnitConversion.objects.filter(from_unit__in=units, ingredient__isnull=True).delete()
    units.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0017_fix_quantity_constraint"),
    ]

    operations = [
        migrations.RunPython(seed_units_and_conversions, reverse_seed),
    ]
