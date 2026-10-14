"""Report ingredient aliases that make the import matcher pick the wrong ingredient.

- head mismatch: the alias is only the front part of a compound in the ingredient name
  ("Hähnchen" on "Hähnchenbrustfilet": a whole chicken is not a breast fillet), while the
  compound's head ("Jodsalz" for "Salz") stays a valid alias
- duplicate: the same alias text sits on several ingredients

Only head-mismatch aliases are removed with --apply; duplicates need a human decision.

Usage:
    uv run python manage.py audit_ingredient_aliases            # report only
    uv run python manage.py audit_ingredient_aliases --apply
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

# Compound heads that name the edible part of the front word: "Walnusskerne" are walnuts.
PART_HEADS = frozenset({"kern"})


@dataclass(frozen=True)
class AliasFinding:
    alias_id: int
    alias: str
    ingredient: str
    reason: str


def _compound_front_parts(name: str, vocabulary: frozenset[str]) -> set[str]:
    """Stems that are front parts (not the head) of a compound word in ``name``."""
    from recipe.services.matching_index import _raw_words, _split_compound, _stem

    fronts: set[str] = set()
    for word in _raw_words(name):
        parts = _split_compound(word, vocabulary)
        fronts.update(_stem(part) for part in parts[:-1])
    return fronts


def audit_aliases() -> list[AliasFinding]:
    from recipe.services.matching_index import analyze, build_index
    from supply.models import IngredientAlias

    vocabulary = build_index().vocabulary
    findings: list[AliasFinding] = []
    aliases = list(
        IngredientAlias.objects.filter(ingredient__deleted_at__isnull=True).select_related("ingredient").order_by("id")
    )
    by_text: dict[str, list[Any]] = defaultdict(list)
    for alias in aliases:
        by_text[alias.name.strip().lower()].append(alias)
        alias_core = analyze(alias.name, vocabulary).core
        if len(alias_core) != 1:
            continue
        name_core = analyze(alias.ingredient.name, vocabulary).core
        fronts = _compound_front_parts(alias.ingredient.name, vocabulary)
        if alias_core[0] in fronts and alias_core[0] not in name_core[-1:] and not set(name_core) & PART_HEADS:
            findings.append(
                AliasFinding(
                    alias.id,
                    alias.name,
                    alias.ingredient.name,
                    f"Kopfnomen: „{alias.name}“ ist nur Vorderglied von „{alias.ingredient.name}“",
                )
            )
    for group in by_text.values():
        ingredient_ids = {alias.ingredient_id for alias in group}
        if len(ingredient_ids) > 1:
            names = ", ".join(sorted({alias.ingredient.name for alias in group}))
            for alias in group:
                findings.append(
                    AliasFinding(alias.id, alias.name, alias.ingredient.name, f"mehrfach vergeben: {names}")
                )
    return findings


class Command(BaseCommand):
    help = "Report (and with --apply remove) aliases that are more generic than their ingredient."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Remove head-mismatch aliases")

    def handle(self, *args: Any, **options: Any) -> None:
        from supply.models import IngredientAlias

        findings = audit_aliases()
        for finding in findings:
            self.stdout.write(f"  „{finding.alias}“ → {finding.ingredient}: {finding.reason}")
        removable = [finding.alias_id for finding in findings if finding.reason.startswith("Kopfnomen")]
        if not options["apply"]:
            self.stdout.write(
                self.style.WARNING(f"Dry run: {len(findings)} Befunde, {len(removable)} Aliase würden entfernt.")
            )
            return
        with transaction.atomic():
            for alias in IngredientAlias.objects.filter(id__in=removable):
                alias.delete()
        self.stdout.write(self.style.SUCCESS(f"{len(removable)} Aliase entfernt."))
