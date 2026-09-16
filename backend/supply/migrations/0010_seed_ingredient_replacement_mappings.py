"""Seed reviewed generic-to-concrete ingredient replacement mappings."""

from django.db import migrations

# (generic name, concrete name) — reviewed seeds. Resolution is defensive:
# missing ingredients cause the seed to be skipped (no auto-creation).
SEED_MAPPINGS = [
    ("Salz", "Jodsalz"),
    ("Milch", "Kuhmilch 3,5 %"),
    ("Nudeln", "Fusilli trocken"),
]

PROVENANCE = "seed:reviewed"


def _resolve_ingredient(Ingredient, name):
    ingredient = Ingredient.objects.filter(name__iexact=name).order_by("-usage_count", "id").first()
    if ingredient is None:
        ingredient = Ingredient.objects.filter(name__istartswith=name).order_by("-usage_count", "id").first()
    return ingredient


def seed_mappings(apps, schema_editor):
    Ingredient = apps.get_model("supply", "Ingredient")
    IngredientReplacementMapping = apps.get_model("supply", "IngredientReplacementMapping")

    for generic_name, concrete_name in SEED_MAPPINGS:
        source = _resolve_ingredient(Ingredient, generic_name)
        replacement = _resolve_ingredient(Ingredient, concrete_name)
        if source is None or replacement is None or source.pk == replacement.pk:
            continue
        IngredientReplacementMapping.objects.get_or_create(
            source_ingredient=source,
            replacement_ingredient=replacement,
            defaults={
                "relation_kind": "generic_to_concrete",
                "is_active": True,
                "provenance": PROVENANCE,
            },
        )


def unseed_mappings(apps, schema_editor):
    IngredientReplacementMapping = apps.get_model("supply", "IngredientReplacementMapping")
    IngredientReplacementMapping.objects.filter(provenance=PROVENANCE).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0009_ingredientreplacementmapping"),
    ]

    operations = [
        migrations.RunPython(seed_mappings, unseed_mappings),
    ]
