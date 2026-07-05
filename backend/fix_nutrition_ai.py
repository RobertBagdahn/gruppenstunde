#!/usr/bin/env python
"""
Script to fix missing nutritional data for ingredients using AI estimation.
Updates ingredients in the database and exports the updated JSON.
"""
import os
import sys
import django
import json
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'inspi.settings')
sys.path.insert(0, str(Path(__file__).parent))
django.setup()

from supply.models import Ingredient
from supply.services.ingredient_ai_suggest_service import suggest_all_fields
from django.contrib.auth import get_user_model
from django.core.management import call_command

User = get_user_model()

def get_admin_user():
    """Get or create admin user for AI suggestions"""
    try:
        return User.objects.filter(is_superuser=True).first() or User.objects.first()
    except:
        return None

def fix_ingredients_batch(pks, batch_name="batch"):
    """Fix nutritional data for a batch of ingredients"""
    admin_user = get_admin_user()
    
    results = {
        'success': [],
        'skipped': [],
        'error': []
    }
    
    for i, pk in enumerate(pks, 1):
        try:
            ingredient = Ingredient.objects.get(pk=pk)
            
            print(f"\n[{i}/{len(pks)}] Processing: {ingredient.name} (PK: {pk})")
            
            # Skip if already has nutrition data
            if (ingredient.protein_g and ingredient.protein_g > 0) or \
               (ingredient.energy_kcal and ingredient.energy_kcal > 0):
                print(f"  ⊘ Skipped (already has data)")
                results['skipped'].append(pk)
                continue
            
            # Get AI suggestions
            print(f"  🤖 Fetching AI suggestions...")
            suggestions = suggest_all_fields(ingredient, admin_user)
            
            if not suggestions:
                print(f"  ✗ Failed to get suggestions")
                results['error'].append(pk)
                continue
            
            # Update ingredient with suggestions
            updated = False
            for field, value in suggestions.items():
                if value is not None and hasattr(ingredient, field):
                    current = getattr(ingredient, field)
                    if current != value and (current == 0.0 or current is None):
                        setattr(ingredient, field, value)
                        updated = True
                        print(f"    • {field}: {current} → {value}")
            
            if updated:
                ingredient.save()
                print(f"  ✓ Updated successfully")
                results['success'].append(pk)
            else:
                print(f"  ⊘ No updates needed")
                results['skipped'].append(pk)
                
        except Ingredient.DoesNotExist:
            print(f"  ✗ Ingredient not found")
            results['error'].append(pk)
        except Exception as e:
            print(f"  ✗ Error: {str(e)}")
            results['error'].append(pk)
    
    return results

def export_ingredients_json():
    """Export all ingredients to JSON"""
    print("\n📤 Exporting ingredients to JSON...")
    call_command('dumpdata', 'supply.ingredient', 
                 output='data/food/supply_ingredient.json', 
                 indent=2)
    print("✓ JSON export complete: data/food/supply_ingredient.json")

def main():
    import json
    
    # Load ingredient PKs
    with open('/tmp/ingredients_to_fix.json', 'r') as f:
        data = json.load(f)
    
    print("=" * 70)
    print("🍽️  NUTRITION DATA FIXER - AI-Powered Edition")
    print("=" * 70)
    print(f"\nTotal ingredients to fix: {data['total']}")
    
    # Process in batches
    batches = [
        ("BATCH 1 (First 10)", data['first_10'][:10]),
        ("BATCH 2 (Next 90)", data['first_100'][10:100]),
        ("BATCH 3 (Remaining)", data['all'][100:])
    ]
    
    all_results = {
        'success': [],
        'skipped': [],
        'error': []
    }
    
    for batch_name, pks in batches:
        if not pks:
            print(f"\n⊘ {batch_name}: No ingredients to process")
            continue
            
        print(f"\n{'=' * 70}")
        print(f"🔄 {batch_name} ({len(pks)} ingredients)")
        print(f"{'=' * 70}")
        
        results = fix_ingredients_batch(pks, batch_name)
        
        # Aggregate results
        all_results['success'].extend(results['success'])
        all_results['skipped'].extend(results['skipped'])
        all_results['error'].extend(results['error'])
        
        # Summary
        print(f"\n📊 {batch_name} Summary:")
        print(f"  ✓ Success: {len(results['success'])}")
        print(f"  ⊘ Skipped: {len(results['skipped'])}")
        print(f"  ✗ Errors: {len(results['error'])}")
        
        # Ask before continuing to next batch
        if pks != data['all'][100:]:  # Don't ask after last batch
            response = input(f"\n➤ Continue to next batch? (y/n): ").strip().lower()
            if response != 'y':
                print("Stopping here.")
                break
    
    # Final summary
    print(f"\n{'=' * 70}")
    print("📈 FINAL SUMMARY")
    print(f"{'=' * 70}")
    print(f"✓ Successfully updated: {len(all_results['success'])}")
    print(f"⊘ Skipped: {len(all_results['skipped'])}")
    print(f"✗ Errors: {len(all_results['error'])}")
    
    # Export JSON
    export_response = input(f"\n➤ Export updated ingredients to JSON? (y/n): ").strip().lower()
    if export_response == 'y':
        export_ingredients_json()
    
    print("\n✅ Done!")

if __name__ == '__main__':
    main()
