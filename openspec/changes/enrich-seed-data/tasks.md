## 1. Setup & Knowledge Base

- [x] 1.1 Create `supply/data/ingredient_specs.py` with `IngredientSpec` and `PortionSpec` dataclasses
- [x] 1.2 Extract ~500 curated ingredient specs from existing REWE fixture data (prioritize ingredients with `nan_art_id_rewe` that have complete nutritional data)
- [x] 1.3 Define ~70-90 generic terms mapping (single-word food names without qualifiers → concrete canonical names)
- [x] 1.4 Add `rewe_product_names` to each spec for matching REWE products in the fixture

## 2. Core Management Command Structure

- [ ] 2.1 Create `core/management/commands/enrich_seeds.py` with argument parsing and SQLite setup
- [ ] 2.2 Implement `_setup_sqlite_db()` — create temporary SQLite database, run all Django migrations
- [ ] 2.3 Implement `_import_fixtures()` — load all `backend/data/food/*.json` files into SQLite using `call_command("loaddata", ...)`
- [ ] 2.4 Implement `_export_fixtures()` — use `call_command("dumpdata", ...)` for each model, write to `backend/data/food/`
- [ ] 2.5 Signal silencing during import (pre_save, post_save, post_delete as in `import_prod_data`)

## 3. Idempotency & Matching

- [ ] 3.1 Implement `_is_already_enriched(ingredient)` heuristic: non-generic name, energy_kcal > 0 (or legitimate zero), rank-1 portion with weight_g > 1.0
- [ ] 3.2 Implement `_match_ingredient_to_spec(ingredient)` — direct name match, then trigram similarity to IngredientSpec
- [ ] 3.3 Implement `_match_via_ai(ingredients_batch)` — batched Gemini call for ambiguous matches (50 per request, structured JSON output)

## 4. Name Concretization

- [ ] 4.1 Implement `_rename_generic_ingredients()` — rename generic single-word ingredients to concrete names from IngredientSpec
- [ ] 4.2 Regenerate slugs after rename (Django auto-generates on save)
- [ ] 4.3 Skip already-concrete ingredients (heuristic check)

## 5. Nutritional Value Enrichment

- [ ] 5.1 Implement `_enrich_from_rewe()` — copy nutritional values from REWE-scraped data (ingredients with `nan_art_id_rewe` that have non-null nutrients)
- [ ] 5.2 Implement `_enrich_from_spec()` — fill missing nutrients from IngredientSpec knowledge base
- [ ] 5.3 Implement `_enrich_via_ai(ingredients_batch)` — batched Gemini call for remaining missing nutrients with range validation
- [ ] 5.4 Implement range validation (`_validate_nutrient_ranges`) — reject AI estimates outside allowed ranges per field

## 6. Portion Cleanup

- [ ] 6.1 Implement `_delete_rank_9999_portions()` — remove all rank=9999 sentinel portions
- [ ] 6.2 Implement `_classify_portions_via_ai(portions_batch)` — batched Gemini call to decide which portions are nonsensical
- [ ] 6.3 Implement `_delete_nonsensical_portions()` — remove portions classified as garbage
- [ ] 6.4 Implement `_rebind_recipe_items()` — for each deleted portion referenced by RecipeItems, rebind RecipeItem to the new rank-1 portion
- [ ] 6.5 Implement `_add_default_portions()` — create type-based default portions for ingredients without curated ones (vegetables→"1 Stück", spices→"1 TL", liquids→"100 ml", etc.)
- [ ] 6.6 Add "g" (1g) base portion at rank=9999 for every ingredient

## 7. Alias Generation

- [ ] 7.1 Implement `_delete_all_aliases()` — clear all existing IngredientAlias records
- [ ] 7.2 Implement `_generate_generic_aliases()` — create ~70-90 is_generic=True aliases, distributed 1:N to all matching concrete ingredients via AI matching
- [ ] 7.3 Implement `_generate_non_generic_aliases()` — create non-generic aliases from IngredientSpec (synonyms, plural forms, regional variants)
- [ ] 7.4 Implement `_generate_rewe_aliases()` — for each REWE product that matches a curated spec, create a non-generic alias from the REWE name to the curated ingredient
- [ ] 7.5 Auto-generate plural/singular aliases (e.g., "Tomate" ↔ "Tomaten") via simple heuristics

## 8. Structural Fixes

- [ ] 8.1 Implement `_fix_viscosity()` — set physical_viscosity from IngredientSpec (solid/liquid/powder/paste)
- [ ] 8.2 Implement `_fix_density()` — set physical_density from IngredientSpec where available
- [ ] 8.3 Implement `_fix_status()` — set status="verified" for curated ingredients (those matched to IngredientSpec)
- [ ] 8.4 Implement `_recalculate_nutri_scores()` — call `calculate_nutri_score()` for all ingredients with complete nutritional data

## 9. Recipe Cache Recalculation

- [ ] 9.1 Enable relevant signals (recipe post_save on RecipeItem) temporarily
- [ ] 9.2 Call `recalculate_recipe_cache()` for all 362 recipes
- [ ] 9.3 Verify all recipes have non-null cached values (except legitimately empty ones)

## 10. Embedding Regeneration

- [ ] 10.1 Implement `_regenerate_embeddings()` — for all 5,743 ingredients, generate embedding via Gemini text-embedding API
- [ ] 10.2 Use embedding text format: `f"{ingredient.name} {ingredient.description or ''}"`
- [ ] 10.3 Store embeddings in `supply_ingredient_embeddings.json` in the existing custom format (pk, name, description, embedding, embedding_text_hash, embedding_updated_at, retail_section)
- [ ] 10.4 Add progress logging (every 100 ingredients) and rate-limit handling

## 11. Export & Report

- [ ] 11.1 Implement `_export_food_fixtures()` — use `dumpdata` for each model: supply.Ingredient, supply.Portion, supply.IngredientAlias, recipe.Recipe, recipe.RecipeItem, recipe.RecipeTypeStats, recipe.Rule
- [ ] 11.2 Write embedding data to `supply_ingredient_embeddings.json`
- [ ] 11.3 Implement summary report — print counts to stdout: ingredients renamed, nutrients filled, portions deleted/created, aliases created, caches updated, embeddings regenerated, skipped, unmatched

## 12. Cleanup

- [ ] 12.1 Mark `seed_generic_terms.py` as deprecated (add deprecation warning, document that aliases now come from fixture)
- [ ] 12.2 Mark `seed_plural_aliases.py` as deprecated (aliases are now generated by enrich_seeds)
- [ ] 12.3 Update `seed_all.py` — remove calls to `seed_generic_terms` (generic aliases are in fixtures now)
- [ ] 12.4 Update `AGENTS.md` or relevant docs with the new enrichment workflow

## 13. Testing & Validation

- [ ] 13.1 Run `enrich_seeds` locally and verify all fixture files are written correctly
- [ ] 13.2 Run `import_prod_data --flush --only food` and verify no errors
- [ ] 13.3 Verify idempotency: run `enrich_seeds` twice, confirm second run shows zero changes
- [ ] 13.4 Spot-check: verify sample ingredients have correct names, nutrients, prices, portions, aliases
- [ ] 13.5 Verify recipe caches: compare `cached_energy_kcal` of sample recipes against manual calculation
- [ ] 13.6 Verify generic search: search "Salz" returns Jodsalz, Meersalz, Steinsalz
- [ ] 13.7 Run `uv run python manage.py check --deploy` to verify no model issues
- [ ] 13.8 Run existing test suite: `uv run pytest recipe/tests/ supply/tests/ -x --ignore=recipe/tests/test_url_import.py`
