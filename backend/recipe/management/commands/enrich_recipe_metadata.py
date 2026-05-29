"""
Enrich Cooklang-imported recipes with AI-estimated metadata.

Uses Gemini to estimate: difficulty, execution_time, preparation_time, costs_rating
based on the recipe title, description, and ingredients.

Usage:
    uv run python manage.py enrich_recipe_metadata
    uv run python manage.py enrich_recipe_metadata --dry-run
    uv run python manage.py enrich_recipe_metadata --batch-size 10
"""

import json
import time

from django.core.management.base import BaseCommand


GEMINI_MODEL = "gemini-2.5-flash-lite"

SYSTEM_PROMPT = """Du bist ein Koch-Experte. Schätze für jedes Rezept die folgenden Metadaten:

- difficulty: "easy", "medium" oder "hard"
- execution_time: "less_30", "30_60", "60_90" oder "more_90" (Kochzeit in Minuten)
- preparation_time: "none", "less_15", "15_30", "30_60" oder "more_60" (Vorbereitungszeit)
- costs_rating: "free", "less_1", "1_2" oder "more_2" (Kosten pro Person in EUR)

Antworte NUR mit einem JSON-Array. Jedes Element hat "id" (die Recipe-ID) und die 4 Felder.
Keine Erklärungen, kein Markdown-Block."""


class Command(BaseCommand):
    help = "Enrich Cooklang-imported recipes with AI-estimated metadata (difficulty, time, cost)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Show what would be updated without saving.")
        parser.add_argument("--batch-size", type=int, default=20, help="Recipes per Gemini call (default: 20).")
        parser.add_argument("--all", action="store_true", help="Process all recipes, not just Cooklang imports.")

    def handle(self, **options):
        from recipe.models import Recipe

        dry_run = options["dry_run"]
        batch_size = options["batch_size"]

        if options["all"]:
            qs = Recipe.objects.all()
        else:
            qs = Recipe.objects.filter(summary__startswith="Importiert aus Cooklang")

        recipes = list(qs.prefetch_related("recipe_items__ingredient"))
        self.stdout.write(f"Found {len(recipes)} recipes to enrich.")

        updated_count = 0
        for i in range(0, len(recipes), batch_size):
            batch = recipes[i : i + batch_size]
            results = self._estimate_batch(batch)
            if not results:
                self.stderr.write(self.style.WARNING(f"  Batch {i // batch_size + 1}: no AI response, skipping."))
                continue

            for result in results:
                recipe_id = result.get("id")
                recipe = next((r for r in batch if r.id == recipe_id), None)
                if not recipe:
                    continue

                changed = False
                for field in ("difficulty", "execution_time", "preparation_time", "costs_rating"):
                    value = result.get(field)
                    if value and value != getattr(recipe, field):
                        setattr(recipe, field, value)
                        changed = True

                if changed:
                    if not dry_run:
                        recipe.save(update_fields=["difficulty", "execution_time", "preparation_time", "costs_rating"])
                    updated_count += 1
                    self.stdout.write(
                        f"  {'[DRY] ' if dry_run else ''}Updated: {recipe.title} → "
                        f"diff={recipe.difficulty}, exec={recipe.execution_time}, "
                        f"prep={recipe.preparation_time}, cost={recipe.costs_rating}"
                    )

            # Rate limit pause between batches
            if i + batch_size < len(recipes):
                time.sleep(2)

        self.stdout.write(self.style.SUCCESS(f"\nDone: {updated_count} recipes {'would be ' if dry_run else ''}updated."))

    def _estimate_batch(self, recipes) -> list[dict]:
        from google.genai import types

        from core.services.gemini import gemini_call

        # Build prompt with recipe summaries
        recipe_data = []
        for r in recipes:
            ingredients = [item.portion.ingredient.name for item in r.recipe_items.all() if item.portion and item.portion.ingredient]
            recipe_data.append({
                "id": r.id,
                "title": r.title,
                "type": r.recipe_type,
                "servings": r.servings,
                "ingredients": ingredients[:15],  # limit to keep prompt short
                "description_preview": (r.description or "")[:200],
            })

        prompt = f"{SYSTEM_PROMPT}\n\nRezepte:\n{json.dumps(recipe_data, ensure_ascii=False)}"

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.1,
        )

        response = gemini_call(
            model=GEMINI_MODEL,
            contents=prompt,
            config=config,
            bypass_limits=True,
            context="enrich_recipe_metadata",
        )

        if not response or not response.text:
            return []

        try:
            return json.loads(response.text)
        except json.JSONDecodeError:
            self.stderr.write(self.style.WARNING(f"  Invalid JSON from AI: {response.text[:200]}"))
            return []
