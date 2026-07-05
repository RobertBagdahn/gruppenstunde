"""
Script to fix missing nutritional data for ingredients using AI estimation.
Run with: python manage.py shell < fix_nutrition_batch.py
"""
import json
from supply.models import Ingredient
from supply.services.ingredient_ai_suggest_service import suggest_all_fields
from django.contrib.auth import get_user_model

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

# Main execution
print("\n" + "=" * 70)
print("🍽️  NUTRITION DATA FIXER - AI-Powered Edition")
print("=" * 70)

# Load ingredient PKs
with open('/tmp/ingredients_to_fix.json', 'r') as f:
    data = json.load(f)

print(f"\nTotal ingredients to fix: {data['total']}")

# BATCH 1: First 10
batch_1_pks = data['first_10'][:10]
print(f"\n{'=' * 70}")
print(f"🔄 BATCH 1 - First 10 ingredients")
print(f"{'=' * 70}")
results_1 = fix_ingredients_batch(batch_1_pks, "BATCH 1")

print(f"\n📊 BATCH 1 Summary:")
print(f"  ✓ Success: {len(results_1['success'])}")
print(f"  ⊘ Skipped: {len(results_1['skipped'])}")
print(f"  ✗ Errors: {len(results_1['error'])}")

print("\n✅ BATCH 1 Complete!")
print(f"\nSuccessfully updated: {results_1['success']}")
print(f"Errors: {results_1['error']}")
