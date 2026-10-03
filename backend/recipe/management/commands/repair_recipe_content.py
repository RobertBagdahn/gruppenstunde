"""Repair implausible recipe content (dry-run by default).

Steps (select with --steps):
  markers   strip leftover Cooklang "#cookware" markers from descriptions (free)
  summary   replace "Importiert aus Cooklang (…)" summaries with AI short descriptions
  steps     create structured steps (convert description, else generate from ingredients)
  tags      tag untagged recipes from the approved tag catalog (AI)

Examples:
    uv run python manage.py repair_recipe_content                     # dry-run, all steps
    uv run python manage.py repair_recipe_content --apply --steps markers,summary
    uv run python manage.py repair_recipe_content --apply --recipe-id 12 --recipe-id 13
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand, CommandError

from recipe.services import recipe_content_repair as repair

ALL_STEPS = ("markers", "summary", "steps", "tags")


class Command(BaseCommand):
    help = "Repair Cooklang placeholder summaries, missing steps and missing tags on recipes."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Save changes (default: dry-run).")
        parser.add_argument(
            "--steps", default=",".join(ALL_STEPS), help=f"Comma separated from: {', '.join(ALL_STEPS)}."
        )
        parser.add_argument("--recipe-id", type=int, action="append", dest="recipe_ids", help="Limit to recipe id.")

    def handle(self, **options: Any) -> None:
        selected = [name.strip() for name in options["steps"].split(",") if name.strip()]
        unknown = set(selected) - set(ALL_STEPS)
        if unknown:
            raise CommandError(f"Unknown steps: {', '.join(sorted(unknown))}")
        apply: bool = options["apply"]
        ids: list[int] | None = options["recipe_ids"]

        self.stdout.write(f"Defects before: {repair.content_defect_counts()}")
        runners = {
            "markers": lambda: repair.clean_cooklang_markers(ids=ids, apply=apply),
            "summary": lambda: repair.fix_placeholder_summaries(ids=ids, apply=apply),
            "steps": lambda: repair.fix_missing_steps(ids=ids, apply=apply),
            "tags": lambda: repair.fix_missing_tags(ids=ids, apply=apply),
        }
        for name in ALL_STEPS:
            if name not in selected:
                continue
            result = runners[name]()
            for message in result.messages:
                self.stdout.write(f"  [{name}] {message}")
            verb = "updated" if apply else "would update"
            self.stdout.write(self.style.SUCCESS(f"{name}: {verb} {result.changed}, skipped {result.skipped}"))
        if not apply:
            self.stdout.write(self.style.WARNING("Dry-run: nothing saved. Use --apply to write changes."))
        else:
            self.stdout.write(f"Defects after: {repair.content_defect_counts()}")
