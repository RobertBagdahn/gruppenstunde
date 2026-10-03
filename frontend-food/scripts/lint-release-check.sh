#!/bin/sh
set -eu

# Lint the Food files changed by this release. The repository-wide lint currently
# has legacy design-token failures in unrelated files; see the OpenSpec risk note.
npx eslint \
  src/api/buffet.ts \
  src/api/mealPlans.ts \
  src/api/recipes.ts \
  src/api/supplies.ts \
  src/components/buffet/BuffetBuilder.test.tsx \
  src/components/buffet/BuffetBuilder.tsx \
  src/components/recipe/IngredientAutocomplete.tsx \
  src/components/recipe/IngredientDetailSearchDialog.tsx \
  src/components/recipe/InlineIngredientEditor.tsx \
  src/lib/api.test.ts \
  src/lib/api.ts \
  src/pages/planning/MealSlot.test.tsx \
  src/pages/planning/MealSlot.tsx \
  src/schemas/recipe.ts
