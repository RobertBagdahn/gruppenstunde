from django.core.management.base import BaseCommand, CommandParser

from recipe.models import Recipe, RecipeItem


class Command(BaseCommand):
    help = (
        "Report recipes with unrealistic per-person quantities. Report only: recipe quantities are "
        "stored per person (portions=1), so fixes happen by editing the quantities."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--threshold",
            type=float,
            default=5000.0,
            help="Max realistic weight per person in grams (default: 5000)",
        )

    def handle(self, *args, **options) -> None:
        threshold = options["threshold"]

        self.stdout.write(f"\n{'=' * 60}")
        self.stdout.write("  Recipe Data Validation (report only)")
        self.stdout.write(f"  Threshold: {threshold}g per person")
        self.stdout.write(f"{'=' * 60}\n")

        flagged_recipes = self._find_problematic_recipes(threshold)

        if not flagged_recipes:
            self.stdout.write(self.style.SUCCESS("No problematic recipes found."))
            return

        self.stdout.write(f"Found {len(flagged_recipes)} problematic recipe(s):\n")

        for recipe, weight_per_person, items in flagged_recipes:
            self._report_recipe(recipe, weight_per_person, items)

        self.stdout.write(f"\n{'=' * 60}")
        self.stdout.write(
            self.style.WARNING(f"{len(flagged_recipes)} recipe(s) need attention. Correct their quantities per person.")
        )

    def _find_problematic_recipes(self, threshold: float) -> list[tuple[Recipe, float, list[tuple[str, float]]]]:
        """Recipes whose per-person weight (stored quantities) exceeds ``threshold`` grams."""
        results = []

        recipes = Recipe.objects.all()
        for recipe in recipes:
            items = RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient")
            if not items.exists():
                continue

            problematic_items: list[tuple[str, float]] = []
            weight_per_person = 0.0

            for item in items:
                if item.portion is None:
                    continue
                weight = float(item.quantity or 0) * float(item.portion.weight_g or 0)
                weight_per_person += weight

                if weight > threshold:
                    problematic_items.append((item.portion.ingredient.name, weight))

            if problematic_items or weight_per_person > threshold:
                results.append((recipe, weight_per_person, problematic_items))

        return results

    def _report_recipe(self, recipe: Recipe, weight_per_person: float, items: list[tuple[str, float]]) -> None:
        self.stdout.write(f"\n  Recipe: {recipe.title} (ID={recipe.id})")
        self.stdout.write(f"  Per person: {weight_per_person:.0f}g")

        if items:
            self.stdout.write("  Problematic ingredients:")
            for name, weight_pp in items:
                self.stdout.write(f"    - {name}: {weight_pp:.0f}g per person")
