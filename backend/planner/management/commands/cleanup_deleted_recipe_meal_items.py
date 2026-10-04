"""List (and with --apply remove) meal plan items that point at soft-deleted recipes."""

from django.core.management.base import BaseCommand
from django.db import transaction

from planner.models.meal_plan import MealItem


class Command(BaseCommand):
    help = "Dry-run by default: list meal items whose recipe is soft-deleted; --apply removes them."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Delete the listed items (default is a dry-run).")

    def handle(self, *args, **options):
        items = list(
            MealItem.objects.filter(recipe__deleted_at__isnull=False)
            .select_related("recipe", "meal__meal_plan")
            .order_by("meal__meal_plan_id", "meal_id", "id")
        )
        if not items:
            self.stdout.write("No meal items reference a deleted recipe.")
            return

        for item in items:
            plan = item.meal.meal_plan
            self.stdout.write(
                f"plan {plan.id} '{plan.name}' | meal {item.meal_id} | item {item.id} | recipe '{item.recipe.title}'"
            )

        if not options["apply"]:
            self.stdout.write(f"Dry-run: {len(items)} item(s) would be removed. Re-run with --apply.")
            return

        with transaction.atomic():
            for item in items:
                item.delete()
        self.stdout.write(self.style.SUCCESS(f"Removed {len(items)} meal item(s)."))
