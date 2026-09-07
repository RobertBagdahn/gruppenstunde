# Design: Fix Food Production Bugs

## Overview

Fix security, calculation, validation, provenance, and synchronization issues in the Food and Shopping domains to ensure data integrity and reliable exports.

## Architecture & Decisions

1. **Access Policy Enforcement**:
   - Recipe export (`/api/shopping-lists/from-recipe/{recipe_id}/`) and MealPlan export endpoints require explicit ownership, collaboration, or read-access validation before calculation or persisting.
2. **Canonical Selection**:
   - Active recipe items and default exchange group members are resolved using shared calculation logic.
   - Unresolved weights are tagged with `unresolved_quantity` instead of converting silently to `0 g`.
3. **Database Constraints & Schema Validation**:
   - `quantity_g` is strictly non-negative at Pydantic, Zod, and database check constraint levels.
   - Foreign key validation ensures non-existent `ingredient_id` or `retail_section_id` fail with HTTP 422.
4. **Provenance & Source Grouping**:
   - `ShoppingListItemSource` stores nullable `recipe_id`, `meal_id`, and `ingredient_id`.
   - Views group by source relationships rather than freeform text notes.
5. **Ordering**:
   - Retail sections maintain database-backed rank order in API outputs and React components.
