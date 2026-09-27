"""Apply an exported data offensive package (idempotent, dry-run by default, no AI costs).

Release order in the target environment:
  1. manage.py migrate                      (creates retail section catalog v2)
  2. manage.py food_offensive_apply         (dry-run, check the numbers)
  3. manage.py food_offensive_apply --apply
  4. manage.py food_data_offensive --apply --steps embeddings   (≈ 0,15 € for all ingredients)
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand

from supply.management.commands.food_offensive_export import DEFAULT_PATH
from supply.services.data_offensive_transfer import apply_package


class Command(BaseCommand):
    help = "Spielt ein Datenoffensive-Paket ein (Standard: Dry-Run)."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--input", default=str(DEFAULT_PATH), help="Paketdatei")
        parser.add_argument("--apply", action="store_true", help="Änderungen speichern.")

    def handle(self, *args: Any, **options: Any) -> None:
        package = json.loads(Path(options["input"]).read_text(encoding="utf-8"))
        report = apply_package(package, apply=options["apply"])
        mode = "ANGEWENDET" if options["apply"] else "DRY-RUN"
        self.stdout.write(self.style.MIGRATE_HEADING(f"Datenoffensive-Paket ({mode})"))
        self.stdout.write(
            f"Zutaten aktualisiert: {report.ingredients_updated} (nicht gefunden: {report.ingredients_missing})\n"
            f"Zusammengeführt: {report.merged} · gelöscht: {report.deleted}\n"
            f"Rezepte archiviert: {report.recipes_archived} · Rezeptkategorien geändert: {report.recipe_types_changed}"
        )
        for message in report.messages[:30]:
            self.stdout.write(f"  - {message}")
