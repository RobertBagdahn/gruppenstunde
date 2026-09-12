# Design: fix-critical-meal-plan-integrity-bugs

## Architectural Context
Die Behebung berührt drei Schichten des Monorepos:
1. `backend/planner/services/` und `backend/planner/api/` (Berechtigungen, KI-Kandidatenselektion, PDF-Rendering, Duplikation, Drinks-Enums).
2. `backend/supply/services/shopping_service.py` (Einkaufslisten-Filterung).
3. `frontend-food/src/` (Mengenberechnung, Dialog-Payloads, State-Rehydrierung, Mahlzeiten-Register, Lösch-Semantik).

## Detailed Design per Finding

### 1. KI-Frühstückskandidaten Datenschutz (`meal_plan_ai_service.py`)
- Filterung auf:
  ```python
  Q(meal_plan__is_template=True) |
  Q(meal_plan__owner__isnull=True) |
  Q(meal_plan__created_by=user)
  ```
- Fremde private Pläne werden vollständig ignoriert.

### 2. Rechteprüfung bei Referenzen und AI-Apply (`ref_meal.py`, `meal_plan_ai_service.py`)
- Für jedes `recipe_id` bzw. `ingredient_id`:
  - Aufruf von `get_visible_recipes_for_user(user)` bzw. `get_visible_ingredients_for_user(user)` aus `content.services.food_access`.
  - Bei fehlender Berechtigung HTTP 403 / Überspringen mit Log-Eintrag.

### 3. Allergen-Matrix im PDF (`pdf_export.py`)
- `_build_allergen_matrix` aggregiert die echten Allergene aller Zutaten und Rezepte pro Tag:
  - Rezepte: `recipe.allergens` / aus Zutaten aggregierte Allergene.
  - Direkte Zutaten: `ingredient.allergens`.

### 4. Mengen & Varianten im PDF (`pdf_export.py`)
- `_get_recipe_ingredients`:
  - Berücksichtigung von `item.factor`.
  - Einbindung von `active_recipe_items(item)` aus `planner.services.calculation_context`.
  - Multiplikation mit `ri.portion.quantity` für Stück/Scheiben-Einheiten.

### 5. KI-Frühstückszutaten Einheitenverlust (`meal_plan_ai_service.py`)
- Beim Erstellen von `MealItem` für `ingredient_id`:
  - Wenn `unit` angegeben: Lookup nach passendem `MeasuringUnit`.
  - Wenn `unit` fehlt: Lookup nach Standard-Gramm-Einheit (`g` / `Gramm`) oder der Rank-1-Portionseinheit der Zutat.
  - `measuring_unit_id` wird immer explizit gesetzt.

### 6. Mengenverfälschung Zutatendialog (`RecipeSearchDialog.tsx`)
- Wenn eine Portion gewählt wird:
  - `quantity` ist die Anzahl der Portionen (z. B. 2).
  - `measuring_unit_id` ist die Einheit der Portion.
  - `totalWeightG` wird nicht fälschlicherweise in `quantity` gestopft, wenn die Einheit z. B. „Scheibe“ ist.

### 7. Frühstücks-Rehydrierung (`refMealToWizardState.ts`)
- In `refMealItemsToWizardState`:
  - `item.quantity` bei direkten Zutaten ist in der Datenbank bereits pro Norm-Person gespeichert.
  - Entfernen der erneuten Division durch `normPortions`.

### 8. Erhalt von Varianten & Overrides (`meal_plan.py`)
- In `duplicate_meal_plan` und `copy_items_from_plan`:
  - `active_recipe_item_ids` und `variant_group_id` vom Quell-`MealItem` auf das Ziel-`MealItem` kopieren.

### 9. Ausschluss alter Zutaten bei externen Mahlzeiten
- In `shopping_service.py` und `MealPlan.nutrition_summary`:
  - Mahlzeiten mit `meal.is_external=True` werden bei der Aggregation von `MealItem`s übersprungen (`meal__is_external=False`).

### 10. Schieberegler Formelkorrektur (`VariantSliderDialog.tsx`)
- `handlePortionChange`:
  - Bei der Neuberechnung der übrigen IDs:
    ```typescript
    const scale = totalOthers / othersSum;
    const scaled = Object.fromEntries(
      otherIds.map((id) => [id, ((g.portions[id] ?? 0) * scale) / totalOthers])
    );
    const rounded = largestRemainderRound(scaled, totalOthers);
    ```

### 11. Getränke im zentralen Mahlzeiten-Register
- Backend `MealTypeChoices.DRINKS = "drinks", _("Getränke")`.
- Frontend `schemas/mealPlan.ts`:
  - `MEAL_TYPE_LABELS['drinks'] = 'Getränke'`
  - `MEAL_TYPE_ICONS_LUCIDE['drinks'] = GlassWater`
  - `MEAL_TYPE_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'drinks']`
  - Farben & Zeiten für `drinks` ergänzen.

### 12. Zutatensuche im Zutaten-Modus (`RecipeSearchDialog.tsx`)
- Die Suchleiste rendern, auch wenn `isIngredientMode || ingredientOnly` aktiv ist:
  - Bedingung anpassen: `showSearchInput = !showSuggestions`.
  - Backend-Suche filtert Zutaten nach `q`.

### 13. Lösch-Semantik & Undo in Tabelle (`TableView.tsx`, `MealEventDetailPage.tsx`)
- `handleDeleteItemWithUndo` in `TableView` entfernen.
- Stattdessen ruft Klick auf Löschen nur `onDeleteItem(item.id)` auf (welches `setDeleteItemId` setzt).
- Nach erfolgreichem Löschen im Dialog auf Page-Ebene wird der Erfolgs-Toast mit dem Undo-Button angezeigt.

### 14. Frühstücksassistent Kontext aus Menü (`MealActionsMenu.tsx`)
- Wenn `meal.meal_type === 'breakfast'`:
  - Navigiere zu `/meal-plans/${planId}/breakfast/wizard?mealId=${meal.id}`.
  - Dadurch editiert der Assistent gezielt dieses Tages-Frühstück (`directMeal`), statt die globale Plan-Referenz zu überschreiben.

### 15. KI Prompt-Reset (`StepAiPrompt.tsx`, `useMealPlanWizardState.ts`)
- Klick auf „Anderen Prompt ausprobieren“ ruft `setAiSuggestions(null)` auf und leert das bisherige Ergebnis, sodass der Nutzer einen neuen Prompt eingeben und erneut generieren kann.

### 16. Nährwert-Tagesansicht echte Werte (`SuggestionsView.tsx`)
- Wenn Tage einzeln durchlaufen werden (`uniqueDates.map`), wird für den jeweiligen Tag die tatsächliche Nährwertsumme dieses Tages berechnet und dargestellt, statt `row.perPortionValue / numDays` zu duplizieren.
