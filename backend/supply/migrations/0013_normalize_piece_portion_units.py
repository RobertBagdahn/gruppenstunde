"""Normalize legacy piece-like units without changing portion weights.

Piece semantics live in the portion name and confirmed ``weight_g``. Legacy
databases may still contain deleted form/package units, so their foreign keys
are moved to the canonical Gram unit before the legacy records are removed.
"""

from django.db import migrations

LEGACY_UNIT_NAMES = {
    "stück",
    "stueck",
    "packung",
    "packungen",
    "portion",
    "scheibe",
    "dose",
    "glas",
    "becher",
    "bund",
}


def normalize_piece_units(apps, schema_editor):
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")
    Portion = apps.get_model("supply", "Portion")

    gram_unit = MeasuringUnit.objects.filter(name__iexact="Gramm").first()
    if gram_unit is None:
        return

    legacy_units = MeasuringUnit.objects.filter(
        name__iregex=r"^(stück|stueck|packung|packungen|portion|scheibe|dose|glas|becher|bund)$"
    )
    Portion.objects.filter(measuring_unit__in=legacy_units).update(measuring_unit=gram_unit)
    legacy_units.exclude(pk=gram_unit.pk).delete()


class Migration(migrations.Migration):
    dependencies = [("supply", "0012_backfill_portion_weight_status")]

    operations = [migrations.RunPython(normalize_piece_units, migrations.RunPython.noop)]
