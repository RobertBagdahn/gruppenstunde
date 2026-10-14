"""Report volume portions whose stored weight deviates from volume x density.

Read-only: lists suspicious portions (e.g. "1 Liter" Haferdrink stored as 1000 g although the
ingredient's density says 1.020 g) so they can be reviewed. This command never writes; fixes
are applied separately after explicit approval.
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

DEFAULT_TOLERANCE = 0.01


def expected_weight_g(volume_ml: float, density_g_per_ml: float) -> float:
    return volume_ml * density_g_per_ml


class Command(BaseCommand):
    help = "List volume portions whose weight_g deviates from volume x density (read-only)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--tolerance",
            type=float,
            default=DEFAULT_TOLERANCE,
            help="Relative deviation that counts as suspicious (default 0.01 = 1 %%).",
        )
        parser.add_argument("--include-drafts", action="store_true", help="Also check unverified ingredients.")

    def handle(self, *args: Any, **options: Any) -> None:
        from supply.choices import IngredientStatusChoices, MeasuringUnitType
        from supply.models import Portion

        tolerance: float = options["tolerance"]
        portions = (
            Portion.objects.active()
            .filter(
                measuring_unit__unit=MeasuringUnitType.VOLUME,
                weight_g__isnull=False,
                ingredient__deleted_at__isnull=True,
            )
            .select_related("ingredient", "measuring_unit")
            .order_by("ingredient__name", "rank", "id")
        )
        if not options["include_drafts"]:
            portions = portions.filter(ingredient__status=IngredientStatusChoices.VERIFIED)

        rows: list[tuple[str, str, float, float, float]] = []
        for portion in portions:
            density = portion.ingredient.physical_density or 1.0
            volume_ml = (portion.quantity or 0) * (portion.measuring_unit.quantity or 0)
            expected = expected_weight_g(volume_ml, density)
            if expected <= 0 or portion.weight_g is None:
                continue
            deviation = abs(portion.weight_g - expected) / expected
            if deviation > tolerance:
                rows.append((portion.ingredient.name, portion.name, portion.weight_g, expected, deviation))

        self.stdout.write("Zutat;Portion;gespeichert_g;erwartet_g;Abweichung_%")
        for name, portion_name, stored, expected, deviation in rows:
            self.stdout.write(f"{name};{portion_name};{stored:.1f};{expected:.1f};{deviation * 100:.1f}")
        self.stdout.write(self.style.WARNING(f"{len(rows)} auffällige Portionen (nur Report, keine Änderung)."))
