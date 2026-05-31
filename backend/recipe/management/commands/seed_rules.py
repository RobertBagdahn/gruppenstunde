"""Seed comprehensive DGE-based rules for the suggestion system.

Values are based on DGE (Deutsche Gesellschaft für Ernährung) recommendations
for adolescents aged 13-18, which is the primary target group for scout camps.

Usage:
    uv run python manage.py seed_rules
    uv run python manage.py seed_rules --clear  # Remove all existing rules first
"""

from django.core.management.base import BaseCommand

from recipe.models import Rule


# DGE reference values for 13-18 year olds, per day
RULES_DATA = [
    # --- Day-level rules (most important) ---
    {
        "name": "Energie",
        "parameter": "energy_kj",
        "scope": "day",
        "min_green": 8000,
        "min_yellow": 6500,
        "max_green": 11000,
        "max_yellow": 13000,
        "unit": "kJ",
        "sort_order": 1,
        "tip_text": "DGE empfiehlt 8000-11000 kJ/Tag für 13-18-Jährige bei moderater Aktivität",
    },
    {
        "name": "Eiweiß",
        "parameter": "protein_g",
        "scope": "day",
        "min_green": 45,
        "min_yellow": 35,
        "max_green": 80,
        "max_yellow": 100,
        "unit": "g",
        "sort_order": 2,
        "tip_text": "45-80g Eiweiß pro Tag sind empfohlen. Hülsenfrüchte, Milchprodukte und Fleisch sind gute Quellen.",
    },
    {
        "name": "Fett",
        "parameter": "fat_g",
        "scope": "day",
        "min_green": 55,
        "min_yellow": 40,
        "max_green": 85,
        "max_yellow": 100,
        "unit": "g",
        "sort_order": 3,
        "tip_text": "55-85g Fett pro Tag (max 30% der Energie). Pflanzliche Öle bevorzugen.",
    },
    {
        "name": "Kohlenhydrate",
        "parameter": "carbohydrate_g",
        "scope": "day",
        "min_green": 250,
        "min_yellow": 200,
        "max_green": 400,
        "max_yellow": 450,
        "unit": "g",
        "sort_order": 4,
        "tip_text": "250-400g Kohlenhydrate pro Tag (mind. 50% der Energie). Vollkornprodukte bevorzugen.",
    },
    {
        "name": "Zucker",
        "parameter": "sugar_g",
        "scope": "day",
        "min_green": None,
        "min_yellow": None,
        "max_green": 50,
        "max_yellow": 75,
        "unit": "g",
        "sort_order": 5,
        "tip_text": "Max 50g freier Zucker pro Tag (WHO). Süße Getränke und Süßigkeiten reduzieren.",
    },
    {
        "name": "Ballaststoffe",
        "parameter": "fibre_g",
        "scope": "day",
        "min_green": 25,
        "min_yellow": 18,
        "max_green": None,
        "max_yellow": None,
        "unit": "g",
        "sort_order": 6,
        "tip_text": "Mind. 25g Ballaststoffe pro Tag. Vollkorn, Gemüse und Hülsenfrüchte helfen.",
    },
    {
        "name": "Salz",
        "parameter": "salt_g",
        "scope": "day",
        "min_green": None,
        "min_yellow": None,
        "max_green": 5,
        "max_yellow": 7,
        "unit": "g",
        "sort_order": 7,
        "tip_text": "Max 5g Salz pro Tag (WHO). Fertigprodukte und Wurst enthalten viel Salz.",
    },
    # Micronutrients (day-level)
    {
        "name": "Calcium",
        "parameter": "calcium_mg",
        "scope": "day",
        "min_green": 1000,
        "min_yellow": 750,
        "max_green": None,
        "max_yellow": None,
        "unit": "mg",
        "sort_order": 10,
        "tip_text": "Mind. 1000mg Calcium pro Tag. Milchprodukte, grünes Gemüse, Mineralwasser.",
    },
    {
        "name": "Eisen",
        "parameter": "iron_mg",
        "scope": "day",
        "min_green": 12,
        "min_yellow": 8,
        "max_green": None,
        "max_yellow": None,
        "unit": "mg",
        "sort_order": 11,
        "tip_text": "Mind. 12mg Eisen pro Tag. Fleisch, Hülsenfrüchte, Vollkorn. Vitamin C fördert Aufnahme.",
    },
    {
        "name": "Vitamin C",
        "parameter": "vitamin_c_mg",
        "scope": "day",
        "min_green": 90,
        "min_yellow": 60,
        "max_green": None,
        "max_yellow": None,
        "unit": "mg",
        "sort_order": 12,
        "tip_text": "Mind. 90mg Vitamin C pro Tag. Frisches Obst und Gemüse bei jeder Mahlzeit.",
    },
    # --- Event-level rules (averages) ---
    {
        "name": "Energie (Durchschnitt)",
        "parameter": "energy_kj",
        "scope": "meal_event",
        "min_green": 8000,
        "min_yellow": 6500,
        "max_green": 11000,
        "max_yellow": 13000,
        "unit": "kJ",
        "sort_order": 1,
        "tip_text": "Der Energiedurchschnitt über alle Tage sollte im Zielbereich liegen.",
    },
    {
        "name": "Eiweiß (Durchschnitt)",
        "parameter": "protein_g",
        "scope": "meal_event",
        "min_green": 45,
        "min_yellow": 35,
        "max_green": 80,
        "max_yellow": 100,
        "unit": "g",
        "sort_order": 2,
        "tip_text": "Der Eiweißdurchschnitt über alle Tage sollte 45-80g betragen.",
    },
    # --- Meal-level rules ---
    {
        "name": "Energie (Mahlzeit)",
        "parameter": "energy_kj",
        "scope": "meal",
        "min_green": 2000,
        "min_yellow": 1500,
        "max_green": 4000,
        "max_yellow": 5000,
        "unit": "kJ",
        "sort_order": 1,
        "tip_text": "Eine Mahlzeit sollte 2000-4000 kJ liefern.",
    },
    {
        "name": "Zucker (Mahlzeit)",
        "parameter": "sugar_g",
        "scope": "meal",
        "min_green": None,
        "min_yellow": None,
        "max_green": 20,
        "max_yellow": 30,
        "unit": "g",
        "sort_order": 2,
        "tip_text": "Max 20g Zucker pro Mahlzeit. Süße Soßen und Desserts beachten.",
    },
    # --- Recipe-level rules ---
    {
        "name": "Eiweiß (Rezept)",
        "parameter": "protein_g",
        "scope": "recipe",
        "min_green": 30,
        "min_yellow": 20,
        "max_green": None,
        "max_yellow": None,
        "unit": "g",
        "sort_order": 1,
        "tip_text": "Rezepte sollten mind. 30g Eiweiß pro Portion enthalten.",
    },
    {
        "name": "Zucker (Rezept)",
        "parameter": "sugar_g",
        "scope": "recipe",
        "min_green": None,
        "min_yellow": None,
        "max_green": 20,
        "max_yellow": 30,
        "unit": "g",
        "sort_order": 2,
        "tip_text": "Max 20g Zucker pro Portion. Natürliche Süße bevorzugen.",
    },
    {
        "name": "Gesättigte Fettsäuren (Rezept)",
        "parameter": "fat_sat_g",
        "scope": "recipe",
        "min_green": None,
        "min_yellow": None,
        "max_green": 20,
        "max_yellow": 25,
        "unit": "g",
        "sort_order": 3,
        "tip_text": "Max 20g gesättigte Fettsäuren pro Portion. Pflanzliche Fette bevorzugen.",
    },
    {
        "name": "Natrium (Rezept)",
        "parameter": "sodium_mg",
        "scope": "recipe",
        "min_green": None,
        "min_yellow": None,
        "max_green": 500,
        "max_yellow": 700,
        "unit": "mg",
        "sort_order": 4,
        "tip_text": "Max 500mg Natrium pro Portion. Kräuter statt Salz verwenden.",
    },
    {
        "name": "Ballaststoffe (Rezept)",
        "parameter": "fibre_g",
        "scope": "recipe",
        "min_green": 5,
        "min_yellow": 3,
        "max_green": None,
        "max_yellow": None,
        "unit": "g",
        "sort_order": 5,
        "tip_text": "Mind. 5g Ballaststoffe pro Portion. Vollkorn und Gemüse verwenden.",
    },
]


class Command(BaseCommand):
    help = "Seed DGE-based rules for the suggestion system"

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Remove all existing rules before seeding",
        )

    def handle(self, *args, **options):
        if options["clear"]:
            count = Rule.objects.count()
            Rule.objects.all().delete()
            self.stdout.write(f"Deleted {count} existing rules.")

        created = 0
        updated = 0

        for rule_data in RULES_DATA:
            obj, was_created = Rule.objects.update_or_create(
                parameter=rule_data["parameter"],
                scope=rule_data["scope"],
                name=rule_data["name"],
                defaults={
                    "min_green": rule_data.get("min_green"),
                    "min_yellow": rule_data.get("min_yellow"),
                    "max_green": rule_data.get("max_green"),
                    "max_yellow": rule_data.get("max_yellow"),
                    "unit": rule_data.get("unit", ""),
                    "sort_order": rule_data.get("sort_order", 0),
                    "tip_text": rule_data.get("tip_text", ""),
                    "is_active": True,
                    "rule_type": "nutrition",
                },
            )
            if was_created:
                created += 1
            else:
                updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {created} new rules, updated {updated} existing rules. "
                f"Total: {Rule.objects.count()} rules."
            )
        )
