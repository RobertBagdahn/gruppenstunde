"""Re-assign ingredient retail sections with the deterministic classifier.

Dry-run by default; pass --apply to persist. Manual assignments are kept.
Names the classifier cannot place are listed so they can go to the AI review.
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from supply.services.retail_section_reclassify import reclassify_retail_sections


class Command(BaseCommand):
    help = "Ordnet Zutaten per Regelwerk den Warengruppen (Katalog v2) neu zu."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Änderungen speichern (Standard: Dry-Run).")
        parser.add_argument("--show", type=int, default=30, help="Anzahl angezeigter Übergänge.")

    def handle(self, *args: Any, **options: Any) -> None:
        apply: bool = options["apply"]
        report = reclassify_retail_sections(apply=apply)

        mode = "ANGEWENDET" if apply else "DRY-RUN"
        self.stdout.write(self.style.MIGRATE_HEADING(f"Warengruppen-Neuzuordnung ({mode})"))
        self.stdout.write(
            f"Geprüft: {report.checked} · geändert: {report.changed} · unverändert: {report.unchanged} · "
            f"manuell (übersprungen): {report.skipped_manual} · nicht klassifizierbar: {report.unclassified}"
        )
        self.stdout.write("\nHäufigste Übergänge:")
        for (source, target), count in report.transitions.most_common(options["show"]):
            self.stdout.write(f"  {count:5}  {source} → {target}")
        if report.unclassified_names:
            self.stdout.write("\nNicht klassifizierbar (→ KI-Review):")
            for name in report.unclassified_names[:50]:
                self.stdout.write(f"  - {name}")
