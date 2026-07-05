#!/usr/bin/env python
"""
Post-processing script to fix problematic ingredient splits.
"""
import json
from pathlib import Path

INGREDIENT_FILE = Path(__file__).parent / "data" / "food" / "supply_ingredient.json"

# Mappings of problematic names to their corrections
CORRECTIONS = {
    "Langkorn-": "Langkornreis",
    "Raps-": "Rapsöl",
    "Kräutern": "Kräuter",
    "Möhren zart": "Möhren",
}

def main():
    # Read the file
    with open(INGREDIENT_FILE, 'r', encoding='utf-8') as f:
        ingredients = json.load(f)
    
    corrections_made = 0
    
    for ing in ingredients:
        name = ing["fields"]["name"]
        if name in CORRECTIONS:
            new_name = CORRECTIONS[name]
            print(f"Correcting: '{name}' → '{new_name}'")
            ing["fields"]["name"] = new_name
            ing["fields"]["slug"] = new_name.lower().replace(" ", "-").replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
            corrections_made += 1
    
    # Handle special case: remove entries that are too short or meaningless
    entries_to_remove = [
        "fein (Dose)",
        "gesalzen",
    ]
    
    before_count = len(ingredients)
    ingredients = [ing for ing in ingredients if ing["fields"]["name"] not in entries_to_remove]
    removed_count = before_count - len(ingredients)
    
    if removed_count > 0:
        print(f"\nRemoved {removed_count} problematic entries:")
        for name in entries_to_remove:
            print(f"  - {name}")
    
    # Write back to file
    with open(INGREDIENT_FILE, 'w', encoding='utf-8') as f:
        json.dump(ingredients, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Done! Made {corrections_made} corrections and removed {removed_count} entries.")
    print(f"  Total ingredients now: {len(ingredients)}")


if __name__ == "__main__":
    main()
