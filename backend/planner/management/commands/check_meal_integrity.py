"""Report-only check for meal-plan integrity issues (never writes).

Run before deploying the ``0007`` planner migration on a database, especially
production: it surfaces exactly what the migration's data cleanup and the new
constraints will touch, without changing anything.
"""

from django.core.management.base import BaseCommand
from django.db.models import Count
from django.db.models.functions import TruncDate

from planner.models import Meal, MealItem, MealTypeChoices


class Command(BaseCommand):
    help = "Report meal-plan integrity issues (reference meals with a date, duplicate regular meals, meals outside their plan's range, ingredient items without a quantity). Dry-run only."

    def handle(self, *args, **options):
        ref_with_date = Meal.objects.filter(is_reference=True).exclude(
            start_datetime__isnull=True, end_datetime__isnull=True
        )
        self.stdout.write(f"Referenz-Mahlzeiten mit Datum: {ref_with_date.count()}")
        for m in ref_with_date.select_related("meal_plan")[:20]:
            self.stdout.write(f"  #{m.id} plan={m.meal_plan_id} type={m.meal_type} start={m.start_datetime}")

        duplicates = list(
            Meal.objects.filter(is_reference=False)
            .exclude(meal_type=MealTypeChoices.SNACK)
            .annotate(day=TruncDate("start_datetime"))
            .values("meal_plan_id", "day", "meal_type")
            .annotate(n=Count("id"))
            .filter(n__gt=1)
        )
        self.stdout.write(f"Doppelte reguläre Mahlzeiten (Plan/Tag/Typ): {len(duplicates)}")
        for d in duplicates[:20]:
            self.stdout.write(f"  plan={d['meal_plan_id']} day={d['day']} type={d['meal_type']} count={d['n']}")

        outside = [
            m.id
            for m in Meal.objects.filter(is_reference=False, start_datetime__isnull=False).select_related("meal_plan")
            if m.meal_plan.start_datetime
            and (
                m.start_datetime.date() < m.meal_plan.start_datetime.date()
                or (m.meal_plan.end_datetime and m.start_datetime.date() > m.meal_plan.end_datetime.date())
            )
        ]
        self.stdout.write(f"Mahlzeiten außerhalb des Planzeitraums: {len(outside)} {outside[:20]}")

        missing_qty = MealItem.objects.filter(ingredient__isnull=False).filter(quantity__isnull=True)
        self.stdout.write(
            f"Zutaten-Einträge ohne Menge: {missing_qty.count()} {list(missing_qty.values_list('id', flat=True)[:20])}"
        )

        self.stdout.write(self.style.WARNING("Nur Bericht — es wurden keine Daten geändert."))
