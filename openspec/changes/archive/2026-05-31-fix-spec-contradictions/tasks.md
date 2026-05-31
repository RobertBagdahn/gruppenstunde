## 1. Ingredient & Supply Specs

- [x] 1.1 Update `openspec/specs/ingredient-database/spec.md`: Requirement "Ingredient inherits from Supply" ersetzen durch "Ingredient is standalone model" (gemäß delta spec)
- [x] 1.2 Update `openspec/specs/supply-base/spec.md`: Requirement "Ingredient Model (standalone)" — "13 vitamin fields, 12 mineral fields" ersetzen durch "1 micronutrient field: vitamin_c_mg"

## 2. Meal Cockpit Spec

- [x] 2.1 Update `openspec/specs/meal-cockpit/spec.md`: Requirement "Cockpit evaluates vitamin and mineral health rules" — Vitamin/Mineral-Liste auf nur vitamin_c_mg reduzieren

## 3. Recipe Specs

- [x] 3.1 Update `openspec/specs/recipe/spec.md`: Requirement "RecipeItem stores quantity per person" — Scenario mit servings=4 entfernen, durch korrekte Szenarien ersetzen (servings ist immer 1)
- [x] 3.2 Update `openspec/specs/recipe-portion-scaling-edit/spec.md`: Requirement "Proportional scaling on servings change" — Klarstellen dass DB servings=1 hat, Skalierung ist nur Display

## 4. Rundung Spec

- [x] 4.1 Update `openspec/specs/fine-grained-quantity-rounding/spec.md`: Grenze "unter 1" → "unter 2" angleichen an quantity-display-formatting

## 5. Einheiten & Kosten Specs

- [x] 5.1 Update `openspec/specs/cost-overview-page/spec.md`: `price_total` → `cached_price_total`
- [x] 5.2 Update `openspec/specs/recipe-quantity-display/spec.md`: Klarstellen dass measuring_unit über Portion-FK kommt (RecipeItem.portion.measuring_unit)
- [x] 5.3 Update `openspec/specs/unit-conversion/spec.md`: Requirement "resolve_measuring_unit_name ohne Portion-Fallback" — Klarstellen: Pfad ist RecipeItem→Portion→MeasuringUnit
