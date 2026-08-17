## Why

Der "Rezept für Abendessen wählen"-Dialog im Food Frontend hat kein Suchfeld und zeigt Zutaten nur mit Minimal-Infos (Name + Portionen) an, obwohl das Ingredient-Model reichhaltige Nährwert-, Preis- und Metadaten bereithält. User müssen durch Kategorie-Filter navigieren statt einfach tippen zu können.

Ziel: Suchfeld mit Live-Autocomplete, gemischte Rezept-/Zutaten-Ergebnisse, und Zutaten mit den gleichen Zusatzinfos (Preis, Tags, Usage, Nutri-Score) wie Rezepte.

## What Changes

- **Suchfeld im RecipeSearchDialog**: Debounced Text-Suche (300ms, ≥2 Zeichen) ganz oben im Dialog, die den `q`-Parameter an die bestehende `/api/meal-plans/recipes/search/`-API übergibt
- **Mixed Results**: Rezepte und Zutaten werden in einer einzigen, nach usage_count / Relevanz sortierten Liste angezeigt (bisher: zwei getrennte Sektionen "Rezepte" und "Zutaten")
- **Unified SearchResultCard**: RecipeSearchCard wird zu einer generischen Komponente umgebaut, die sowohl RecipeSearchResult als auch IngredientSearchResult rendern kann
- **Richer Ingredient Display**: Zutaten zeigen: Badge (gemappt aus `status`: verified/user_content/draft), nutritional_tags, price_per_kg (€/kg), usage_count
- **Conditional Recently Used**: Abschnitt "Kürzlich verwendet" wird ausgeblendet sobald der User sucht (q ≥ 2 Zeichen)
- **Backend Query erweitern**: Ingredient-Teil der `search_recipes`-API liefert zusätzlich Nährwerte, nutri_class, price_per_kg, nutritional_tags, usage_count, description, status
- **Frontend Schema erweitern**: `IngredientSearchResultSchema` um die neuen Felder ergänzen

## Capabilities

### New Capabilities
- *(Keine neuen Capabilities — reine UI/UX-Verbesserung innerhalb bestehender Dialoge und APIs)*

### Modified Capabilities
- *(Keine Spezifikationsänderungen auf Capability-Ebene — nur Implementierungsdetails)*

## Impact

- **Backend**: `planner/api/meal_plan.py:1894-1935` — Ingredient-Query von `values("id","name","slug")` auf alle relevanten Felder erweitern
- **Frontend Schema**: `frontend-food/src/schemas/mealPlan.ts:348-353` — `IngredientSearchResultSchema` um ~10 Felder erweitern
- **Frontend Component**: `frontend-food/src/components/recipe/RecipeSearchCard.tsx` → Umbau zu `SearchResultCard`
- **Frontend Page**: `frontend-food/src/pages/planning/RecipeSearchDialog.tsx` — Suchfeld + Mixed Results + conditional Recently Used
- **Keine neuen API-Endpoints, keine DB-Migrationen, keine neuen Modelle**
