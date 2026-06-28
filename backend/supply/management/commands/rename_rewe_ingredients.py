"""Batch-rename ugly REWE ingredient names via AI.

Sends batches of 20 names to Gemini and renames them to clean German ingredient names.

Usage:
    uv run python manage.py rename_rewe_ingredients --dry-run
    uv run python manage.py rename_rewe_ingredients --batch-size 20
    uv run python manage.py rename_rewe_ingredients --offset 100  # Resume from index 100
"""

from __future__ import annotations

import logging
import time

from django.core.management.base import BaseCommand
from django.utils.text import slugify
from pydantic import BaseModel, Field

from core.services.gemini import GeminiUnavailableError, gemini_call
from supply.models import Ingredient

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"


class NameMapping(BaseModel):
    """A single name mapping."""

    original: str = Field(description="Originalname")
    clean: str = Field(description="Bereinigter Name")


class BatchCleanNamesSchema(BaseModel):
    """AI response for batch cleaning ingredient names."""

    mappings: list[NameMapping] = Field(description="Liste der Namens-Zuordnungen")


def clean_names_batch(items: list[dict[str, str]]) -> dict[str, str] | None:
    """Send a batch of name+description pairs to AI and get clean versions back.

    items: list of {"name": ..., "description": ...}
    """
    from google.genai import types

    items_list = "\n".join(f"- Name: {item['name']} | Beschreibung: {item['description']}" for item in items)

    prompt = (
        f"Du bekommst eine Liste von Produktnamen und Beschreibungen aus einem REWE-Supermarkt-Import. "
        f"Erstelle für jeden einen sauberen, aussagekräftigen deutschen Zutatennamen.\n\n"
        f"Regeln:\n"
        f"- Ordentliche Groß-/Kleinschreibung\n"
        f"- Echte Umlaute verwenden (ä, ö, ü, ß statt ae, oe, ue, ss)\n"
        f"- Keine Mengenangaben (500g, 4x60g, etc. entfernen)\n"
        f"- Keine Markennamen (3 Glocken, 7 Days, Activia, REWE, ja!, etc. entfernen)\n"
        f"- Keine Stückzahlen (10, 6 Stück, etc. entfernen)\n"
        f"- Abkürzungen ausschreiben (PF.MARACU. → Passionsfrucht, FR. → Frucht, W. → Wasser, etc.)\n"
        f"- Name soll beschreiben WAS das Lebensmittel ist, nicht welche Marke\n"
        f"- Nutze die Beschreibung um den richtigen Namen zu finden\n"
        f"- Bei Tiefkühlprodukten (erkennbar an TK, Tiefkühl in Beschreibung) 'Tiefkühl-' voranstellen\n"
        f"- Aussagekräftig aber kurz, wie man es in einem Rezept oder einer Einkaufsliste schreiben würde\n"
        f"- Beispiele: 'Erdbeermarmelade', 'Tiefkühl-Steinofenbrötchen', 'Bandnudeln', 'Curry-Ketchup'\n\n"
        f"Produkte:\n{items_list}\n\n"
        f"Gib für JEDEN Namen (im 'original' Feld den EXAKTEN Originalnamen) eine Zuordnung zurück."
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=BatchCleanNamesSchema,
    )

    try:
        response, _interaction_id = gemini_call(
            user=None,
            model=GEMINI_MODEL,
            contents=prompt,
            config=config,
            context="rename_rewe_batch",
            bypass_limits=True,
        )
        if response:
            result = BatchCleanNamesSchema.model_validate_json(response.text)
            return {m.original: m.clean for m in result.mappings}
    except (GeminiUnavailableError, Exception) as e:
        logger.warning(f"AI batch rename failed: {e}")
    return None


class Command(BaseCommand):
    help = "Batch-rename ugly REWE ingredient names via AI"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Preview without saving")
        parser.add_argument("--batch-size", type=int, default=20, help="Names per AI call")
        parser.add_argument("--offset", type=int, default=0, help="Start from this index")
        parser.add_argument("--limit", type=int, default=0, help="Max ingredients (0=all)")
        parser.add_argument("--sleep", type=float, default=2.0, help="Seconds between batches")
        parser.add_argument("--min-id", type=int, default=0, help="Only process ingredients with id > this")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]
        offset = options["offset"]
        limit = options["limit"]
        sleep_time = options["sleep"]
        min_id = options["min_id"]

        if dry_run:
            self.stdout.write(self.style.WARNING("=== DRY RUN ==="))

        # Get all REWE ingredients (those with ugly names)
        qs = Ingredient.objects.all().order_by("id")
        if min_id:
            qs = qs.filter(id__gt=min_id)

        ingredients = list(qs[offset : offset + limit] if limit else qs[offset:])
        self.stdout.write(f"Processing {len(ingredients)} ingredients (offset={offset})")

        total_renamed = 0
        total_failed = 0

        for i in range(0, len(ingredients), batch_size):
            batch = ingredients[i : i + batch_size]
            items = [{"name": ing.name, "description": ing.description or ""} for ing in batch]

            self.stdout.write(f"\nBatch {i // batch_size + 1} ({i}-{i + len(batch) - 1}):")

            result = clean_names_batch(items)

            if not result:
                self.stdout.write(self.style.ERROR("  AI call failed, retrying after 30s..."))
                time.sleep(30)
                result = clean_names_batch(items)

            if not result:
                self.stdout.write(self.style.ERROR("  Still failed, waiting 60s..."))
                time.sleep(60)
                result = clean_names_batch(items)

            if not result:
                self.stdout.write(self.style.ERROR("  Still failed, skipping batch"))
                total_failed += len(batch)
                continue

            for ing in batch:
                new_name = result.get(ing.name)
                if new_name and new_name != ing.name:
                    self.stdout.write(f"  '{ing.name}' → '{new_name}'")
                    if not dry_run:
                        ing.name = new_name
                        ing.slug = self._unique_slug(new_name, ing.pk)
                        ing.save(update_fields=["name", "slug"])
                    total_renamed += 1
                else:
                    # Name not in result or unchanged
                    if not new_name:
                        self.stdout.write(f"  '{ing.name}' → (not in AI response)")
                        total_failed += 1

            time.sleep(sleep_time)

        self.stdout.write(self.style.SUCCESS(f"\nDone: {total_renamed} renamed, {total_failed} failed"))

    def _unique_slug(self, name: str, exclude_pk: int) -> str:
        base = slugify(name)
        if not base:
            base = "zutat"
        slug = base
        counter = 1
        while Ingredient.objects.filter(slug=slug).exclude(pk=exclude_pk).exists():
            slug = f"{base}-{counter}"
            counter += 1
        return slug
