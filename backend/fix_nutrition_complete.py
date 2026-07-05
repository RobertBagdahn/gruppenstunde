"""
Complete script to fix all 451 ingredients in batches and export JSON.
Run with: python manage.py shell < fix_nutrition_complete.py
"""
import json
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
    
    # Only nutrition-related fields to update
    NUTRITION_FIELDS = [
        'energy_kcal', 'protein_g', 'fat_g', 'fat_sat_g', 'carbohydrate_g', 
        'sugar_g', 'fibre_g', 'salt_g', 'sodium_mg', 'fructose_g', 'lactose_g',
    ]
    
    results = {
        'success': [],
        'skipped': [],
        'error': []
    }
    
    for i, pk in enumerate(pks, 1):
        try:
            ingredient = Ingredient.objects.get(pk=pk)
            
            # Skip if already has nutrition data
            if (ingredient.protein_g and ingredient.protein_g > 0) or \
               (ingredient.energy_kcal and ingredient.energy_kcal > 0):
                results['skipped'].append(pk)
                continue
            
            # Get AI suggestions
            suggestions = suggest_all_fields(ingredient, admin_user)
            
            if not suggestions:
                results['error'].append(pk)
                continue
            
            # Update ingredient with suggestions - ONLY nutrition fields
            updated_fields = []
            for field in NUTRITION_FIELDS:
                value = suggestions.get(field)
                if value is not None and hasattr(ingredient, field):
                    current = getattr(ingredient, field)
                    if current != value and (current == 0.0 or current is None):
                        setattr(ingredient, field, value)
                        updated_fields.append(field)
            
            if updated_fields:
                try:
                    ingredient.save(update_fields=updated_fields)
                    results['success'].append(pk)
                    print(f"[{i:3d}/{len(pks)}] ✓ {ingredient.name}: {len(updated_fields)} fields updated")
                except Exception as e:
                    results['error'].append(pk)
                    print(f"[{i:3d}/{len(pks)}] ✗ {ingredient.name}: Save error")
            else:
                results['skipped'].append(pk)
                
        except Ingredient.DoesNotExist:
            results['error'].append(pk)
        except Exception as e:
            results['error'].append(pk)
    
    return results

# Main execution
print("\n" + "=" * 80)
print("🍽️  COMPLETE NUTRITION DATA FIXER - AI-Powered Edition")
print("=" * 80)

# Load ingredient PKs
with open('/tmp/ingredients_to_fix.json', 'r') as f:
    data = json.load(f)

print(f"\nTotal ingredients to fix: {data['total']}")
print(f"Processing in 3 batches...\n")

all_results = {'success': [], 'skipped': [], 'error': []}

# BATCH 1: First 10
print(f"\n{'=' * 80}")
print(f"🔄 BATCH 1: First 10 ingredients")
print(f"{'=' * 80}")
results_1 = fix_ingredients_batch(data['first_10'][:10])
all_results['success'].extend(results_1['success'])
all_results['skipped'].extend(results_1['skipped'])
all_results['error'].extend(results_1['error'])
print(f"Result: ✓ {len(results_1['success'])} | ⊘ {len(results_1['skipped'])} | ✗ {len(results_1['error'])}\n")

# BATCH 2: Next 90 (11-100)
print(f"{'=' * 80}")
print(f"🔄 BATCH 2: Ingredients 11-100 (90 items)")
print(f"{'=' * 80}")
results_2 = fix_ingredients_batch(data['first_100'][10:100])
all_results['success'].extend(results_2['success'])
all_results['skipped'].extend(results_2['skipped'])
all_results['error'].extend(results_2['error'])
print(f"Result: ✓ {len(results_2['success'])} | ⊘ {len(results_2['skipped'])} | ✗ {len(results_2['error'])}\n")

# BATCH 3: Remaining (100+)
print(f"{'=' * 80}")
print(f"🔄 BATCH 3: Remaining ingredients (101-{data['total']}) - {len(data['all'][100:])} items")
print(f"{'=' * 80}")
results_3 = fix_ingredients_batch(data['all'][100:])
all_results['success'].extend(results_3['success'])
all_results['skipped'].extend(results_3['skipped'])
all_results['error'].extend(results_3['error'])
print(f"Result: ✓ {len(results_3['success'])} | ⊘ {len(results_3['skipped'])} | ✗ {len(results_3['error'])}\n")

# Final summary
print(f"\n{'=' * 80}")
print(f"📈 FINAL SUMMARY - ALL BATCHES")
print(f"{'=' * 80}")
print(f"✓ Successfully updated: {len(all_results['success'])} ingredients")
print(f"⊘ Already had data:     {len(all_results['skipped'])} ingredients")
print(f"✗ Errors:               {len(all_results['error'])} ingredients")
print(f"─" * 80)
print(f"Total processed:        {len(all_results['success']) + len(all_results['skipped']) + len(all_results['error'])}")

# Export JSON
print(f"\n📤 Exporting ingredients to JSON file...")
call_command('dumpdata', 'supply.ingredient', 
             output='data/food/supply_ingredient.json', 
             indent=2)
print(f"✓ JSON export complete: data/food/supply_ingredient.json")

print(f"\n{'=' * 80}")
print(f"✅ ALL COMPLETE!")
print(f"{'=' * 80}\n")
