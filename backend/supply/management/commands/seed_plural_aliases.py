"""Seed plural/singular alias pairs for common ingredients.

Ensures that searching for "Zwiebeln" finds the ingredient "Zwiebel" (and vice versa),
preventing the AI ingredient suggestion service from treating them as distinct ingredients.

Usage:
    uv run python manage.py seed_plural_aliases
    uv run python manage.py seed_plural_aliases --dry-run
"""

from django.core.management.base import BaseCommand

from supply.models import Ingredient, IngredientAlias

# Pairs: (canonical_name_fragment, alias_to_add)
# These are added as aliases to any ingredient whose name STARTS WITH the canonical fragment.
PLURAL_PAIRS = [
    # Singular → Plural alias
    ("Zwiebel frisch", "Zwiebeln frisch"),
    ("Zwiebel", "Zwiebeln"),
    ("Tomate frisch", "Tomaten frisch"),
    ("Tomate", "Tomaten"),
    ("Paprika frisch", "Paprikas frisch"),
    ("Paprika", "Paprikas"),
    ("Karotte frisch", "Karotten frisch"),
    ("Karotte", "Karotten"),
    ("Kartoffel frisch", "Kartoffeln frisch"),
    ("Kartoffel", "Kartoffeln"),
    ("Zucchini frisch", "Zucchinis frisch"),
    ("Zucchini", "Zucchinis"),
    ("Champignon frisch", "Champignons frisch"),
    ("Champignon", "Champignons"),
    ("Erdbeere frisch", "Erdbeeren frisch"),
    ("Erdbeere TK", "Erdbeeren TK"),
    ("Erdbeere", "Erdbeeren"),
    ("Gurke frisch", "Gurken frisch"),
    ("Gurke", "Gurken"),
    ("Zehe Knoblauch", "Zehen Knoblauch"),
    # Common name variants (not strictly plural but aliased)
    ("Zwiebel rot frisch", "Rote Zwiebel frisch"),
    ("Zwiebel rot frisch", "Rote Zwiebeln frisch"),
]


class Command(BaseCommand):
    help = "Seed plural/singular alias pairs for common ingredients"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be added without making changes",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        created_count = 0
        skipped_count = 0

        for canonical_fragment, alias_name in PLURAL_PAIRS:
            # Find ingredients whose name starts with (or exactly matches) the canonical fragment
            ingredients = Ingredient.objects.filter(
                name__iexact=canonical_fragment
            ) | Ingredient.objects.filter(
                name__istartswith=canonical_fragment + " "
            )

            for ingredient in ingredients:
                # Check if alias already exists
                alias_lower = alias_name.lower()
                existing = ingredient.aliases.filter(name__iexact=alias_name).exists()
                if existing:
                    skipped_count += 1
                    continue

                if dry_run:
                    self.stdout.write(
                        f"[DRY-RUN] Would add alias '{alias_name}' → '{ingredient.name}'"
                    )
                else:
                    IngredientAlias.objects.create(
                        ingredient=ingredient,
                        name=alias_name,
                    )
                    self.stdout.write(
                        f"Added alias '{alias_name}' → '{ingredient.name}'"
                    )
                created_count += 1

        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry run complete. Would create {created_count} aliases, skip {skipped_count} existing."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(
                    f"Created {created_count} aliases, skipped {skipped_count} existing."
                )
            )
