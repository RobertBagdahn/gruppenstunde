"""Export data offensive results as a portable JSON package (keyed by slugs)."""

from __future__ import annotations

import datetime as dt
import json
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand
from django.utils import timezone

from supply.services.data_offensive_transfer import build_package

DEFAULT_PATH = Path(__file__).resolve().parents[3] / "data" / "food" / "data_offensive_package.json"


class Command(BaseCommand):
    help = "Exportiert die Ergebnisse der Datenoffensive als JSON-Paket für andere Umgebungen."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--output", default=str(DEFAULT_PATH), help="Zieldatei")
        parser.add_argument(
            "--since", default="2026-09-25", help="Merges/Löschungen/Archivierungen ab diesem Datum (YYYY-MM-DD)"
        )

    def handle(self, *args: Any, **options: Any) -> None:
        since = timezone.make_aware(dt.datetime.fromisoformat(options["since"]))
        package = build_package(since=since)
        path = Path(options["output"])
        path.write_text(json.dumps(package, ensure_ascii=False, indent=1), encoding="utf-8")
        self.stdout.write(
            self.style.SUCCESS(
                f"{path}: {len(package['ingredients'])} Zutaten, {len(package['merges'])} Merges, "
                f"{len(package['deleted_ingredients'])} Löschungen, {len(package['archived_recipes'])} archivierte "
                f"Rezepte, {len(package['recipe_types'])} Rezeptkategorien"
            )
        )
