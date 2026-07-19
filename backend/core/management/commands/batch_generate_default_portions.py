"""Batch-generate rank-1 portions for ingredients without one using AI.

Usage:
    uv run python manage.py batch_generate_default_portions [--limit N] [--dry-run]
"""

import json
import logging
import time
from typing import Any

from django.core.management.base import BaseCommand

from core.services.gemini import GeminiUnavailableError, gemini_call
from supply.models import Ingredient, MeasuringUnit, Portion

BATCH_SIZE = 10
GEMINI_MODEL = "gemini-2.5-flash-lite"

SYSTEM_PROMPT = """Du bist ein Experte für Lebensmittelportionen und deutsche Küche.

Für jede Zutat bestimmst du die EINE typische Portionsgröße, die in einem Standardrezept pro Person verwendet wird.

Regeln:
- name: ein aussagekräftiger Portionsname (z.B. "Portion", "Scheibe", "Stück", "Esslöffel", "Teelöffel", "Prise", "Tasse", "Spritzer", "Dose", "Becher", "Glas", "Bund", "Handvoll", "Würfel", "Zehe", "Blatt", "Zweig", "Ei")
- weight_g: das typische Gewicht dieser Portion in Gramm
- quantity: immer 1.0
- measuring_unit_name: MUSS einer dieser Namen sein: "Gramm", "Kilogramm", "Milliliter", "Liter", "Esslöffel", "Teelöffel", "Prise", "Messerspitze", "Tasse", "Schuss"
- rank: immer 1
- portion_type: immer "rezeptportion"

Beispiele:
- Spaghetti: name="Portion", weight_g=125, measuring_unit_name="Gramm"
- Butter: name="Esslöffel", weight_g=10, measuring_unit_name="Esslöffel"
- Milch: name="Portion", weight_g=200, measuring_unit_name="Milliliter"
- Apfel: name="Stück", weight_g=150, measuring_unit_name="Gramm"
- Salz: name="Prise", weight_g=0.5, measuring_unit_name="Prise"
- Öl: name="Esslöffel", weight_g=10, measuring_unit_name="Esslöffel"
- Ei: name="Stück", weight_g=60, measuring_unit_name="Gramm"
- Sahne: name="Portion", weight_g=100, measuring_unit_name="Milliliter"
- Zwiebel: name="Stück", weight_g=80, measuring_unit_name="Gramm"
- Mehl: name="Portion", weight_g=100, measuring_unit_name="Gramm"
- Zucker: name="Portion", weight_g=30, measuring_unit_name="Gramm"
- Reis: name="Portion", weight_g=75, measuring_unit_name="Gramm"
- Brot: name="Scheibe", weight_g=50, measuring_unit_name="Gramm"
- Käse: name="Scheibe", weight_g=30, measuring_unit_name="Gramm"
- Honig: name="Teelöffel", weight_g=10, measuring_unit_name="Teelöffel"
- Essig: name="Spritzer", weight_g=5, measuring_unit_name="Gramm"
- Knoblauch: name="Zehe", weight_g=4, measuring_unit_name="Gramm"
- Kräuter (frisch): name="Zweig", weight_g=3, measuring_unit_name="Gramm"
- Gewürze (gemahlen): name="Prise", weight_g=0.5, measuring_unit_name="Prise"
- Nüsse: name="Handvoll", weight_g=30, measuring_unit_name="Gramm"
- Joghurt: name="Portion", weight_g=150, measuring_unit_name="Gramm"
- Schokolade: name="Portion", weight_g=30, measuring_unit_name="Gramm"
- Fisch (Filet): name="Stück", weight_g=150, measuring_unit_name="Gramm"
- Fleisch (pro Person): name="Portion", weight_g=150, measuring_unit_name="Gramm"
- Wurst/Aufschnitt: name="Scheibe", weight_g=15, measuring_unit_name="Gramm"

Antworte NUR mit einem JSON-Array. Keine Erklärung, kein Markdown."""

USER_PROMPT_TEMPLATE = """Gib für jede dieser Zutaten eine typische Rezeptportion (pro Person) zurück:

{ingredient_list}

Antworte als JSON-Array:
[{{"name": "...", "weight_g": ..., "quantity": 1.0, "measuring_unit_name": "...", "rank": 1, "portion_type": "rezeptportion"}}, ...]"""


