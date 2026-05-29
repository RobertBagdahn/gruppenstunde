"""Seed RecipeHint rules from legacy Inspi data."""

from django.core.management.base import BaseCommand

from recipe.models import RecipeHint


LEGACY_HINTS = [
    {"hint": "viel mehr Energie", "value": 1500.0, "hint_level": "error", "min_max": "min", "parameter": "energy_kj"},
    {"hint": "viel mehr Gewicht", "value": 200.0, "hint_level": "error", "min_max": "min", "parameter": "weight_g"},
    {"hint": "etwas mehr Gewicht", "value": 300.0, "hint_level": "warn", "min_max": "min", "parameter": "weight_g"},
    {"hint": "etwas weniger Gewicht", "value": 650.0, "hint_level": "warn", "min_max": "max", "parameter": "weight_g"},
    {"hint": "viel weniger Gewicht", "value": 750.0, "hint_level": "error", "min_max": "max", "parameter": "weight_g"},
    {"hint": "viel mehr Eiweiß", "value": 10.0, "hint_level": "error", "min_max": "min", "parameter": "protein_g"},
    {"hint": "mehr Eiweiß", "value": 30.0, "hint_level": "warn", "min_max": "min", "parameter": "protein_g"},
    {"hint": "Nicht gesund", "value": 2.0, "hint_level": "warn", "min_max": "max", "parameter": "nutri_class"},
    {"hint": "Nicht gesund genug", "value": 3.0, "hint_level": "error", "min_max": "max", "parameter": "nutri_class"},
    {"hint": "Viel zuviel Zucker", "value": 40.0, "hint_level": "error", "min_max": "max", "parameter": "sugar_g"},
    {"hint": "Viel Zucker", "value": 20.0, "hint_level": "warn", "min_max": "max", "parameter": "sugar_g"},
    {"hint": "Viel zuviel gesät. Fettsäuren", "value": 40.0, "hint_level": "error", "min_max": "max", "parameter": "fat_sat_g"},
    {"hint": "viel gesät. Fettsäuren", "value": 20.0, "hint_level": "warn", "min_max": "max", "parameter": "fat_sat_g"},
    {"hint": "viel Natrium", "value": 500.0, "hint_level": "warn", "min_max": "max", "parameter": "sodium_mg"},
    {"hint": "zu viel Natrium", "value": 1000.0, "hint_level": "error", "min_max": "max", "parameter": "sodium_mg"},
    {"hint": "viel mehr Ballaststoffe", "value": 10.0, "hint_level": "error", "min_max": "min", "parameter": "fibre_g"},
    {"hint": "mehr Ballaststoffe", "value": 30.0, "hint_level": "warn", "min_max": "min", "parameter": "fibre_g"},
]


class Command(BaseCommand):
    help = "Seed RecipeHint rules from legacy Inspi data"

    def add_arguments(self, parser):
        parser.add_argument("--recipe-type", default="warm_meal", help="Recipe type for all hints")
        parser.add_argument("--recipe-objective", default="health", help="Recipe objective for all hints")
        parser.add_argument("--clear", action="store_true", help="Delete all existing hints first")

    def handle(self, *args, **options):
        recipe_type = options["recipe_type"]
        recipe_objective = options["recipe_objective"]

        if options["clear"]:
            deleted, _ = RecipeHint.objects.all().delete()
            self.stdout.write(f"Deleted {deleted} existing hints")

        created = 0
        for data in LEGACY_HINTS:
            _, was_created = RecipeHint.objects.get_or_create(
                hint=data["hint"],
                parameter=data["parameter"],
                min_max=data["min_max"],
                defaults={
                    "name": data["hint"],
                    "value": data["value"],
                    "hint_level": data["hint_level"],
                    "recipe_type": recipe_type,
                    "recipe_objective": recipe_objective,
                },
            )
            if was_created:
                created += 1

        self.stdout.write(self.style.SUCCESS(f"Created {created} hints ({len(LEGACY_HINTS) - created} already existed)"))
