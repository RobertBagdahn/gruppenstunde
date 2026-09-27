"""Safely remove technical gram placeholders and fill deterministic weights."""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from recipe.models import RecipeItem
from supply.models import Portion
from supply.services.portion_repair import classify_repair_path
from supply.services.portion_resolution import is_piece_like_name


class Command(BaseCommand):
    help = "Dry-run or apply only deterministic, recipe-safe portion cleanups."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--limit", type=int, default=None)

    def handle(self, *args, **options):
        apply = options["apply"]
        limit = options["limit"]
        technical = self._technical_gram_duplicates()
        deterministic = self._deterministic_missing_weights()
        candidates = [*technical, *deterministic]
        if limit is not None:
            candidates = candidates[: max(limit, 0)]

        counts = {"technical_gram_deleted": 0, "weight_filled": 0, "blocked": 0}
        for item in candidates:
            if item["action"] == "delete_technical_gram":
                counts["technical_gram_deleted"] += 1
            elif item["action"] == "fill_weight":
                counts["weight_filled"] += 1
            else:
                counts["blocked"] += 1

        self.stdout.write(f"CANDIDATES {len(candidates)}")
        self.stdout.write(f"TECHNICAL_GRAM_DUPLICATES {counts['technical_gram_deleted']}")
        self.stdout.write(f"DETERMINISTIC_WEIGHTS {counts['weight_filled']}")
        self.stdout.write(f"BLOCKED {counts['blocked']}")
        if not apply:
            self.stdout.write("DRY_RUN no changes written")
            return

        applied = 0
        with transaction.atomic():
            for item in candidates:
                portion = Portion.objects.select_for_update().get(pk=item["portion_id"])
                if item["action"] == "delete_technical_gram":
                    portion.deleted_at = timezone.now()
                    portion.save(update_fields=["deleted_at"])
                    applied += 1
                elif item["action"] == "fill_weight":
                    portion.weight_g = item["weight_g"]
                    portion.save(update_fields=["weight_g", "updated_at"])
                    applied += 1
        self.stdout.write(f"APPLIED {applied}")

    def _technical_gram_duplicates(self) -> list[dict]:
        result: list[dict] = []
        qs = (
            Portion.objects.active()
            .filter(
                name__iexact="g",
                quantity=1,
                weight_g=1,
                rank=9999,
                measuring_unit__unit="g",
            )
            .select_related("ingredient", "measuring_unit")
        )
        for portion in qs.iterator():
            if RecipeItem.objects.filter(portion=portion).exists():
                continue
            has_canonical = (
                Portion.objects.active()
                .filter(
                    ingredient=portion.ingredient,
                    measuring_unit__unit="g",
                    name__iexact="100g",
                    quantity=100,
                    weight_g=100,
                )
                .exists()
            )
            if has_canonical:
                result.append({"action": "delete_technical_gram", "portion_id": portion.id})
        return result

    def _deterministic_missing_weights(self) -> list[dict]:
        result: list[dict] = []
        qs = Portion.objects.active().filter(weight_g__isnull=True).select_related("ingredient", "measuring_unit")
        for portion in qs.iterator():
            if is_piece_like_name(portion.name):
                continue
            path, computed = classify_repair_path(portion)
            if path == "automatic" and computed is not None and computed > 0:
                result.append({"action": "fill_weight", "portion_id": portion.id, "weight_g": computed})
        return result
