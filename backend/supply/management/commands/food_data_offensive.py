"""Run the food data offensive end to end (idempotent, dry-run by default).

Steps (in this order, each can be selected with --steps):
  sections    deterministic retail section classification (catalog v2)
  nutrition   deterministic nutrition repair (kJ, placeholder zeros, salt/sodium)
  duplicates  merge ingredients with exactly the same name into the best one
  junk        soft-delete unused test/junk ingredients (E2E, test data)
  ai-review   batch AI review of unreviewed ingredients with issues (costs money)
  auto-resolve decide AI suggestions/renames/duplicates/junk by conservative rules
  embeddings  compute missing/stale ingredient embeddings (costs little money)
  publish     set plausible, complete draft ingredients to "verified"
  recipes     archive junk recipes and re-categorise recipe types (AI, few cents)

Examples:
  manage.py food_data_offensive                       # dry-run of all free steps
  manage.py food_data_offensive --apply --steps sections,nutrition
  manage.py food_data_offensive --apply --steps ai-review --ai-limit 600 --workers 4
"""

from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import connection

ALL_STEPS = (
    "sections",
    "nutrition",
    "duplicates",
    "junk",
    "ai-review",
    "auto-resolve",
    "embeddings",
    "publish",
    "recipes",
)
RATE_LIMIT_BACKOFF_SECONDS = (15, 45, 120)
FREE_DEFAULT_STEPS = ("sections", "nutrition", "duplicates", "junk", "publish")


def _review_chunk(ids: list[int]) -> tuple[int, dict[str, int], str | None]:
    """Review one batch in a worker thread. Returns (reviewed, verdict counts, error)."""
    from core.services.gemini import GeminiInvalidResponseError, GeminiUpstreamRateLimitError
    from supply.models import Ingredient
    from supply.services.ingredient_ai_review_service import review_ingredients

    try:
        for delay in (0, *RATE_LIMIT_BACKOFF_SECONDS):
            if delay:
                time.sleep(delay)
            try:
                ingredients = list(Ingredient.objects.filter(id__in=ids).select_related("retail_section"))
                outcomes = review_ingredients(ingredients, bypass_limits=True)
            except (GeminiUpstreamRateLimitError, GeminiInvalidResponseError):
                continue
            verdicts: dict[str, int] = {}
            for outcome in outcomes:
                verdicts[outcome.verdict] = verdicts.get(outcome.verdict, 0) + 1
            return len(outcomes), verdicts, None
        return 0, {}, "Rate-Limit/ungültige Antwort nach allen Wiederholungen"
    except Exception as exc:
        return 0, {}, f"{type(exc).__name__}: {exc}"
    finally:
        connection.close()