class Command(BaseCommand):
    help = "Generate rank-1 default portions for ingredients without one"

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=int, default=0, help="Max ingredients (0=all)")
        parser.add_argument("--dry-run", action="store_true", help="Show what would be created")
        parser.add_argument("--batch-size", type=int, default=BATCH_SIZE, help="Ingredients per AI call")

    def handle(self, **options):
        limit = options["limit"]
        dry_run = options["dry_run"]
        batch_size = options["batch_size"]

        # Find ingredients without rank-1
        ingredients = Ingredient.objects.exclude(
            id__in=Portion.objects.filter(rank=1, deleted_at__isnull=True).values("ingredient_id")
        ).order_by("name")

        if limit:
            ingredients = ingredients[:limit]

        total = ingredients.count()
        if total == 0:
            self.stdout.write(self.style.SUCCESS("Alle Zutaten haben bereits eine Rank-1-Portion!"))
            return

        self.stdout.write(f"Zutaten ohne Rank-1: {total}")

        if dry_run:
            self.stdout.write("DRY RUN — zeige nur an, was erstellt würde\n")
            for i, ing in enumerate(ingredients):
                self.stdout.write(f"{i:>4}/{total} {ing.name}")
            return

        # Pre-cache measuring units
        mu_names = ["Gramm", "Kilogramm", "Milliliter", "Liter", "Esslöffel", "Teelöffel", "Prise", "Messerspitze", "Tasse", "Schuss"]
        mu_cache = {mu.name: mu for mu in MeasuringUnit.objects.filter(name__in=mu_names)}
        gramm = mu_cache["Gramm"]

        ing_list = list(ingredients)
        created = 0
        failed = 0
        total_time = 0.0

        # Process in batches
        for batch_start in range(0, len(ing_list), batch_size):
            batch = ing_list[batch_start : batch_start + batch_size]

            # Build list of ingredient descriptions
            ingredient_descriptions = []
            for ing in batch:
                # Include any food-group tag info for better context
                groups = ", ".join(ing.groups.values_list("name", flat=True)[:3]) or "Unbekannt"
                ingredient_descriptions.append(f"- {ing.name} (Kategorie: {groups})")

            user_prompt = USER_PROMPT_TEMPLATE.format(
                ingredient_list="\n".join(ingredient_descriptions)
            )

            batch_label = f"{batch_start + 1}-{min(batch_start + batch_size, total)}/{total}"
            self.stdout.write(f"\nBatch {batch_label}: {len(batch)} Zutaten...", ending="")

            try:
                t0 = time.time()
                prompt = SYSTEM_PROMPT + "\n\n" + user_prompt
                response, _ = gemini_call(
                    model=GEMINI_MODEL,
                    contents=prompt,
                    bypass_limits=True,
                    is_background=True,
                    context="batch_generate_default_portions",
                )
                elapsed = time.time() - t0
                total_time += elapsed

                if response is None:
                    self.stdout.write(f" FEHLER (keine Antwort) ({elapsed:.1f}s)")
                    failed += len(batch)
                    continue

                text = response.text.strip()
                # Strip markdown code fences if present
                if text.startswith("```"):
                    lines = text.split("\n")
                    text = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])
                    text = text.strip()

                suggestions: list[dict[str, Any]] = json.loads(text)

                if not isinstance(suggestions, list):
                    self.stdout.write(f" FEHLER (kein Array) ({elapsed:.1f}s)")
                    failed += len(batch)
                    continue

                # Map suggestions back to ingredients (maintain order)
                for i, suggestion in enumerate(suggestions):
                    if i >= len(batch):
                        break
                    ing = batch[i]

                    mu_name = suggestion.get("measuring_unit_name", "Gramm")
                    mu = mu_cache.get(mu_name, gramm)

                    Portion.objects.create(
                        ingredient=ing,
                        name=suggestion.get("name", "Portion"),
                        measuring_unit=mu,
                        quantity=suggestion.get("quantity", 1.0),
                        weight_g=suggestion.get("weight_g", 100.0),
                        rank=1,
                    )
                    created += 1

                avg_time = total_time / (batch_start + len(batch)) * (len(ing_list) / len(batch))
                self.stdout.write(f" OK ({elapsed:.1f}s, ~{avg_time:.0f}s remaining)")

            except (json.JSONDecodeError, KeyError, TypeError) as e:
                self.stdout.write(f" FEHLER (parse: {e})")
                failed += len(batch)
            except GeminiUnavailableError:
                self.stdout.write(" FEHLER (Gemini unavailable, retrying in 5s...)")
                time.sleep(5)
                failed += len(batch)
            except Exception as e:
                self.stdout.write(f" FEHLER ({e})")
                failed += len(batch)

            # Rate limit: small delay between batches
            if batch_start + batch_size < len(ing_list):
                time.sleep(0.5)

        self.stdout.write(self.style.SUCCESS(
            f"\nFERTIG: {created} Portionen erstellt, {failed} fehlgeschlagen, {total_time:.0f}s"
        ))
