"""Backfill weights explicitly written in legacy portion names."""

from django.core.management.base import BaseCommand
from django.utils import timezone

from recipe.models import RecipeItem
from supply.choices import PortionWeightSource, PortionWeightStatus
from supply.models import Portion
from supply.services.portion_repair import extract_explicit_weight_g


class Command(BaseCommand):
    help = "Backfill explicit gram weights from portion names without changing referenced portions."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--limit", type=int, default=None)

    def handle(self, *args, **options):
        apply = options["apply"]
        limit = options["limit"]
        candidates = []
        blocked = 0
        qs = Portion.objects.active().order_by("id")
        for portion in qs.iterator():
            weight = extract_explicit_weight_g(portion.name)
            if weight is None:
                continue
            if (
                portion.weight_g is not None
                and abs(float(portion.weight_g) - weight) <= 1e-6
                and portion.weight_status in {PortionWeightStatus.IMPORTED, PortionWeightStatus.CONFIRMED}
            ):
                continue
            if RecipeItem.objects.filter(portion=portion).exists():
                if portion.weight_g is None or abs(float(portion.weight_g) - weight) > 1e-6:
                    blocked += 1
                    continue
            candidates.append((portion.id, weight))
            if limit is not None and len(candidates) >= max(limit, 0):
                break

        self.stdout.write(f"CANDIDATES {len(candidates)}")
        self.stdout.write(f"BLOCKED_REFERENCED {blocked}")
        if not apply:
            self.stdout.write("DRY_RUN no changes written")
            return

        applied = 0
        for portion_id, weight in candidates:
            try:
                portion = Portion.objects.active().get(pk=portion_id)
            except Portion.DoesNotExist:
                # Deleted or superseded since the candidate list was built —
                # a superseded portion must stay frozen at its old weight.
                continue
            portion.weight_g = weight
            portion.weight_status = PortionWeightStatus.IMPORTED
            portion.weight_source = PortionWeightSource.IMPORT
            portion.weight_confirmed_at = timezone.now()
            portion.save(
                update_fields=["weight_g", "weight_status", "weight_source", "weight_confirmed_at", "updated_at"]
            )
            applied += 1
        self.stdout.write(f"APPLIED {applied}")