class Command(BaseCommand):
    help = "Datenoffensive Essen: Warengruppen, Nährwerte, KI-Review, Embeddings, Veröffentlichung, Rezepte."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Änderungen speichern (Standard: Dry-Run).")
        parser.add_argument(
            "--steps",
            default=",".join(FREE_DEFAULT_STEPS),
            help=f"Kommagetrennt aus: {', '.join(ALL_STEPS)} (Standard: kostenlose Schritte).",
        )
        parser.add_argument("--ai-limit", type=int, default=150, help="Max. Zutaten für den KI-Review.")
        parser.add_argument("--workers", type=int, default=4, help="Parallele KI-/Embedding-Aufrufe.")
        parser.add_argument("--embedding-limit", type=int, default=10000, help="Max. Embeddings pro Lauf.")
        parser.add_argument("--force-review", action="store_true", help="Auch bereits geprüfte Zutaten prüfen.")

    def handle(self, *args: Any, **options: Any) -> None:
        steps = [step.strip() for step in options["steps"].split(",") if step.strip()]
        unknown = set(steps) - set(ALL_STEPS)
        if unknown:
            raise CommandError(f"Unbekannte Schritte: {', '.join(sorted(unknown))}")
        apply: bool = options["apply"]
        self.stdout.write(self.style.MIGRATE_HEADING(f"Datenoffensive ({'ANWENDEN' if apply else 'DRY-RUN'})"))

        for step in ALL_STEPS:
            if step not in steps:
                continue
            self.stdout.write(self.style.MIGRATE_LABEL(f"\n▶ {step}"))
            getattr(self, f"_step_{step.replace('-', '_')}")(apply=apply, options=options)

    def _step_sections(self, *, apply: bool, options: dict[str, Any]) -> None:
        from supply.services.retail_section_reclassify import reclassify_retail_sections

        report = reclassify_retail_sections(apply=apply)
        self.stdout.write(
            f"  geändert {report.changed} · unverändert {report.unchanged} · manuell {report.skipped_manual} · "
            f"offen für KI {report.unclassified}"
        )
        for (source, target), count in report.transitions.most_common(12):
            self.stdout.write(f"    {count:5}  {source} → {target}")

    def _step_nutrition(self, *, apply: bool, options: dict[str, Any]) -> None:
        from supply.services.nutrition_repair import repair_nutrition

        report = repair_nutrition(apply=apply)
        self.stdout.write(f"  repariert {report.repaired} von {report.checked} · KI-Bedarf {len(report.needs_ai)}")
        for field_name, count in report.field_changes.most_common():
            self.stdout.write(f"    {count:5}  {field_name}")

    def _step_duplicates(self, *, apply: bool, options: dict[str, Any]) -> None:
        from supply.services.ingredient_merge import merge_exact_duplicates

        merged, messages = merge_exact_duplicates(apply=apply)
        self.stdout.write(f"  exakte Duplikate zusammengeführt: {merged}")
        for message in messages[:25]:
            self.stdout.write(f"    {message}")

    def _step_junk(self, *, apply: bool, options: dict[str, Any]) -> None:
        from supply.models import Ingredient
        from supply.services.data_offensive import SUSPECT_NAME_PATTERN, soft_delete_ingredients

        ids = [i.id for i in Ingredient.objects.only("id", "name") if SUSPECT_NAME_PATTERN.search(i.name)]
        self.stdout.write(f"  Test-/Unsinnszutaten gefunden: {len(ids)}")
        if apply and ids:
            result = soft_delete_ingredients(ids=ids)
            self.stdout.write(f"  gelöscht (soft): {result.changed} · verwendet, behalten: {result.skipped}")

    def _step_ai_review(self, *, apply: bool, options: dict[str, Any]) -> None:
        from supply.services.data_offensive import ESTIMATED_EUR_PER_REVIEW_BATCH, review_queue_ids
        from supply.services.ingredient_ai_review_service import MAX_BATCH_SIZE

        ids = review_queue_ids(limit=options["ai_limit"], force=options["force_review"])
        batches = [ids[i : i + MAX_BATCH_SIZE] for i in range(0, len(ids), MAX_BATCH_SIZE)]
        cost = len(batches) * ESTIMATED_EUR_PER_REVIEW_BATCH
        self.stdout.write(f"  {len(ids)} Zutaten in {len(batches)} KI-Aufrufen (≈ {cost:.2f} €)")
        if not apply:
            return

        reviewed = 0
        verdicts: dict[str, int] = {}
        with ThreadPoolExecutor(max_workers=max(1, options["workers"])) as pool:
            futures = [pool.submit(_review_chunk, batch) for batch in batches]
            for index, future in enumerate(as_completed(futures), start=1):
                count, batch_verdicts, error = future.result()
                reviewed += count
                for verdict, n in batch_verdicts.items():
                    verdicts[verdict] = verdicts.get(verdict, 0) + n
                if error:
                    self.stderr.write(f"    Batch fehlgeschlagen: {error}")
                if index % 10 == 0 or index == len(futures):
                    self.stdout.write(f"    {index}/{len(futures)} Aufrufe · {reviewed} geprüft")
        self.stdout.write(f"  geprüft {reviewed} · Urteile {verdicts}")

    def _step_auto_resolve(self, *, apply: bool, options: dict[str, Any]) -> None:
        from supply.services.data_offensive_auto import auto_resolve

        report = auto_resolve(apply=apply)
        self.stdout.write(
            f"  Wertvorschläge {report.suggestions_applied} · umbenannt {report.renamed} "
            f"(verworfen {report.renames_dismissed}) · gemergt {report.merged + report.variants_merged} · "
            f"gelöscht {report.junk_deleted} · manuell offen {report.suggestions_kept + report.duplicates_left}"
        )

    def _step_embeddings(self, *, apply: bool, options: dict[str, Any]) -> None:
        from supply.services.ingredient_embeddings import backfill_embeddings, stale_or_missing_ids

        ids = stale_or_missing_ids(limit=options["embedding_limit"])
        self.stdout.write(f"  {len(ids)} Embeddings fehlen oder sind veraltet")
        if not apply or not ids:
            return
        chunk = 200
        for start in range(0, len(ids), chunk):
            result = backfill_embeddings(ids=ids[start : start + chunk], workers=options["workers"])
            self.stdout.write(
                f"    {min(start + chunk, len(ids))}/{len(ids)} · ok {result.updated} · Fehler {result.failed}"
            )

    def _step_publish(self, *, apply: bool, options: dict[str, Any]) -> None:
        from supply.services.data_offensive import publish_ingredients

        result = publish_ingredients(ids=None, apply=apply)
        self.stdout.write(f"  veröffentlichbar {result.changed} · noch blockiert {result.skipped}")

    def _step_recipes(self, *, apply: bool, options: dict[str, Any]) -> None:
        from recipe.services.recipe_data_offensive import archive_junk_recipes, recategorize_recipes

        junk = archive_junk_recipes(ids=None, apply=apply)
        self.stdout.write(f"  Unsinnsrezepte archiviert: {junk.changed}")
        for message in junk.messages[:20]:
            self.stdout.write(f"    - {message}")
        types = recategorize_recipes(ids=None, apply=apply)
        self.stdout.write(f"  Rezeptkategorie geändert: {types.changed}")
        for message in types.messages[:30]:
            self.stdout.write(f"    - {message}")
