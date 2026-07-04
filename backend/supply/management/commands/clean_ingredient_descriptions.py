"""Batch-clean Ingredient descriptions via AI for use as embedding basis.

The raw `description` field for most REWE-imported ingredients is a noisy
product dump (brand names, package sizes, retail category codes), e.g.:

    "Schwartau Extra Erdbeere Rhabarber 340g - Schwartau - Erdbeere Rhabarber
    - KONFITUEREN/MARMELADEN/GELEES"

This command rewrites `description` into a precise, generic description of
the ingredient itself — no numbers, no brand names — so that it forms a
clean basis for the semantic embedding (see
content/services/embedding_service.py::build_ingredient_embedding_text).

This command ONLY updates the `description` text. It does NOT compute or
regenerate embeddings — run `generate_embeddings --type ingredient --force`
separately afterwards to (re)compute embeddings from the cleaned text.

Usage:
    uv run python manage.py clean_ingredient_descriptions --dry-run
    uv run python manage.py clean_ingredient_descriptions --batch-size 20
    uv run python manage.py clean_ingredient_descriptions --offset 100  # Resume
"""

from __future__ import annotations

import logging
import time

from django.core.management.base import BaseCommand
from pydantic import BaseModel, Field

from core.services.gemini import GeminiUnavailableError, gemini_call
from supply.models import Ingredient

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"


class DescriptionMapping(BaseModel):
    """A single cleaned description, matched back by its list index."""

    index: int = Field(description="0-basierter Index des Elements in der Eingabeliste")
    description: str = Field(description="Bereinigte, präzise Beschreibung der Zutat")


class BatchCleanDescriptionsSchema(BaseModel):
    """AI response for batch cleaning ingredient descriptions."""

    mappings: list[DescriptionMapping] = Field(description="Eine Zuordnung pro Eingabe-Element, gleiche Reihenfolge")


def clean_descriptions_batch(items: list[dict[str, str]]) -> dict[int, str] | None:
    """Send a batch of name+description+retail_section triples to AI and get clean descriptions back.

    items: list of {"name": ..., "description": ..., "retail_section": ...}
    Returns a dict mapping input index -> cleaned description.
    """
    from google.genai import types

    items_list = "\n".join(
        f"{i}. Name: {item['name']} | Rohbeschreibung: {item['description'] or '(keine)'} "
        f"| Abteilung: {item['retail_section'] or '(unbekannt)'}"
        for i, item in enumerate(items)
    )

    prompt = (
        f"Du bekommst eine Liste von Lebensmittel-Zutaten mit Name, einer rohen "
        f"Produktbeschreibung aus einem Supermarkt-Import und der Supermarkt-Abteilung. "
        f"Schreibe für jede Zutat eine kurze, präzise, sachliche Beschreibung DER ZUTAT SELBST "
        f"(nicht des Produkts/der Verpackung).\n\n"
        f"Regeln:\n"
        f"- 1 prägnanter Satz (max. 2), der beschreibt WAS die Zutat ist: Art/Kategorie, "
        f"Geschmack/Textur, typische Verwendung, Herkunft/Zutatenbasis falls relevant\n"
        f"- KEINE Zahlen (keine Gewichts-, Mengen-, Stückangaben, keine Prozentwerte)\n"
        f"- KEINE Markennamen, Produktnamen oder Herstellerbezeichnungen\n"
        f"- KEINE Werbesprache, keine Supermarkt-Kategoriecodes\n"
        f"- Echte deutsche Umlaute verwenden (ä, ö, ü, ß statt ae, oe, ue, ss)\n"
        f"- Neutraler, lexikonartiger Ton, wie ein Zutaten-Glossar\n"
        f"- Wenn die Rohbeschreibung keine brauchbaren Informationen enthält, leite die "
        f"Beschreibung ausschließlich aus dem Namen und der Abteilung ab\n\n"
        f"Beispiele:\n"
        f"- 'Konfitüre Erdbeer-Rhabarber' → 'Fruchtaufstrich aus Erdbeeren und Rhabarber, süß-säuerlich im Geschmack.'\n"
        f"- 'Hähnchen-Fleischwurst' → 'Feine Brühwurst aus Hähnchenfleisch, mild gewürzt, in Scheiben oder am Stück erhältlich.'\n"
        f"- 'Grüntee Darjeeling' → 'Loser grüner Tee aus der Region Darjeeling mit blumigem, leicht herbem Aroma.'\n\n"
        f"Zutaten:\n{items_list}\n\n"
        f"Gib für JEDEN Index (0 bis {len(items) - 1}) genau eine Zuordnung zurück."
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=BatchCleanDescriptionsSchema,
    )

    try:
        response, _interaction_id = gemini_call(
            user=None,
            model=GEMINI_MODEL,
            contents=prompt,
            config=config,
            context="clean_ingredient_descriptions_batch",
            bypass_limits=True,
        )
        if response:
            result = BatchCleanDescriptionsSchema.model_validate_json(response.text)
            return {m.index: m.description for m in result.mappings}
    except (GeminiUnavailableError, Exception) as e:
        logger.warning(f"AI batch description cleanup failed: {e}")
    return None


class Command(BaseCommand):
    help = "Batch-clean Ingredient descriptions via AI for use as embedding basis"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Preview without saving")
        parser.add_argument("--batch-size", type=int, default=20, help="Ingredients per AI call")
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

        qs = Ingredient.objects.select_related("retail_section").order_by("id")
        if min_id:
            qs = qs.filter(id__gt=min_id)

        ingredients = list(qs[offset : offset + limit] if limit else qs[offset:])
        self.stdout.write(f"Processing {len(ingredients)} ingredients (offset={offset})")

        total_updated = 0
        total_failed = 0

        for i in range(0, len(ingredients), batch_size):
            batch = ingredients[i : i + batch_size]
            items = [
                {
                    "name": ing.name,
                    "description": ing.description if ing.description and ing.description != "None" else "",
                    "retail_section": ing.retail_section.name if ing.retail_section else "",
                }
                for ing in batch
            ]

            self.stdout.write(f"\nBatch {i // batch_size + 1} ({i}-{i + len(batch) - 1}):")

            result = clean_descriptions_batch(items)

            if not result:
                self.stdout.write(self.style.ERROR("  AI call failed, retrying after 30s..."))
                time.sleep(30)
                result = clean_descriptions_batch(items)

            if not result:
                self.stdout.write(self.style.ERROR("  Still failed, waiting 60s..."))
                time.sleep(60)
                result = clean_descriptions_batch(items)

            if not result:
                self.stdout.write(self.style.ERROR("  Still failed, skipping batch"))
                total_failed += len(batch)
                continue

            for local_index, ing in enumerate(batch):
                new_description = result.get(local_index)
                if new_description and new_description.strip() != (ing.description or "").strip():
                    self.stdout.write(f"  '{ing.name}': '{ing.description[:60]}' → '{new_description}'")
                    if not dry_run:
                        # Use a queryset .update() instead of ing.save() so the
                        # post_save signal (which would trigger embedding regeneration)
                        # is NOT fired. Only the description text is updated here;
                        # run generate_embeddings separately afterwards to (re)compute
                        # embeddings from the cleaned text.
                        Ingredient.objects.filter(pk=ing.pk).update(description=new_description.strip())
                    total_updated += 1
                elif not new_description:
                    self.stdout.write(f"  '{ing.name}' → (not in AI response)")
                    total_failed += 1

            time.sleep(sleep_time)

        self.stdout.write(self.style.SUCCESS(f"\nDone: {total_updated} updated, {total_failed} failed"))
