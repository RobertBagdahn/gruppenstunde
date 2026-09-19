"""Use the concrete German name ``Stück`` for generic countable portions."""

from django.db import migrations


def rename_generic_portions(apps, schema_editor):
    Portion = apps.get_model("supply", "Portion")

    for portion in Portion.objects.filter(name__iexact="Portion", deleted_at__isnull=True).iterator():
        has_piece = (
            Portion.objects.filter(
                ingredient_id=portion.ingredient_id,
                name__iexact="Stück",
                deleted_at__isnull=True,
            )
            .exclude(pk=portion.pk)
            .exists()
        )
        if not has_piece:
            portion.name = "Stück"
            portion.save(update_fields=["name"])


class Migration(migrations.Migration):
    dependencies = [("supply", "0013_normalize_piece_portion_units")]

    operations = [migrations.RunPython(rename_generic_portions, migrations.RunPython.noop)]
