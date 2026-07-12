"""Seed initial Equipment entries."""

from django.db import migrations
from django.utils.text import slugify


EQUIPMENT_NAMES = [
    "Topf",
    "Pfanne",
    "Ofen",
    "Grill",
    "Dutch Oven",
    "Thermomix",
    "Wasserkocher",
    "Kühlschrank",
]


def seed_equipment(apps, schema_editor):
    Equipment = apps.get_model("supply", "Equipment")
    for i, name in enumerate(EQUIPMENT_NAMES):
        Equipment.objects.get_or_create(
            slug=slugify(name),
            defaults={"name": name, "sort_order": i},
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0062_add_equipment"),
    ]

    operations = [
        migrations.RunPython(seed_equipment, noop),
    ]
