## ADDED Requirements

### Requirement: Recipe allergen tags sync from ingredients on save
The system SHALL automatically update Recipe.nutritional_tags (is_dangerous only) to match the union of all Ingredient.nutritional_tags (is_dangerous) from its RecipeItems whenever a Recipe or RecipeItem is saved.

#### Scenario: Sync triggers on RecipeItem create/update/delete
- **WHEN** RecipeItem is created/updated/deleted for a Recipe
- **THEN** post_save/post_delete signal triggers sync_recipe_allergen_tags(recipe)
- **THEN** recipe.nutritional_tags (is_dangerous) = UNION of all ingredient.nutritional_tags (is_dangerous) from recipe's RecipeItems

#### Scenario: Sync triggers on Recipe save
- **WHEN** Recipe is saved (any field)
- **THEN** sync_recipe_allergen_tags(recipe) runs
- **THEN** ensures tags match current ingredients (idempotent)

#### Scenario: Sync only affects is_dangerous tags
- **WHEN** ingredient has tags: [Erdnüsse (dangerous), Vegan (not dangerous)]
- **WHEN** sync runs
- **THEN** recipe gets only [Erdnüsse] added to nutritional_tags
- **THEN** existing non-dangerous tags on recipe are preserved (not removed)

#### Scenario: Sync removes allergens when ingredient removed
- **WHEN** RecipeItem with allergen-containing ingredient is deleted
- **WHEN** no other RecipeItem has that allergen
- **THEN** sync removes that allergen tag from recipe.nutritional_tags

### Requirement: Sync service function
The system SHALL provide a reusable sync_recipe_allergen_tags(recipe) function in recipe/services/recipe_checks.py.

#### Scenario: Service computes correct union
- **WHEN** sync_recipe_allergen_tags(recipe) called
- **THEN** queries all RecipeItems with select_related(portion__ingredient__nutritional_tags)
- **THEN** filters ingredient.nutritional_tags by is_dangerous=True
- **THEN** sets recipe.nutritional_tags.set(union_of_allergen_tag_ids)
- **THEN** returns count of tags set

#### Scenario: Service handles recipe with no items
- **WHEN** recipe has no RecipeItems
- **THEN** sync clears all is_dangerous tags from recipe
- **THEN** returns 0

### Requirement: Management command for bulk sync
The system SHALL provide a management command to sync all recipes.

#### Scenario: Command syncs all recipes
- **WHEN** running uv run python manage.py sync_recipe_allergen_tags
- **THEN** iterates all Recipe.objects.iterator()
- **THEN** calls sync_recipe_allergen_tags for each
- **THEN** outputs progress: "Synced 1234 recipes, 567 tags updated"

#### Scenario: Command supports dry-run
- **WHEN** running with --dry-run
- **THEN** shows what would change without saving
- **THEN** outputs: "Would update 23 recipes"