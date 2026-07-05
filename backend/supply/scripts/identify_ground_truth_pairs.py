"""
Helper script to identify and curate ground-truth ingredient similarity pairs.

Usage:
    python manage.py shell < supply/scripts/identify_ground_truth_pairs.py

This script helps identify pairs that are clearly similar or clearly different,
which can be used to calibrate the sigmoid function.
"""

from supply.models import Ingredient
from content.services.embedding_service import (
    find_similar_ingredients,
    _text_hash,
    build_ingredient_embedding_text,
)

# Problematic pairs that should NOT be flagged as duplicates
should_be_different = [
    ("Schweinebauch", "Bacon"),  # Both are pork products but very different
    ("Schweinebauch", "Schweinefleisch"),  # Belly vs. general pork
    ("Rote Zwiebel", "Antipasti Zwiebeln"),  # Different preparations
    ("Paprika (rot)", "Paprika-Pulver"),  # Fresh vs. processed
]

# Pairs that should likely be flagged as duplicates
should_be_similar = [
    ("Möhren", "Karotten"),  # Same vegetable, different names
    ("Zwiebel", "Rote Zwiebel"),  # Different varieties, same ingredient
    ("Tomato", "Tomate"),  # English vs. German
]

def find_ingredient_by_name(name):
    """Find an ingredient by partial name match."""
    return Ingredient.objects.filter(name__icontains=name).first()

def collect_ground_truth_candidates():
    """
    Collect candidate pairs from the database for manual review.
    Returns tuples of (ing1, ing2, similarity_pct, should_be_similar).
    """
    candidates = []
    
    print("=" * 80)
    print("GROUND TRUTH PAIR IDENTIFICATION")
    print("=" * 80)
    
    # Check the "should be different" pairs
    print("\n[SHOULD BE DIFFERENT] Pairs that should NOT be flagged as duplicates:")
    print("-" * 80)
    for name_a, name_b in should_be_different:
        ing_a = find_ingredient_by_name(name_a)
        ing_b = find_ingredient_by_name(name_b)
        
        if ing_a and ing_b:
            # They should have low similarity
            print(f"✓ Found: {ing_a.name} | {ing_b.name}")
            candidates.append((ing_a, ing_b, None, False))
        else:
            print(f"✗ Not found: {name_a} | {name_b}")
    
    # Check the "should be similar" pairs
    print("\n[SHOULD BE SIMILAR] Pairs that SHOULD be flagged as duplicates:")
    print("-" * 80)
    for name_a, name_b in should_be_similar:
        ing_a = find_ingredient_by_name(name_a)
        ing_b = find_ingredient_by_name(name_b)
        
        if ing_a and ing_b:
            # They should have high similarity
            print(f"✓ Found: {ing_a.name} | {ing_b.name}")
            candidates.append((ing_a, ing_b, None, True))
        else:
            print(f"✗ Not found: {name_a} | {name_b}")
    
    print("\n" + "=" * 80)
    print(f"TOTAL CANDIDATES: {len(candidates)}")
    print("=" * 80)
    
    # Generate JSON format for fixture
    print("\nJSON FORMAT FOR GROUND TRUTH FIXTURE:")
    print("-" * 80)
    
    ground_truth = []
    for ing_a, ing_b, _, should_be_similar in candidates:
        pair = {
            "ingredient_a_id": ing_a.id,
            "ingredient_a_name": ing_a.name,
            "ingredient_b_id": ing_b.id,
            "ingredient_b_name": ing_b.name,
            "should_be_similar": should_be_similar,
            "notes": "",
        }
        ground_truth.append(pair)
    
    import json
    print(json.dumps(ground_truth, indent=2, ensure_ascii=False))
    
    return candidates

if __name__ == "__main__":
    collect_ground_truth_candidates()
