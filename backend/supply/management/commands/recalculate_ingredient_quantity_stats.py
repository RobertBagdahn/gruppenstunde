from django.core.management.base import BaseCommand

from supply.services.ingredient_quantity_stats import recalculate_ingredient_quantity_stats


class Command(BaseCommand):
    help = "Recalculate typical grams per person of every ingredient (baseline for quantity outlier checks)."

    def handle(self, *args, **options) -> None:
        count = recalculate_ingredient_quantity_stats()
        self.stdout.write(self.style.SUCCESS(f"Mengenstatistik für {count} Zutaten berechnet."))
