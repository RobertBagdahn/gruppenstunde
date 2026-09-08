"""Report recipe items that carry no portion reference.

`RecipeItem.portion` is nullable and a null value is interpreted as grams (see
the model help text). Earlier URL imports produced such rows whenever no unit
could be resolved, silently turning "4 Möhren" into "4 g". The import no longer
creates them, but existing rows need review.

Read-only by design: the originally intended unit cannot be reconstructed, so
an automatic correction would only replace one wrong number with another.
"""

from django.core.management.base import BaseCommand, CommandParser

from recipe.models import RecipeItem


class Command(BaseCommand):
    help = "List recipe items without a resolved portion (read-only report)"

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument(
            "--limit",
            type=int,
            default=0,
            help="Limit the number of reported items (0 = no limit)",
        )

    def handle(self, *args, **options) -> None:
        limit = options["limit"]

        items = (
            RecipeItem.objects.filter(portion__isnull=True)
            .select_related("recipe")
            .order_by("recipe__title", "sort_order")
        )
        total = items.count()

        if total == 0:
            self.stdout.write(self.style.SUCCESS("Keine Rezeptpositionen ohne Portion gefunden."))
            return

        if limit > 0:
            items = items[:limit]

        self.stdout.write(self.style.WARNING(f"{total} Rezeptposition(en) ohne Portion gefunden:"))
        self.stdout.write("")

        recipe_ids = set()
        for item in items:
            recipe = item.recipe
            recipe_ids.add(recipe.id)
            label = item.note or "(ohne Anmerkung)"
            self.stdout.write(
                f"  Rezept {recipe.id} '{recipe.title}' (slug={recipe.slug}) "
                f"— Item {item.id}: quantity={item.quantity} note={label}"
            )

        self.stdout.write("")
        self.stdout.write(f"Betroffene Rezepte: {len(recipe_ids)}")
        self.stdout.write(
            "Hinweis: Die Mengen werden aktuell als Gramm interpretiert. "
            "Eine automatische Korrektur ist nicht moeglich, da die urspruenglich "
            "gemeinte Einheit nicht rekonstruierbar ist."
        )
