"""Management command to find and deduplicate case-insensitive duplicate alias names per ingredient."""

from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db.models.functions import Lower

from supply.models.ingredient import Ingredient, IngredientAlias


class Command(BaseCommand):
    help = "Find and remove case-insensitive duplicate alias names per ingredient (keeps oldest, removes duplicates)"

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be deleted without actually deleting",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        mode = "DRY RUN" if dry_run else "EXECUTING"

        self.stdout.write(self.style.SUCCESS(f"\n=== Deduplicating Ingredient Aliases ({mode}) ===\n"))

        deleted_count = 0
        duplicate_groups_found = 0

        # Find case-insensitive duplicates per ingredient
        for ingredient in Ingredient.objects.all():
            # Get all aliases for this ingredient
            aliases = IngredientAlias.objects.filter(ingredient=ingredient)

            # Group by lowercase name and count
            alias_groups = (
                aliases.annotate(name_lower=Lower("name"))
                .values("name_lower")
                .annotate(count=Count("id"))
                .filter(count__gt=1)
            )

            if not alias_groups.exists():
                continue

            duplicate_groups_found += 1
            self.stdout.write(
                self.style.WARNING(f"\n🍖 Ingredient: {ingredient.name} (ID: {ingredient.id}, slug: {ingredient.slug})")
            )

            for group in alias_groups:
                name_lower = group["name_lower"]
                count = group["count"]

                # Get all aliases with this lowercase name, ordered by creation time (oldest first)
                dups = aliases.filter(name__iexact=name_lower).order_by("created_at", "id")

                self.stdout.write(f"  Duplicate name (case-insensitive): '{name_lower}' ({count} occurrences)")

                # Keep the first (oldest), delete the rest
                keep_alias = dups.first()
                delete_aliases = dups[1:]

                self.stdout.write(f"    ✓ Keep: ID={keep_alias.id}, Name='{keep_alias.name}', Created={keep_alias.created_at}")

                for alias in delete_aliases:
                    deleted_count += 1
                    self.stdout.write(
                        f"    ✗ Delete: ID={alias.id}, Name='{alias.name}', Created={alias.created_at}, "
                        f"rank={alias.rank}, is_generic={alias.is_generic}"
                    )

                    if not dry_run:
                        alias.delete()

        self.stdout.write(self.style.SUCCESS(f"\n=== Summary ==="))
        self.stdout.write(f"Duplicate groups found: {duplicate_groups_found}")
        self.stdout.write(f"Aliases to delete: {deleted_count}")

        if dry_run:
            self.stdout.write(self.style.WARNING("(DRY RUN — no aliases were actually deleted)"))
        else:
            self.stdout.write(self.style.SUCCESS(f"✓ Deleted {deleted_count} duplicate aliases"))
