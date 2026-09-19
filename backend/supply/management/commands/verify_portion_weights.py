"""Read-only verification for explicit portion weights."""

from django.core.management.base import BaseCommand

from supply.models import Ingredient, Portion


class Command(BaseCommand):
    help = "Verify one ingredient and count active untrusted explicit weights."

    def add_arguments(self, parser):
        parser.add_argument("--slug", default="speisezwiebeln")

    def handle(self, *args, **options):
        ingredient = Ingredient.objects.get(slug=options["slug"])
        portions = ingredient.portions.filter(deleted_at__isnull=True).select_related("measuring_unit")
        for portion in portions:
            self.stdout.write(
                f"PORTION id={portion.id} name={portion.name!r} quantity={portion.quantity} "
                f"weight_g={portion.weight_g} status={portion.weight_status} source={portion.weight_source} "
                f"trusted={portion.is_weight_trusted}"
            )
        self.stdout.write(
            f"ACTIVE_MISSING_WEIGHT {Portion.objects.filter(deleted_at__isnull=True, weight_g__isnull=True).count()}"
        )
