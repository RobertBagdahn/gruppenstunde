"""Soft-delete unused, auto-generated placeholder portions.

A legacy batch job created "1 Stück (150g)" and "1 Scheibe (50g)" for almost
every ingredient — including Rahmspinat, Apfelsaft or Dinkelmehl. Their weights
are unconfirmed guesses, so they show "Gewicht unbekannt" when picked.

Only portions that are unreferenced, not confirmed/imported, and whose
ingredient keeps at least one other trusted portion are soft-deleted. When the
placeholder was the main portion (rank 1), the best remaining trusted portion
is promoted; the technical "g" portion only as a last resort.
Dry-run by default; pass --apply to write changes.
"""

from __future__ import annotations

from collections import Counter

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from recipe.models import RecipeItem
from supply.models import Portion
from supply.services.portion_resolution import resolve_trusted_weight_result

PLACEHOLDER_NAMES = ("1 Stück (150g)", "1 Scheibe (50g)")


class Command(BaseCommand):
    help = "Soft-delete unused auto-generated placeholder portions like '1 Stück (150g)'."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args, **options):
        referenced = set(RecipeItem.objects.values_list("portion_id", flat=True))
        candidates = (
            Portion.objects.filter(name__in=PLACEHOLDER_NAMES, deleted_at__isnull=True)
            .exclude(id__in=referenced)
            .select_related("ingredient", "measuring_unit")
        )
        to_delete: list[Portion] = []
        kept = Counter()
        for portion in candidates:
            if resolve_trusted_weight_result(portion).is_trusted:
                kept["trusted"] += 1
                continue
            has_alternative = any(
                resolve_trusted_weight_result(other).is_trusted
                for other in portion.ingredient.portions.filter(deleted_at__isnull=True)
                .exclude(pk=portion.pk)
                .select_related("measuring_unit")
            )
            if not has_alternative:
                kept["no_alternative"] += 1
                self.stdout.write(f"KEEP     {portion.ingredient.name} / {portion.name} (no other trusted portion)")
                continue
            to_delete.append(portion)

        by_name = Counter(portion.name for portion in to_delete)
        self.stdout.write(
            f"SUMMARY delete={len(to_delete)} {dict(by_name)} kept_trusted={kept['trusted']} "
            f"kept_no_alternative={kept['no_alternative']}"
        )
        if not options["apply"]:
            self.stdout.write("DRY_RUN no changes written")
            return

        now = timezone.now()
        promoted = 0
        with transaction.atomic():
            for portion in to_delete:
                was_main = portion.rank == 1
                portion.deleted_at = now
                portion.save(update_fields=["deleted_at", "updated_at"])
                if was_main and self._promote_main_portion(portion.ingredient):
                    promoted += 1
        self.stdout.write(f"APPLIED deleted={len(to_delete)} promoted={promoted}")

    def _promote_main_portion(self, ingredient) -> bool:
        active = ingredient.portions.filter(deleted_at__isnull=True).select_related("measuring_unit")
        if active.filter(rank=1).exists():
            return False
        trusted = [p for p in active.order_by("rank", "id") if resolve_trusted_weight_result(p).is_trusted]
        preferred = [p for p in trusted if p.name.lower() != "g"]
        target = (preferred or trusted or [None])[0]
        if target is None:
            return False
        target.rank = 1
        target.save(update_fields=["rank", "updated_at"])
        return True
