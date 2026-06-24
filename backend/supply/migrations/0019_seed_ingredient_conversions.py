"""Seed ingredient-specific unit conversions for common German cooking ingredients."""

from django.db import migrations

# Ingredient-specific density conversions.
# Format: (ingredient_name, from_unit_name, to_unit_name, factor)
# Sources: German cooking references, Rezeptkalkulator tool
INGREDIENT_CONVERSIONS = [
    # Ingredient-specific density conversions.
    # Format: (ingredient_name, from_unit_name, to_unit_name, factor)
    # Note: DB uses abbreviated unit names: Ta (Tasse), Pr (Prise), Msp (Messerspitze)
    # Mehl & Stärke
    ("Mehl", "Ta", "g", 125.0),
    ("Mehl", "EL", "g", 10.0),
    ("Mehl", "TL", "g", 3.0),
    ("Weizenmehl", "Ta", "g", 125.0),
    ("Weizenmehl", "EL", "g", 10.0),
    ("Vollkornmehl", "Ta", "g", 130.0),
    ("Speisestärke", "EL", "g", 9.0),
    ("Speisestärke", "TL", "g", 3.0),
    # Zucker
    ("Zucker", "Ta", "g", 200.0),
    ("Zucker", "EL", "g", 12.0),
    ("Zucker", "TL", "g", 4.0),
    ("Puderzucker", "Ta", "g", 120.0),
    ("Puderzucker", "EL", "g", 8.0),
    ("Brauner Zucker", "Ta", "g", 180.0),
    # Reis & Getreide
    ("Reis", "Ta", "g", 185.0),
    ("Reis", "Ta", "ml", 250.0),
    ("Haferflocken", "Ta", "g", 90.0),
    ("Haferflocken", "EL", "g", 6.0),
    ("Couscous", "Ta", "g", 175.0),
    ("Bulgur", "Ta", "g", 180.0),
    # Milchprodukte & Fette
    ("Butter", "EL", "g", 12.0),
    ("Butter", "TL", "g", 4.0),
    ("Milch", "Ta", "ml", 250.0),
    ("Milch", "Ta", "g", 258.0),
    ("Sahne", "Ta", "ml", 250.0),
    ("Sahne", "EL", "ml", 15.0),
    ("Schmand", "EL", "g", 15.0),
    ("Joghurt", "Ta", "g", 245.0),
    ("Quark", "EL", "g", 18.0),
    ("Öl", "EL", "ml", 15.0),
    ("Öl", "TL", "ml", 5.0),
    ("Olivenöl", "EL", "ml", 15.0),
    ("Sonnenblumenöl", "EL", "ml", 15.0),
    # Nüsse & Samen
    ("Mandeln", "Ta", "g", 140.0),
    ("Walnüsse", "Ta", "g", 100.0),
    ("Sonnenblumenkerne", "Ta", "g", 140.0),
    ("Leinsamen", "EL", "g", 10.0),
    ("Sesam", "EL", "g", 9.0),
    # Gewürze & Pulver
    ("Kakao", "EL", "g", 7.0),
    ("Kakao", "TL", "g", 2.5),
    ("Kakaopulver", "EL", "g", 7.0),
    ("Backpulver", "TL", "g", 4.0),
    ("Backpulver", "EL", "g", 12.0),
    ("Natron", "TL", "g", 5.0),
    ("Zimt", "TL", "g", 3.0),
    ("Salz", "TL", "g", 6.0),
    ("Salz", "EL", "g", 18.0),
    ("Pfeffer", "TL", "g", 2.5),
    ("Paprikapulver", "TL", "g", 2.5),
    ("Currypulver", "TL", "g", 2.5),
    # Flüssigkeiten & Saucen
    ("Honig", "EL", "g", 20.0),
    ("Honig", "TL", "g", 7.0),
    ("Senf", "EL", "g", 17.0),
    ("Senf", "TL", "g", 6.0),
    ("Tomatenmark", "EL", "g", 18.0),
    ("Tomatenmark", "TL", "g", 6.0),
    ("Sojasauce", "EL", "ml", 15.0),
    ("Essig", "EL", "ml", 15.0),
    # Hülsenfrüchte (trocken)
    ("Linsen", "Ta", "g", 190.0),
    ("Kichererbsen", "Ta", "g", 200.0),
]


def seed_ingredient_conversions(apps, schema_editor):
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")
    UnitConversion = apps.get_model("supply", "UnitConversion")
    Ingredient = apps.get_model("supply", "Ingredient")

    units_by_name = {u.name: u for u in MeasuringUnit.objects.all()}
    ingredients_by_name = {i.name: i for i in Ingredient.objects.all()}

    created_count = 0
    skipped_count = 0

    for ingredient_name, from_unit_name, to_unit_name, factor in INGREDIENT_CONVERSIONS:
        ingredient = ingredients_by_name.get(ingredient_name)
        from_unit = units_by_name.get(from_unit_name)
        to_unit = units_by_name.get(to_unit_name)

        if not ingredient or not from_unit or not to_unit:
            skipped_count += 1
            continue

        _, created = UnitConversion.objects.get_or_create(
            from_unit=from_unit,
            to_unit=to_unit,
            ingredient=ingredient,
            defaults={"factor": factor},
        )
        if created:
            created_count += 1
        else:
            skipped_count += 1


def reverse_seed(apps, schema_editor):
    UnitConversion = apps.get_model("supply", "UnitConversion")
    UnitConversion.objects.filter(ingredient__isnull=False).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0018_seed_kitchen_units"),
    ]

    operations = [
        migrations.RunPython(seed_ingredient_conversions, reverse_seed),
    ]
