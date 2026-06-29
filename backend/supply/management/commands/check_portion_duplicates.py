"""Management command to find case-insensitive duplicate portion names per ingredient."""

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.db.models.functions import Lower

from supply.models.ingredient import Ingredient, Portion


class Command(BaseCommand):
    help = "Find case-insensitive duplicate portion names per ingredient and ingredients with multiple is_default=True portions"

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n=== Checking for portion name duplicates ===\n"))

        # Find case-insensitive duplicates per ingredient
        duplicates_found = False
        for ingredient in Ingredient.objects.all():
            # Get all non-deleted portions for this ingredient
            portions = ingredient.portions.filter(deleted_at__isnull=True)
            
            # Group by lowercase name and count
            portion_groups = (
                portions
                .annotate(name_lower=Lower("name"))
                .values("name_lower")
                .annotate(count=Count("id"))
                .filter(count__gt=1)
            )

            if portion_groups.exists():
                duplicates_found = True
                self.stdout.write(
                    self.style.WARNING(f"\n📌 Ingredient: {ingredient.name} (ID: {ingredient.id}, slug: {ingredient.slug})")
                )
                
                for group in portion_groups:
                    name_lower = group["name_lower"]
                    count = group["count"]
                    # Get all portions with this lowercase name
                    dups = portions.filter(name__iexact=name_lower)
                    self.stdout.write(f"  Duplicate name (case-insensitive): '{name_lower}' ({count} occurrences)")
                    
                    for portion in dups:
                        self.stdout.write(
                            f"    - ID: {portion.id}, Name: '{portion.name}', rank: {portion.rank}, "
                            f"priority: {portion.priority}, is_default: {portion.is_default}, "
                            f"weight_g: {portion.weight_g}, is_system: {portion.is_system}"
                        )

        if not duplicates_found:
            self.stdout.write(self.style.SUCCESS("\n✓ No case-insensitive duplicate portion names found!\n"))

        # Check for multiple is_default=True portions per ingredient
        self.stdout.write(self.style.SUCCESS("\n=== Checking for multiple is_default=True portions ===\n"))

        multi_default_found = False
        for ingredient in Ingredient.objects.all():
            default_portions = ingredient.portions.filter(is_default=True, deleted_at__isnull=True)
            if default_portions.count() > 1:
                multi_default_found = True
                self.stdout.write(
                    self.style.WARNING(f"\n📌 Ingredient: {ingredient.name} (ID: {ingredient.id}, slug: {ingredient.slug})")
                )
                self.stdout.write(f"  Has {default_portions.count()} portions with is_default=True:")
                
                for portion in default_portions:
                    self.stdout.write(
                        f"    - ID: {portion.id}, Name: '{portion.name}', rank: {portion.rank}, "
                        f"priority: {portion.priority}, weight_g: {portion.weight_g}, is_system: {portion.is_system}"
                    )

        if not multi_default_found:
            self.stdout.write(self.style.SUCCESS("\n✓ No ingredients with multiple is_default=True portions found!\n"))

        self.stdout.write(self.style.SUCCESS("\n=== Check Complete ===\n"))
