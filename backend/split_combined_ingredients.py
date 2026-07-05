#!/usr/bin/env python
"""
Script to split combined ingredients (e.g., "Salz und Pfeffer") into separate entries.
"""
import json
import re
from pathlib import Path
from typing import List, Tuple

INGREDIENT_FILE = Path(__file__).parent / "data" / "food" / "supply_ingredient.json"


def extract_name_parts(name: str) -> List[str]:
    """
    Split a combined ingredient name into individual names.
    Handles "und" (and) and "oder" (or) separators intelligently.
    """
    # Pattern: "X und Y" or "X oder Y"
    parts = re.split(r'\s+(?:und|oder)\s+', name)
    
    # Clean up and remove empty parts
    cleaned = []
    for part in parts:
        part = part.strip()
        if part:
            cleaned.append(part)
    
    return cleaned if len(cleaned) > 1 else [name]


def generate_new_pk(existing_pks: set) -> int:
    """Generate a new unique PK."""
    pk = max(existing_pks) + 1
    while pk in existing_pks:
        pk += 1
    return pk


def create_ingredient_copy(ingredient: dict, new_name: str, new_pk: int) -> dict:
    """Create a new ingredient entry with updated name and PK."""
    new_entry = {
        "model": ingredient["model"],
        "pk": new_pk,
        "fields": {**ingredient["fields"]}
    }
    
    # Update name and slug
    new_entry["fields"]["name"] = new_name
    new_entry["fields"]["slug"] = new_name.lower().replace(" ", "-").replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    
    return new_entry


def main():
    # Read the file
    with open(INGREDIENT_FILE, 'r', encoding='utf-8') as f:
        ingredients = json.load(f)
    
    # Collect existing PKs
    existing_pks = {ing["pk"] for ing in ingredients}
    
    # Find ingredients that need splitting
    to_split = []
    for i, ing in enumerate(ingredients):
        name = ing["fields"]["name"]
        if " und " in name or " oder " in name:
            parts = extract_name_parts(name)
            if len(parts) > 1:
                to_split.append((i, ing, parts))
    
    print(f"Found {len(to_split)} ingredients to split:")
    
    # Process splits
    new_ingredients = []
    updated_indices = set()
    
    for orig_idx, ingredient, parts in to_split:
        print(f"\nOriginal: {ingredient['fields']['name']} (PK: {ingredient['pk']})")
        print(f"  Split into: {parts}")
        
        # Keep first part in original entry
        ingredient["fields"]["name"] = parts[0]
        ingredient["fields"]["slug"] = parts[0].lower().replace(" ", "-").replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
        updated_indices.add(orig_idx)
        
        # Create new entries for remaining parts
        for part in parts[1:]:
            new_pk = generate_new_pk(existing_pks)
            existing_pks.add(new_pk)
            new_ing = create_ingredient_copy(ingredient, part, new_pk)
            new_ingredients.append(new_ing)
            print(f"    → New entry: {part} (PK: {new_pk})")
    
    # Append new ingredients to the list
    ingredients.extend(new_ingredients)
    
    # Write back to file
    with open(INGREDIENT_FILE, 'w', encoding='utf-8') as f:
        json.dump(ingredients, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Done! Added {len(new_ingredients)} new ingredient entries.")
    print(f"  Total ingredients now: {len(ingredients)}")


if __name__ == "__main__":
    main()
