#!/usr/bin/env python
"""
Merge duplicate ingredient entries (e.g. multiple "Paprika"/"Salz" variants that
refer to the same product) into a single canonical entry, then repoint all
Portion/RecipeItem references so recipes keep working.

Strategy per merge group:
- `keep`: pk of the canonical ingredient (existing "verified" entries are
  preferred as canonical since they were already curated).
- `remove`: pks of duplicate ingredients to delete.

For every Portion referencing a removed ingredient:
- If a Portion with the same `name` already exists under the `keep` ingredient,
  redirect all RecipeItems from the duplicate portion to the existing one and
  delete the duplicate portion.
- Otherwise, simply repoint the Portion's `ingredient_id` to `keep` (no data
  loss, recipe keeps referencing the same portion pk).

Only exact/near-exact duplicates are merged here (same product, just named
differently or accidentally imported twice). Genuine variants that can be
bought separately (colors, "groß" sizes, Meersalz vs. Salz, etc.) are left
untouched.
"""
import json
from pathlib import Path

DATA_DIR = Path(__file__).parent / "data" / "food"
INGREDIENT_FILE = DATA_DIR / "supply_ingredient.json"
PORTION_FILE = DATA_DIR / "supply_portion.json"
RECIPEITEM_FILE = DATA_DIR / "recipe_recipeitem.json"

# Each group: keep the canonical (curated/"verified") pk, remove the duplicates.
MERGE_GROUPS = [
    # Paprika (rot): "Paprika (rot)" (verified) absorbs "Rote Paprika" + "Rote Paprikaschote"
    {"keep": 12, "remove": [6876, 6881]},
    # Paprika (gelb)
    {"keep": 13, "remove": [6924, 6882]},
    # Paprika (grün)
    {"keep": 14, "remove": [7061]},
    # Generic "Paprika" absorbs generic synonyms "Paprikaschote"/"Paprikaschoten"
    {"keep": 293, "remove": [6871, 7262]},
    # Salz: verified "Salz" absorbs duplicate "Salz" + synonym "Speisesalz"
    {"keep": 145, "remove": [6874, 7089]},
]


def load(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def main():
    ingredients = load(INGREDIENT_FILE)
    portions = load(PORTION_FILE)
    recipe_items = load(RECIPEITEM_FILE)

    ingredients_by_pk = {ing["pk"]: ing for ing in ingredients}

    removed_ingredient_pks = set()
    removed_portion_pks = set()
    redirected_recipe_items = 0
    repointed_portions = 0

    for group in MERGE_GROUPS:
        keep_pk = group["keep"]
        remove_pks = group["remove"]

        keep_ing = ingredients_by_pk.get(keep_pk)
        if keep_ing is None:
            print(f"WARNING: keep pk {keep_pk} not found, skipping group")
            continue

        print(f"\n=== Merging into '{keep_ing['fields']['name']}' (pk {keep_pk}) ===")

        # Existing portions under the canonical ingredient, indexed by name
        keep_portions_by_name = {
            p["fields"]["name"]: p for p in portions if p["fields"]["ingredient_id"] == keep_pk
        }

        for remove_pk in remove_pks:
            remove_ing = ingredients_by_pk.get(remove_pk)
            if remove_ing is None:
                print(f"  WARNING: remove pk {remove_pk} not found, skipping")
                continue

            print(f"  Absorbing '{remove_ing['fields']['name']}' (pk {remove_pk})")

            dup_portions = [p for p in portions if p["fields"]["ingredient_id"] == remove_pk]
            for dup_portion in dup_portions:
                name = dup_portion["fields"]["name"]
                existing = keep_portions_by_name.get(name)
                if existing:
                    # Redirect RecipeItems to the existing equivalent portion, drop duplicate
                    count = 0
                    for item in recipe_items:
                        if item["fields"]["portion_id"] == dup_portion["pk"]:
                            item["fields"]["portion_id"] = existing["pk"]
                            count += 1
                    redirected_recipe_items += count
                    removed_portion_pks.add(dup_portion["pk"])
                    print(
                        f"    Portion '{name}' (pk {dup_portion['pk']}) -> merged into "
                        f"existing Portion pk {existing['pk']} ({count} RecipeItems redirected)"
                    )
                else:
                    # No equivalent portion yet: just repoint it to the canonical ingredient
                    dup_portion["fields"]["ingredient_id"] = keep_pk
                    keep_portions_by_name[name] = dup_portion
                    repointed_portions += 1
                    print(f"    Portion '{name}' (pk {dup_portion['pk']}) -> repointed to ingredient {keep_pk}")

            removed_ingredient_pks.add(remove_pk)

    # Remove merged ingredients and their now-orphaned duplicate portions
    ingredients = [ing for ing in ingredients if ing["pk"] not in removed_ingredient_pks]
    portions = [p for p in portions if p["pk"] not in removed_portion_pks]

    save(INGREDIENT_FILE, ingredients)
    save(PORTION_FILE, portions)
    save(RECIPEITEM_FILE, recipe_items)

    print(f"\n✓ Done!")
    print(f"  Removed ingredients: {len(removed_ingredient_pks)}")
    print(f"  Removed duplicate portions: {len(removed_portion_pks)}")
    print(f"  Repointed portions (no equivalent existed): {repointed_portions}")
    print(f"  RecipeItems redirected: {redirected_recipe_items}")


if __name__ == "__main__":
    main()
