#!/usr/bin/env python
"""
Management command to remove ingredients unsuitable for scout camps using AI.
Uses Google Gemini to classify ingredients.
Removes: TK frozen meals, Christmas calendars
Keeps: Sweets, typical recipe ingredients
"""
import json
import os
from django.core.management.base import BaseCommand
from supply.models import Ingredient
from core.services.gemini import gemini_call
from pydantic import BaseModel, Field


class SuitabilityResult(BaseModel):
    """AI response for a single ingredient."""
    index: int = Field(description="0-basierter Index des Elements in der Eingabeliste")
    suitable: bool = Field(description="True wenn Zutat beim Lager gebraucht wird, False wenn nicht")


class BatchClassificationSchema(BaseModel):
    """AI response for batch classification."""
    results: list[SuitabilityResult] = Field(description="Eine Bewertung pro Eingabe-Element, gleiche Reihenfolge")


class Command(BaseCommand):
    help = 'Remove unsuitable ingredients using AI classification'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be deleted without making changes'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=40,
            help='Number of ingredients to classify per AI request'
        )

    def classify_batch(self, batch_items):
        """
        Use Gemini to classify a batch of ingredients.
        Returns list of (pk, name, is_suitable) tuples.
        """
        from google.genai import types
        from core.services.gemini import GeminiUnavailableError
        
        # Build ingredient list
        items_text = "\n".join([
            f"{i+1}. {item['name']}: {item['description']}"
            for i, item in enumerate(batch_items)
        ])
        
        prompt = f"""Bewerte jede Zutat für die Eignung bei Pfadfinderlagern (Stammeslager).

NICHT GEEIGNET (suitable: false):
- TK-Fertigprodukte/Tiefkühl-Fertigessen: Pizza, Schnitzel, panierter Fisch, Nuggets, Pommes, Burger, etc.
- Vorgekochte Mahlzeiten, die nur noch erhitzt werden
- Adventskalender oder Weihnachtskalender
- Vorgefertigte Essenskits
- Alles, das spezielle Heizinfrastruktur braucht, die im Lager nicht verfügbar ist

GEEIGNET (suitable: true):
- Süßigkeiten/Bonbons: Schokolade, Gummibärchen, Hartbonbons, etc.
- Basische Kochingredienzien: Mehl, Zucker, Salz, Öle, Gewürze, Vanille
- Getrocknete Ware: Nudeln, Reis, Bohnen, Trockenfrüchte, Nüsse
- Konserven: Gemüse, Bohnen, Suppen, Früchte
- Backingredienzien: Backpulver, Kakao, Schokoladenpulver
- Typische Rezeptzutaten
- Haltbare Grundnahrungsmittel

Gib für JEDEN Index (0 bis {len(batch_items) - 1}) genau eine Bewertung zurück.

Zutaten zur Klassifizierung:
{items_text}"""

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BatchClassificationSchema,
        )

        try:
            response, _interaction_id = gemini_call(
                user=None,
                model="gemini-3.1-flash-lite-preview",
                contents=prompt,
                config=config,
                context="classify_ingredients",
                bypass_limits=True,
            )
            
            if response:
                result = BatchClassificationSchema.model_validate_json(response.text)
                
                # Convert Pydantic response to list of dicts
                results = []
                for res in result.results:
                    if res.index < len(batch_items):
                        results.append({
                            'pk': batch_items[res.index]['pk'],
                            'name': batch_items[res.index]['name'],
                            'suitable': res.suitable
                        })
                
                # Fill in any missing results with KEEP (safe default)
                while len(results) < len(batch_items):
                    idx = len(results)
                    results.append({
                        'pk': batch_items[idx]['pk'],
                        'name': batch_items[idx]['name'],
                        'suitable': True
                    })
                
                return results
            else:
                # No response - keep all (safe)
                return [
                    {
                        'pk': item['pk'],
                        'name': item['name'],
                        'suitable': True
                    }
                    for item in batch_items
                ]
        except (GeminiUnavailableError, Exception) as e:
            self.stdout.write(
                self.style.ERROR(f"AI Error: {str(e)}")
            )
            # Return safe defaults (keep all)
            return [
                {
                    'pk': item['pk'],
                    'name': item['name'],
                    'suitable': True
                }
                for item in batch_items
            ]

    def handle(self, *args, **options):
        dry_run = options.get('dry_run', False)
        batch_size = options.get('batch_size', 40)
        
        # Get backend root directory
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        fixture_path = os.path.join(backend_root, 'data', 'food', 'supply_ingredient.json')
        
        self.stdout.write(f"Loading fixture from: {fixture_path}")
        with open(fixture_path, 'r', encoding='utf-8') as f:
            fixture_data = json.load(f)
        
        # Extract all ingredients
        ingredients = [
            {
                'pk': item['pk'],
                'name': item['fields'].get('name', ''),
                'description': item['fields'].get('description', ''),
                'item': item
            }
            for item in fixture_data
            if item.get('model') == 'supply.ingredient'
        ]
        
        self.stdout.write(f"Processing {len(ingredients)} ingredients with AI...")
        
        unsuitable_pks = set()
        
        # Process in batches
        for batch_start in range(0, len(ingredients), batch_size):
            batch_end = min(batch_start + batch_size, len(ingredients))
            batch = ingredients[batch_start:batch_end]
            
            self.stdout.write(
                f"\n[{batch_start+1}/{len(ingredients)}] Classifying batch {batch_start+1}-{batch_end}..."
            )
            
            # Prepare batch data
            batch_data = [
                {'pk': ing['pk'], 'name': ing['name'], 'description': ing['description']}
                for ing in batch
            ]
            
            # Classify with AI
            results = self.classify_batch(batch_data)
            
            # Process results
            for result in results:
                if not result['suitable']:
                    unsuitable_pks.add(result['pk'])
                    # Find the ingredient name for display
                    ing = next((i for i in batch if i['pk'] == result['pk']), None)
                    if ing:
                        self.stdout.write(
                            f"  REMOVE: pk {result['pk']:5d} - {ing['name'][:45]:<45}",
                            self.style.WARNING
                        )
        
        # Summary
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ AI classified all ingredients"
            )
        )
        self.stdout.write(
            f"Marked for removal: {len(unsuitable_pks)} ingredients"
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN: No changes made to fixture")
            )
            return
        
        # Remove unsuitable ingredients from fixture
        initial_count = len(ingredients)
        new_fixture_data = [
            item for item in fixture_data
            if not (item.get('model') == 'supply.ingredient' and item.get('pk') in unsuitable_pks)
        ]
        final_count = len([x for x in new_fixture_data if x.get('model') == 'supply.ingredient'])
        
        # Write back to fixture
        self.stdout.write(f"\nWriting updated fixture...")
        with open(fixture_path, 'w', encoding='utf-8') as f:
            json.dump(new_fixture_data, f, indent=2, ensure_ascii=False)
        
        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Ingredients: {initial_count} → {final_count} (removed {len(unsuitable_pks)})"
            )
        )
        self.stdout.write(
            self.style.SUCCESS(f"✓ Updated: {fixture_path}")
        )
