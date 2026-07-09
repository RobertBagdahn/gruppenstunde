"""Seed IngredientSeason data for common German seasonal produce.

Usage:
    uv run python manage.py seed_ingredient_seasons

Idempotent: updates existing entries, creates missing ones.
"""

from django.core.management.base import BaseCommand

from supply.models import Ingredient, IngredientSeason

# Month ranges for common German seasonal produce.
# Format: (ingredient_name_substring, [list of months in season])
# Uses name substring matching (case-insensitive) to support variations.
SEASONAL_PRODUCE: list[tuple[str, list[int], bool]] = [
    ("apfel", [1, 2, 3, 9, 10, 11, 12], True),
    ("apfel", [4, 5, 6, 7, 8], False),
    ("austral", [1, 2, 3, 4, 5, 6, 9, 10, 11, 12], True),
    ("austral", [7, 8], False),
    ("birne", [1, 2, 8, 9, 10, 11, 12], True),
    ("birne", [3, 4, 5, 6, 7], False),
    ("blumenkohl", [5, 6, 7, 8, 9, 10], True),
    ("blumenkohl", [1, 2, 3, 4, 11, 12], False),
    ("brokkoli", [6, 7, 8, 9, 10], True),
    ("brokkoli", [1, 2, 3, 4, 5, 11, 12], False),
    ("champignon", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("erdbeere", [5, 6, 7, 8], True),
    ("erdbeere", [1, 2, 3, 4, 9, 10, 11, 12], False),
    ("erbsen", [5, 6, 7, 8], True),
    ("erbsen", [1, 2, 3, 4, 9, 10, 11, 12], False),
    ("feldsalat", [1, 2, 10, 11, 12], True),
    ("feldsalat", [3, 4, 5, 6, 7, 8, 9], False),
    ("fenchel", [6, 7, 8, 9, 10], True),
    ("fenchel", [1, 2, 3, 4, 5, 11, 12], False),
    ("grünkohl", [1, 2, 10, 11, 12], True),
    ("grünkohl", [3, 4, 5, 6, 7, 8, 9], False),
    ("gurke", [5, 6, 7, 8, 9], True),
    ("gurke", [1, 2, 3, 4, 10, 11, 12], False),
    ("himbeere", [6, 7, 8, 9], True),
    ("himbeere", [1, 2, 3, 4, 5, 10, 11, 12], False),
    ("heidelbeere", [7, 8, 9], True),
    ("heidelbeere", [1, 2, 3, 4, 5, 6, 10, 11, 12], False),
    ("kartoffel", [1, 2, 3, 8, 9, 10, 11, 12], True),
    ("kartoffel", [4, 5, 6, 7], False),
    ("kirsch", [6, 7, 8], True),
    ("kirsch", [1, 2, 3, 4, 5, 9, 10, 11, 12], False),
    ("knoblauch", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("kohlrabi", [5, 6, 7, 8, 9, 10], True),
    ("kohlrabi", [1, 2, 3, 4, 11, 12], False),
    ("lauch", [1, 2, 3, 4, 5, 8, 9, 10, 11, 12], True),
    ("lauch", [6, 7], False),
    ("möhre", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("möhren", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("karotte", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("paprika", [6, 7, 8, 9, 10], True),
    ("paprika", [1, 2, 3, 4, 5, 11, 12], False),
    ("pfirsich", [7, 8, 9], True),
    ("pfirsich", [1, 2, 3, 4, 5, 6, 10, 11, 12], False),
    ("pilz", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("radieschen", [4, 5, 6, 7, 8, 9], True),
    ("radieschen", [1, 2, 3, 10, 11, 12], False),
    ("rhabarber", [4, 5, 6], True),
    ("rhabarber", [1, 2, 3, 7, 8, 9, 10, 11, 12], False),
    ("rosenkohl", [1, 2, 10, 11, 12], True),
    ("rosenkohl", [3, 4, 5, 6, 7, 8, 9], False),
    ("rote bete", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("rotkohl", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("rotkraut", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("salat", [4, 5, 6, 7, 8, 9], True),
    ("salat", [1, 2, 3, 10, 11, 12], False),
    ("sauerkraut", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("sellerie", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("spargel", [4, 5, 6], True),
    ("spargel", [1, 2, 3, 7, 8, 9, 10, 11, 12], False),
    ("spinat", [4, 5, 6, 7, 8, 9], True),
    ("spinat", [1, 2, 3, 10, 11, 12], False),
    ("tomate", [7, 8, 9], True),
    ("tomate", [1, 2, 3, 4, 5, 6, 10, 11, 12], False),
    ("zucchini", [6, 7, 8, 9, 10], True),
    ("zucchini", [1, 2, 3, 4, 5, 11, 12], False),
    ("zwiebel", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("kürbis", [9, 10, 11], True),
    ("kürbis", [1, 2, 3, 4, 5, 6, 7, 8, 12], False),
    ("aubergine", [7, 8, 9], True),
    ("aubergine", [1, 2, 3, 4, 5, 6, 10, 11, 12], False),
    ("bohne", [7, 8, 9], True),
    ("bohne", [1, 2, 3, 4, 5, 6, 10, 11, 12], False),
    ("aprikose", [7, 8], True),
    ("aprikose", [1, 2, 3, 4, 5, 6, 9, 10, 11, 12], False),
    ("mirabelle", [8, 9], True),
    ("mirabelle", [1, 2, 3, 4, 5, 6, 7, 10, 11, 12], False),
    ("pflaume", [8, 9, 10], True),
    ("pflaume", [1, 2, 3, 4, 5, 6, 7, 11, 12], False),
    ("zwetschge", [8, 9, 10], True),
    ("zwetschge", [1, 2, 3, 4, 5, 6, 7, 11, 12], False),
    ("traube", [8, 9, 10], True),
    ("traube", [1, 2, 3, 4, 5, 6, 7, 11, 12], False),
    ("weintraube", [8, 9, 10], True),
    ("weintraube", [1, 2, 3, 4, 5, 6, 7, 11, 12], False),
    ("marille", [7, 8], True),
    ("marille", [1, 2, 3, 4, 5, 6, 9, 10, 11, 12], False),
    ("nüsse", [9, 10, 11], True),
    ("nüsse", [1, 2, 3, 4, 5, 6, 7, 8, 12], False),
    ("walnuss", [9, 10], True),
    ("walnuss", [1, 2, 3, 4, 5, 6, 7, 8, 11, 12], False),
    ("haselnuss", [9, 10], True),
    ("haselnuss", [1, 2, 3, 4, 5, 6, 7, 8, 11, 12], False),
    ("kräuter", [4, 5, 6, 7, 8, 9], True),
    ("kräuter", [1, 2, 3, 10, 11, 12], False),
    ("petersilie", [4, 5, 6, 7, 8, 9, 10], True),
    ("petersilie", [1, 2, 3, 11, 12], False),
    ("schnittlauch", [3, 4, 5, 6, 7, 8, 9, 10], True),
    ("schnittlauch", [1, 2, 11, 12], False),
    ("basilikum", [5, 6, 7, 8, 9], True),
    ("basilikum", [1, 2, 3, 4, 10, 11, 12], False),
    ("dill", [5, 6, 7, 8, 9], True),
    ("dill", [1, 2, 3, 4, 10, 11, 12], False),
    ("minze", [5, 6, 7, 8, 9], True),
    ("minze", [1, 2, 3, 4, 10, 11, 12], False),
    ("pastinake", [1, 2, 10, 11, 12], True),
    ("pastinake", [3, 4, 5, 6, 7, 8, 9], False),
    ("porree", [1, 2, 3, 4, 5, 8, 9, 10, 11, 12], True),
    ("porree", [6, 7], False),
    ("rettich", [5, 6, 7, 8, 9, 10], True),
    ("rettich", [1, 2, 3, 4, 11, 12], False),
    ("steckrübe", [1, 2, 10, 11, 12], True),
    ("steckrübe", [3, 4, 5, 6, 7, 8, 9], False),
    ("wirsing", [1, 2, 10, 11, 12], True),
    ("wirsing", [3, 4, 5, 6, 7, 8, 9], False),
    ("weißkohl", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
    ("weißkraut", [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], True),
]


class Command(BaseCommand):
    help = "Seed IngredientSeason data for common German seasonal produce."

    def handle(self, **options):
        created = 0
        updated = 0
        skipped = 0

        for name_part, months, is_high in SEASONAL_PRODUCE:
            ingredients = Ingredient.objects.filter(name__icontains=name_part)
            if not ingredients.exists():
                skipped += 1
                continue

            for ingredient in ingredients:
                for month in months:
                    obj, was_created = IngredientSeason.objects.update_or_create(
                        ingredient=ingredient,
                        month=month,
                        defaults={"is_high_season": is_high},
                    )
                    if was_created:
                        created += 1
                    else:
                        updated += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created}, updated {updated} season entries "
                f"(skipped {skipped} unmatched ingredient patterns)."
            )
        )
