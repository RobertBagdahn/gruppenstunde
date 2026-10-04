"""Report how many suggestion candidates exist per meal type, direction and filter."""

from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand

from planner.services.suggestion_panel.coverage import compute_coverage, to_markdown


class Command(BaseCommand):
    help = "Coverage report for the suggestion panel (gaps = fewer than 4 candidates). Read-only."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--format", choices=["markdown", "json"], default="markdown")
        parser.add_argument("--output", help="Write the report to this file instead of stdout.")
        parser.add_argument("--minimum", type=int, default=4, help="Gap threshold (default: 4).")

    def handle(self, *args: Any, **options: Any) -> None:
        rows = compute_coverage()
        if options["format"] == "json":
            text = json.dumps([asdict(r) for r in rows], ensure_ascii=False, indent=2)
        else:
            text = to_markdown(rows, options["minimum"])
        if options["output"]:
            Path(options["output"]).write_text(text, encoding="utf-8")
            self.stdout.write(self.style.SUCCESS(f"Report geschrieben: {options['output']}"))
        else:
            self.stdout.write(text)
