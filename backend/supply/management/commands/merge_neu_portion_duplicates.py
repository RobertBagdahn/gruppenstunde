"""Merge "{X} (neu)" portion duplicates created by the historical replacement bug.

Before openspec change `portion-superseded-versions`, a weight correction on a
referenced portion left the OLD portion untouched and created a NEW one named
"{X} (neu)" holding the corrected weight — both stayed active side by side.
This command finds such pairs and consolidates them: the "(neu)" portion loses
its suffix and takes over the old portion's rank (it already holds the
current, corrected weight and is what should stay visible); the old portion —
the one still referenced by existing recipes with the stale weight — is marked
as superseded, exactly as a live weight correction would do today.

Usage:
    uv run python manage.py merge_neu_portion_duplicates             # report only
    uv run python manage.py merge_neu_portion_duplicates --apply     # write changes
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from content.services.audit_service import log_field_change
from supply.models import Portion

SUFFIX = " (neu)"


@dataclass
class DuplicatePair:
    ingredient_id: int
    ingredient_name: str
    old_portion: Portion  # stale name, still referenced by old recipes
    new_portion: Portion  # "{X} (neu)", holds the corrected weight


def find_neu_duplicates() -> list[DuplicatePair]:
    """Find active "{X} (neu)" portions that have a matching active "{X}"
    portion of the same ingredient and measuring unit."""
    pairs: list[DuplicatePair] = []
    duplicates = Portion.objects.active().filter(name__iendswith=SUFFIX).select_related("ingredient")
    for dup in duplicates:
        base_name = dup.name[: -len(SUFFIX)].strip()
        if not base_name:
            continue
        old = (
            Portion.objects.active()
            .filter(ingredient_id=dup.ingredient_id, measuring_unit_id=dup.measuring_unit_id, name__iexact=base_name)
            .exclude(pk=dup.pk)
            .first()
        )
        if old is None:
            continue
        pairs.append(
            DuplicatePair(
                ingredient_id=dup.ingredient_id,
                ingredient_name=dup.ingredient.name,
                old_portion=old,
                new_portion=dup,
            )
        )
    return pairs


def apply_merge(pair: DuplicatePair, *, actor: Any = None) -> None:
    """Consolidate one duplicate pair: rename `new_portion` to the base name,
    have it take over `old_portion`'s rank, and mark `old_portion` superseded.
    """
    with transaction.atomic():
        old_portion = Portion.objects.select_for_update().get(pk=pair.old_portion.pk)
        new_portion = Portion.objects.select_for_update().get(pk=pair.new_portion.pk)
        now = timezone.now()
        base_name = new_portion.name[: -len(SUFFIX)].strip()
        old_rank = old_portion.rank

        # Free the name/rank slot first (same ordering as `supersede_portion`):
        # `superseded_by` can only point at an already-existing row, but the
        # unique constraints would otherwise reject two active rows sharing
        # the name/rank we are about to give `new_portion`.
        old_portion.superseded_by = new_portion
        old_portion.superseded_at = now
        old_portion.save(update_fields=["superseded_by", "superseded_at"])

        new_portion.name = base_name
        new_portion.rank = old_rank
        new_portion.save(update_fields=["name", "rank"])

        Portion.objects.filter(superseded_by=old_portion).exclude(pk=new_portion.pk).update(superseded_by=new_portion)

        log_field_change(old_portion, "superseded_by", None, new_portion.id, user=actor)


class Command(BaseCommand):
    help = 'Führt "{X} (neu)"-Portions-Dubletten aus der alten Reparatur-Logik zusammen.'

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Änderungen tatsächlich schreiben.")

    def handle(self, *args: Any, **options: Any) -> None:
        pairs = find_neu_duplicates()
        if not pairs:
            self.stdout.write("Keine (neu)-Dubletten gefunden.")
            return

        for pair in pairs:
            self.stdout.write(
                f"#{pair.ingredient_id} {pair.ingredient_name}: "
                f"'{pair.old_portion.name}' (id={pair.old_portion.id}) wird abgelöst durch "
                f"'{pair.new_portion.name}' (id={pair.new_portion.id}) "
                f"→ neuer Name '{pair.new_portion.name[: -len(SUFFIX)].strip()}', Rang {pair.old_portion.rank}"
            )

        if not options["apply"]:
            self.stdout.write(self.style.WARNING(f"Trockenlauf – {len(pairs)} Dublette(n), nichts geändert."))
            return

        for pair in pairs:
            apply_merge(pair)
        self.stdout.write(self.style.SUCCESS(f"Zusammengeführt: {len(pairs)}"))
