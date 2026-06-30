"""Seed drink recipes for the breakfast wizard.

DEPRECATED: Use seed_breakfast_catalog instead.
This command creates a subset of drinks (Kaffee, Kakao, Tee, Milch) with
conflicting nutritional values compared to seed_breakfast_catalog.
seed_breakfast_catalog creates 6 drink ingredients + 3 drink recipes
with consistent, BE-calibrated nutritional data.

Legacy: creates 4 basic drink recipes (Kaffee, Kakao, Tee, Milch) with recipe_type="drink".
Kept for compatibility with existing data.

Idempotent: uses slug-based deduplication.
"""

from django.core.management.base import BaseCommand

from content.choices import ContentStatus
from recipe.models import Recipe

DRINK_RECIPES = [
    {
        "title": "Kaffee",
        "slug": "kaffee",
        "cached_energy_kcal": 2.0,  # ~2 kcal per 100ml
    },
    {
        "title": "Kakao",
        "slug": "kakao",
        "cached_energy_kcal": 50.0,  # ~50 kcal per 100ml
    },
    {
        "title": "Tee",
        "slug": "tee",
        "cached_energy_kcal": 1.0,  # ~1 kcal per 100ml
    },
    {
        "title": "Milch",
        "slug": "milch",
        "cached_energy_kcal": 65.0,  # ~65 kcal per 100ml
    },
]


class Command(BaseCommand):
    help = "Seed drink recipes with recipe_type='drink' for the breakfast wizard."

    def handle(self, *args, **options):
        created_count = 0
        skipped_count = 0

        for drink in DRINK_RECIPES:
            if Recipe.objects.filter(slug=drink["slug"]).exists():
                skipped_count += 1
                self.stdout.write(f"  SKIP {drink['slug']} (already exists)")
                continue

            Recipe.objects.create(
                title=drink["title"],
                slug=drink["slug"],
                recipe_type="drink",
                portions=1,
                status=ContentStatus.APPROVED,
                summary=f"Getränk: {drink['title']}",
                cached_energy_total_kcal=drink["cached_energy_kcal"],
            )

            created_count += 1
            self.stdout.write(f"  CREATED {drink['slug']}: {drink['title']}")

        self.stdout.write(
            self.style.SUCCESS(f"Created {created_count} drink recipes, skipped {skipped_count} (already exist).")
        )
