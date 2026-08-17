## 1. Design-Token in index.css + Tailwind-Config

- [x] 1.1 `--success`, `--warning`, `--danger`, `--info` HSL-Token in `frontend-food/src/index.css` definieren (als Aliase für bestehende `--primary`, `--accent`, `--destructive`, `--chart-3`)
- [x] 1.2 `success`, `warning`, `danger`, `info` als Tailwind-Farb-Utilities in `frontend-food/tailwind.config.ts` registrieren (mit `foreground` jeweils weiß)

## 2. NUTRI_SCORE_COLORS zentralisieren

- [x] 2.1 `NUTRI_SCORE_COLORS` in `frontend-food/src/schemas/supply.ts` aktualisieren: Token-basierte Farben (bg-success, text-white, etc.) statt hardcodierte
- [x] 2.2 RecipeDetailPage.tsx: lokale `NUTRI_SCORE_COLORS`-Definition entfernen, aus `@/schemas/supply` importieren
- [x] 2.3 RecipeMetaCard.tsx: lokale `NUTRI_SCORE_COLORS`-Definition entfernen, aus `@/schemas/supply` importieren
- [x] 2.4 Text-Farbe für Nutri-Score C anpassen (bisher `text-yellow-900` → `text-danger-foreground` via danger-Mapping)

## 3. Hartcodierte Farben in RecipeDetailPage.tsx ersetzen

- [x] 3.1 `MacroBar`: Farb-Props `bg-amber-500`, `bg-teal-500`, `bg-green-500`, `bg-blue-500` → Chart-Token
- [x] 3.2 `MacroBar`: `bg-amber-300`, `bg-teal-300` → Chart-Varianten
- [x] 3.3 `NutrientCard`: `bg-orange-50 border-orange-200` etc. → `bg-chart-*/10 border-chart-*/20`
- [x] 3.4 `HealthIndicator`: `bg-green-50 border-green-200` → `bg-success/10 border-success/20`; analog für warn/bad
- [x] 3.5 `PriceRow`: `bg-yellow-400`, `text-yellow-700` → `bg-warning`, `text-warning`
- [x] 3.6 Preis-Analyse: `bg-yellow-50`, `bg-emerald-50`, `bg-blue-50` → Status-Token
- [x] 3.7 Gesundheitsanalyse: `bg-red-50 border-red-200` etc. → `bg-danger/10 border-danger/20`
- [x] 3.8 Gewichtsanalyse: `bg-indigo-50 border-indigo-200` → `bg-info/10 border-info/20`
- [x] 3.9 Normportion-Hinweis: `bg-orange-50 border-orange-300` → `bg-warning/10 border-warning/30`
- [x] 3.10 Zusätzliche hartcodierte Text-Farben und Hover-Farben in DetailPage → Token

## 4. Hartcodierte Farben in Sub-Komponenten ersetzen

- [ ] 4.1 `RecipeMetaCard.tsx`: Nutri-Score-Badge-Farben via importierte `NUTRI_SCORE_COLORS` statt lokaler `bg-green-600` etc.
- [x] 4.2 `PortionScaler.tsx`: `bg-amber-50 border-amber-200` → `bg-warning/10 border-warning/20`; Text-Farben analog
- [x] 4.3 `RecipeRulesBox.tsx`: `text-emerald-600` → `text-success`; `bg-amber-50` → `bg-warning/10`; `text-rose-600` → `text-danger`
- [x] 4.4 `RecipeSidebar.tsx`: `bg-amber-500 text-white` (Kochen-Button) → `bg-warning text-warning-foreground`; dashed border für Clone → `border-primary/30`

## 5. servings→portions Rename (Frontend-Food)

- [x] 5.1 `frontend-food/src/schemas/recipe.ts`: `servings` → `portions` in `RecipeListItemSchema`, `RecipeDetailSchema` (bereits erledigt)
- [x] 5.2 `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`: comprehensive rename aller servings→portions Variablen
- [x] 5.3 `frontend-food/src/components/supply/IngredientList.tsx`: bereits erledigt (schon portions)
- [x] 5.4 `frontend-food/src/components/recipe/PortionScaler.tsx`: bereits erledigt (schon portions)
- [x] 5.5 `frontend-food/src/components/recipe/PortionBottomSheet.tsx`: `defaultServings` → `defaultPortions` gefixt
- [x] 5.6 `frontend-food/src/components/recipe/RecipeSidebar.tsx`: `defaultServings` → `defaultPortions` gefixt
- [x] 5.7 `frontend-food/src/components/recipe/RecipeMetaCard.tsx`: bereits erledigt
- [x] 5.8 `frontend-food/src/store/useRecipeModificationStore.ts`: bereits erledigt
- [x] 5.9 `frontend-food/src/api/recipes.ts`: bereits erledigt
- [x] 5.10 `frontend-food/src/api/shoppingLists.ts`: bereits erledigt

## 6. Styleguide aktualisieren

- [x] 6.1 `/styleguide`-Page um Sektion "Semantische Status-Farben" erweitern
- [x] 6.2 Alert-Card in Styleguide auf Warning-Token umgestellt
- [x] 6.3 `frontend-food/AGENTS.md` aktualisieren: Neue Token dokumentiert, Regel zu hartcodierten Farben geschärft

## 7. Verifikation

- [x] 7.1 `npm run build` in `frontend-food/` erfolgreich (vite build ✓)
- [x] 7.2 Grep-Check: keine hartcodierten Farben mehr in recipe-Komponenten (DetailPage, MetaCard, PortionScaler, RulesBox, Sidebar)
- [ ] 7.3 Visueller Check: RecipeDetailPage, RecipeCard, RecipeListPage, Styleguide unter `/styleguide` (manuell)
