# Generated manually for MeasuringUnit cleanup
from django.db import migrations


def cleanup_measuring_units(apps, schema_editor):
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")
    Portion = apps.get_model("supply", "Portion")

    FK_MIGRATIONS = [
        (101, 61),   # g → Gramm
        (102, 63),   # ml → Milliliter
        (65, 61),    # Stück → Gramm
        (105, 61),   # Packung → Gramm
        (73, 61),    # Portion → Gramm
        (72, 61),    # Scheibe → Gramm
        (70, 61),    # Dose → Gramm
        (74, 61),    # Glas → Gramm
        (71, 61),    # Becher → Gramm
        (75, 61),    # Bund → Gramm
    ]

    for from_pk, to_pk in FK_MIGRATIONS:
        Portion.objects.filter(measuring_unit_id=from_pk).update(measuring_unit_id=to_pk)

    # Correct unit types: EL, TL, Tasse from MASS to VOLUME
    MeasuringUnit.objects.filter(pk=66).update(unit="ml", description="5 ml")
    MeasuringUnit.objects.filter(pk=67).update(unit="ml", quantity=15.0, description="15 ml")
    MeasuringUnit.objects.filter(pk=68).update(unit="ml", quantity=250.0, description="ca. 250 ml")

    # Create Schuss
    MeasuringUnit.objects.create(
        id=110,
        name="Schuss",
        description="ca. 10 ml Flüssigkeit",
        quantity=10.0,
        unit="ml",
    )

    # Delete stale units (UnitConversion CASCADE handles related records)
    DELETE_PKS = [101, 102, 65, 73, 105, 72, 70, 74, 71, 75, 97]
    MeasuringUnit.objects.filter(pk__in=DELETE_PKS).delete()


def reverse_cleanup(apps, schema_editor):
    """Reverse is best-effort: restores deleted units but cannot restore FK references."""
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")

    # Restore deleted units
    RESTORE = [
        (61, "Gramm", "Gewichtseinheit", 1.0, "g"),
        (62, "Kilogramm", "1000 Gramm", 1000.0, "g"),
        (63, "Milliliter", "Volumeneinheit", 1.0, "ml"),
        (64, "Liter", "1000 Milliliter", 1000.0, "ml"),
        (65, "Stück", "Einzelnes Stück", 1.0, "g"),
        (66, "Teelöffel", "ca. 5ml / 5g", 5.0, "g"),
        (67, "Esslöffel", "ca. 15ml / 10-15g", 10.0, "g"),
        (68, "Tasse", "ca. 250ml / 125-200g", 150.0, "g"),
        (69, "Prise", "Kleine Menge", 0.3, "g"),
        (70, "Dose", "Standarddose 400g", 400.0, "g"),
        (71, "Becher", "Standardbecher 150-200g", 150.0, "g"),
        (72, "Scheibe", "Eine Scheibe", 25.0, "g"),
        (73, "Portion", "Eine Portion", 100.0, "g"),
        (74, "Glas", "Ein Glas ca. 200ml", 200.0, "ml"),
        (75, "Bund", "Ein Bund Kräuter", 30.0, "g"),
        (97, "Sp", "Spitzer", 10.0, "ml"),
        (100, "Messerspitze", "", 1.0, "g"),
        (101, "g", "Gramm", 1.0, "g"),
        (102, "ml", "Milliliter", 1.0, "ml"),
        (105, "Packung", "", 1.0, "stk"),
    ]
    for pk, name, desc, quantity, unit in RESTORE:
        MeasuringUnit.objects.update_or_create(
            pk=pk,
            defaults={"name": name, "description": desc, "quantity": quantity, "unit": unit},
        )

    # Delete Schuss if created by forward migration
    MeasuringUnit.objects.filter(pk=110).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0005_delete_dgereference"),
    ]

    operations = [
        migrations.RunPython(cleanup_measuring_units, reverse_cleanup),
    ]
