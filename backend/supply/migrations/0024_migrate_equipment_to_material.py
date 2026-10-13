"""Move Equipment into Material and parse recipe material text quantities."""

import logging
import re

from django.db import migrations
from django.utils.text import slugify

logger = logging.getLogger(__name__)

_NUMBER_RE = re.compile(r"^\s*(\d+(?:[.,]\d+)?)")


def _unique_slug(Material, base: str) -> str:
    slug = base or "item"
    counter = 1
    while Material.objects.filter(slug=slug).exists():
        slug = f"{base}-{counter}"
        counter += 1
    return slug


def equipment_to_material(apps, schema_editor):
    Equipment = apps.get_model("supply", "Equipment")
    Material = apps.get_model("supply", "Material")
    ContentMaterialItem = apps.get_model("supply", "ContentMaterialItem")
    Recipe = apps.get_model("recipe", "Recipe")
    ContentType = apps.get_model("contenttypes", "ContentType")

    recipe_ct, _ = ContentType.objects.get_or_create(app_label="recipe", model="recipe")

    # Parse text quantities of existing recipe material links.
    unparsed: list[str] = []
    for item in ContentMaterialItem.objects.filter(content_type=recipe_ct):
        match = _NUMBER_RE.match(item.quantity or "")
        if match:
            item.amount = float(match.group(1).replace(",", "."))
        else:
            item.amount = 1
            if item.quantity:
                unparsed.append(f"{item.pk}: {item.quantity!r}")
        item.quantity_mode = "total"
        item.save(update_fields=["amount", "quantity_mode"])
    if unparsed:
        logger.warning("Material-Mengen ohne Zahl (auf 1 gesetzt): %s", ", ".join(unparsed))

    for equipment in Equipment.objects.all():
        material = Material.objects.filter(name__iexact=equipment.name, deleted_at__isnull=True).first()
        if material is None:
            material = Material.objects.create(
                name=equipment.name,
                slug=_unique_slug(Material, slugify(equipment.name)),
                material_category="kitchen",
                is_consumable=False,
            )
        for recipe in Recipe.objects.filter(equipment=equipment):
            ContentMaterialItem.objects.get_or_create(
                content_type=recipe_ct,
                object_id=recipe.pk,
                material=material,
                defaults={"amount": 1, "quantity_mode": "total", "sort_order": 1000 + equipment.sort_order},
            )


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0023_material_package_fields_and_amount"),
        ("recipe", "0014_recipe_portions_one"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [migrations.RunPython(equipment_to_material, migrations.RunPython.noop)]
