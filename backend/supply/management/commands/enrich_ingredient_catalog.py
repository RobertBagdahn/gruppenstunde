"""Propose precise retail names, synonyms, packages and portions for system ingredients.

Reads ingredient master data (no user data), asks Gemini in batches, and
writes proposals to a JSON file. Nothing is written to the database here —
see ``apply_enrichment_package`` for that.

Usage:
  manage.py enrich_ingredient_catalog --output data/food/catalog_enrichment.json
  manage.py enrich_ingredient_catalog --limit 50 --output /tmp/test.json
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand

from supply.services.ingredient_catalog_enrichment import (
    ENRICH_BATCH_SIZE,
    ENRICH_PROMPT_VERSION,
    enrichment_candidates,
    propose_enrichment,
)

RATE_LIMIT_BACKOFF_SECONDS = (15, 45, 120)
ESTIMATED_EUR_PER_BATCH = 0.01


class Command(BaseCommand):
    help = "Erzeugt Katalog-Anreicherungsvorschläge (Name, Synonyme, Packungen, Portionen) als JSON-Datei."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--output", required=True, help="Zieldatei für die Vorschläge (JSON).")
        parser.add_argument("--limit", type=int, default=None, help="Max. Anzahl Zutaten (Standard: alle offenen).")
        parser.add_argument("--workers", type=int, default=4, help="Parallele KI-Aufrufe.")

    def handle(self, *args: Any, **options: Any) -> None:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        from django.db import connection

        from core.services.gemini import GeminiInvalidResponseError, GeminiUpstreamRateLimitError

        output_path = Path(options["output"])
        done_slugs: set[str] = set()
        existing: list[dict[str, Any]] = []
        if output_path.exists():
            existing = json.loads(output_path.read_text(encoding="utf-8")).get("items", [])
            done_slugs = {entry["slug"] for entry in existing}
            self.stdout.write(f"Fortsetzen: {len(done_slugs)} bereits vorhandene Vorschläge in {output_path}")

        candidates = enrichment_candidates(done_slugs=done_slugs, limit=options["limit"])
        batches = [candidates[i : i + ENRICH_BATCH_SIZE] for i in range(0, len(candidates), ENRICH_BATCH_SIZE)]
        cost = len(batches) * ESTIMATED_EUR_PER_BATCH
        self.stdout.write(f"{len(candidates)} Zutaten in {len(batches)} KI-Aufrufen (≈ {cost:.2f} €)")
        if not batches:
            return

        def _run(batch: list) -> tuple[list[dict[str, Any]], str | None]:
            try:
                for delay in (0, *RATE_LIMIT_BACKOFF_SECONDS):
                    if delay:
                        time.sleep(delay)
                    try:
                        return propose_enrichment(batch), None
                    except (GeminiUpstreamRateLimitError, GeminiInvalidResponseError):
                        continue
                return [], "Rate-Limit/ungültige Antwort nach allen Wiederholungen"
            except Exception as exc:
                return [], f"{type(exc).__name__}: {exc}"
            finally:
                connection.close()

        results = list(existing)
        errors = 0
        with ThreadPoolExecutor(max_workers=max(1, options["workers"])) as pool:
            futures = [pool.submit(_run, batch) for batch in batches]
            for index, future in enumerate(as_completed(futures), start=1):
                entries, error = future.result()
                results.extend(entries)
                if error:
                    errors += 1
                    self.stderr.write(f"  Batch fehlgeschlagen: {error}")
                if index % 10 == 0 or index == len(futures):
                    self.stdout.write(f"  {index}/{len(futures)} Aufrufe · {len(results)} Vorschläge")
                    output_path.parent.mkdir(parents=True, exist_ok=True)
                    output_path.write_text(
                        json.dumps({"version": ENRICH_PROMPT_VERSION, "items": results}, ensure_ascii=False, indent=2),
                        encoding="utf-8",
                    )

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(
            json.dumps({"version": ENRICH_PROMPT_VERSION, "items": results}, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        self.stdout.write(
            self.style.SUCCESS(f"{len(results)} Vorschläge gespeichert in {output_path} ({errors} Fehler)")
        )
