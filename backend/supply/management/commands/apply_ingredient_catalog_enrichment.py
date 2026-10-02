"""Apply catalog enrichment proposals (from ``enrich_ingredient_catalog``) to ingredients.

Dry-run by default (rolled back, nothing written). Works in short per-batch
transactions so it is safe to run against a live database. Idempotent: an ingredient
whose ``ai_review_notes.enrich_version`` already matches is skipped by the
proposal generator, and renames/aliases/packages/portions never overwrite
existing data — safe to re-run.

Usage:
  manage.py apply_ingredient_catalog_enrichment --input data/food/catalog_enrichment.json
  manage.py apply_ingredient_catalog_enrichment --input ... --apply
  manage.py apply_ingredient_catalog_enrichment --input ... --offset 4900   # resume
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand

from supply.services.ingredient_catalog_enrichment import APPLY_BATCH_SIZE, EnrichReport, apply_enrichment


class Command(BaseCommand):
    help = "Wendet Katalog-Anreicherungsvorschläge an (Standard: Dry-Run)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--input", required=True, help="Vorschlagsdatei (JSON) aus enrich_ingredient_catalog.")
        parser.add_argument("--apply", action="store_true", help="Änderungen speichern (Standard: Dry-Run).")
        parser.add_argument(
            "--batch-size",
            type=int,
            default=APPLY_BATCH_SIZE,
            help="Zutaten pro Transaktion (kurze Transaktionen halten Sperren auf Prod klein).",
        )
        parser.add_argument(
            "--skip-renames",
            action="store_true",
            help="Namen nicht ändern; nur Synonyme, Packungen, Portionen, Nährwerte und Preise anwenden.",
        )
        parser.add_argument(
            "--skip-synonyms",
            action="store_true",
            help="Keine Synonyme anlegen.",
        )
        parser.add_argument(
            "--offset",
            type=int,
            default=0,
            help="Erste N Zutaten (nach Slug sortiert) überspringen, um einen abgebrochenen Lauf fortzusetzen.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        package = json.loads(Path(options["input"]).read_text(encoding="utf-8"))
        apply: bool = options["apply"]
        self.stdout.write(
            self.style.MIGRATE_HEADING(
                f"Katalog-Anreicherung ({'ANWENDEN' if apply else 'DRY-RUN'}"
                f"{', ohne Umbenennungen' if options['skip_renames'] else ''}"
                f"{', ohne Synonyme' if options['skip_synonyms'] else ''})"
            )
        )

        def progress(done: int, total: int, report: EnrichReport) -> None:
            self.stdout.write(
                f"  … {done}/{total} (--offset {done} zum Fortsetzen) · umbenannt {report.renamed} · "
                f"übersprungen {report.renames_skipped} · Synonyme {report.aliases_created} · "
                f"Packungen {report.packages_created} · Portionen {report.portions_created} · "
                f"Nährwerte {report.nutrition_changed} · Preise {report.prices_changed}"
            )
            self.stdout.flush()

        report = apply_enrichment(
            package["items"],
            apply=apply,
            skip_renames=options["skip_renames"],
            skip_synonyms=options["skip_synonyms"],
            batch_size=options["batch_size"],
            offset=options["offset"],
            on_progress=progress,
        )
        self.stdout.write(f"  Zutaten verarbeitet: {report.ingredients} · nicht gefunden: {report.missing}")
        self.stdout.write(f"  umbenannt: {report.renamed} · Umbenennung übersprungen: {report.renames_skipped}")
        self.stdout.write(f"  Synonyme angelegt: {report.aliases_created}")
        self.stdout.write(
            f"  Packungen angelegt: {report.packages_created} · Portionen angelegt: {report.portions_created}"
        )
        self.stdout.write(
            f"  Nährwerte geändert: {report.nutrition_changed} · Preise geändert: {report.prices_changed}"
        )
        for example in report.rename_examples[:30]:
            self.stdout.write(f"    {example}")
        for message in report.messages[:30]:
            self.stdout.write(f"    ! {message}")
