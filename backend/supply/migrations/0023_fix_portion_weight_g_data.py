"""Data migration: fix incorrect weight_g=1 values on portions."""

import re

from django.db import migrations


def fix_weight_g(apps, schema_editor):
    Portion = apps.get_model("supply", "Portion")

    portions_to_fix = Portion.objects.filter(weight_g=1.0)

    for portion in portions_to_fix:
        new_weight = None

        # Try to recalculate from measuring_unit
        if portion.measuring_unit_id:
            from supply.models.reference import MeasuringUnit

            try:
                unit = MeasuringUnit.objects.get(id=portion.measuring_unit_id)
                calculated = portion.quantity * unit.quantity
                if calculated > 1:
                    new_weight = calculated
            except MeasuringUnit.DoesNotExist:
                pass

        # Try to extract weight from name (e.g. "100g Zucker" -> 100)
        if new_weight is None:
            match = re.match(r"(\d+)\s*g\b", portion.name)
            if match:
                new_weight = float(match.group(1))

        portion.weight_g = new_weight
        portion.save(update_fields=["weight_g"])


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0022_portion_weight_g_nullable"),
    ]

    operations = [
        migrations.RunPython(fix_weight_g, migrations.RunPython.noop),
    ]
