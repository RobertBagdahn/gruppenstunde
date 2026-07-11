#!/usr/bin/env python
"""
Generate a list of ingredients to remove (for manual review).

Usage:
    uv run python manage.py generate_cleanup_candidates --output cleanup_candidates.txt

The output file will have one ingredient per line that the AI suggests to remove.
You can manually delete lines for ingredients you want to KEEP.
Then use: uv run python manage.py execute_cleanup --file cleanup_candidates.txt
"""
import json
import os
from django.core.management.base import BaseCommand
from supply.models import Ingredient
from core.services.gemini import gemini_call
from pydantic import BaseModel, Field


class SuitabilityResult(BaseModel):
    """AI response for a single ingredient."""
    index: int = Field(description="0-basierter Index")
    suitable: bool = Field(description="True wenn Zutat gebraucht wird, False wenn nicht")


class BatchClassificationSchema(BaseModel):
    """AI response for batch classification."""
    results: list[SuitabilityResult] = Field(description="Eine Bewertung pro Element")


class Command(BaseCommand):
    help = 'Generate a candidate list of ingredients to remove (for manual review)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--output',
            type=str,
            default='cleanup_candidates.txt',
            help='Output file for candidate list'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=60,
            help='Number of ingredients per AI request'
        )

    def classify_batch(self, batch_items):
        """Use Gemini to classify a batch of ingredients."""
        from google.genai import types
        
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

Zutaten:
{items_text}"""

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=BatchClassificationSchema,
        )

        try:
            response, _ = gemini_call(
                user=None,
                model="gemini-3.1-flash-lite",
                contents=prompt,
                config=config,
                context="classify_ingredients",
                bypass_limits=True,
            )
            
            if response:
                result = BatchClassificationSchema.model_validate_json(response.text)
                results = []
                for res in result.results:
                    if res.index < len(batch_items):
                        results.append({
                            'pk': batch_items[res.index]['pk'],
                            'name': batch_items[res.index]['name'],
                            'description': batch_items[res.index]['description'],
                            'suitable': res.suitable
                        })
                
                # Fill missing with KEEP (safe default)
                while len(results) < len(batch_items):
                    idx = len(results)
                    results.append({
                        'pk': batch_items[idx]['pk'],
                        'name': batch_items[idx]['name'],
                        'description': batch_items[idx]['description'],
                        'suitable': True
                    })
                
                return results
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"AI Error: {str(e)}"))
        
        # Safe default: keep all
        return [
            {
                'pk': item['pk'],
                'name': item['name'],
                'description': item['description'],
                'suitable': True
            }
            for item in batch_items
        ]

    def handle(self, *args, **options):
        output_file = options['output']
        batch_size = options['batch_size']
        
        # Get fixture
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        fixture_path = os.path.join(backend_root, 'data', 'food', 'supply_ingredient.json')
        
        self.stdout.write(f"Loading fixture: {fixture_path}")
        with open(fixture_path, 'r', encoding='utf-8') as f:
            fixture_data = json.load(f)
        
        ingredients = [
            {
                'pk': item['pk'],
                'name': item['fields'].get('name', ''),
                'description': item['fields'].get('description', ''),
            }
            for item in fixture_data
            if item.get('model') == 'supply.ingredient'
        ]
        
        self.stdout.write(f"Processing {len(ingredients)} ingredients with AI...")
        
        candidates_to_remove = []
        
        for batch_start in range(0, len(ingredients), batch_size):
            batch_end = min(batch_start + batch_size, len(ingredients))
            batch = ingredients[batch_start:batch_end]
            
            self.stdout.write(
                f"[{batch_start+1}/{len(ingredients)}] Batch {batch_start+1}-{batch_end}..."
            )
            
            batch_data = [
                {'pk': ing['pk'], 'name': ing['name'], 'description': ing['description']}
                for ing in batch
            ]
            
            results = self.classify_batch(batch_data)
            
            for result in results:
                if not result['suitable']:
                    candidates_to_remove.append(result)
        
        # Write candidate file
        self.stdout.write(f"\nWriting candidates to: {output_file}")
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("# Zu löschende Zutaten (Vorschlag der AI)\n")
            f.write("# Lösche Zeilen für Zutaten, die du BEHALTEN willst\n")
            f.write("# Format: pk|name|description\n\n")
            
            for item in candidates_to_remove:
                f.write(f"{item['pk']}|{item['name']}|{item['description']}\n")
        
        self.stdout.write(
            self.style.SUCCESS(
                f"✓ {len(candidates_to_remove)} candidates saved to {output_file}"
            )
        )
        self.stdout.write(
            self.style.WARNING(
                "→ Edit the file and delete lines for ingredients you want to KEEP"
            )
        )
        self.stdout.write(
            f"→ Then run: uv run python manage.py execute_cleanup --file {output_file}"
        )
