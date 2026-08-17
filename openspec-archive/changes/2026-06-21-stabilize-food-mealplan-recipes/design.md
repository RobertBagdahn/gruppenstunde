## Context

Das Food-Frontend (`frontend-food/`) ist eine eigenständige React-SPA mit TanStack Query v5 und Zod-Validierung. Es kommuniziert mit dem Django-Ninja-Backend (`backend/`) über REST-APIs unter `/api/`. Der Build (`npm run build`) schlägt aktuell mit ~80 TypeScript-Fehlern fehl, verursacht durch Schema-Drifts zwischen Backend-Pydantic und Frontend-Zod, entfernte Felder/Typen in MealPlan-Karten, falsche Feldnamen in Allergen-Komponenten und fehlende API-Hooks in Statistik-Tabs.

Die fachliche Kernentscheidung: Nutritional Tags in MealPlans bedeuten **Verbote** (Ausschlusskriterien), nicht Anforderungen. Rezepte mit diesen Tags sollen in Suche und Vorschlägen ausgefiltert werden. Diese Semantik war bereits im Backend per `exclude_nutritional_tag_ids` vorbereitet, aber im Frontend nicht umgesetzt.

## Goals / Non-Goals

**Goals:**
- `npm run build` im `frontend-food/` muss ohne Fehler durchlaufen
- Alle Frontend-Komponenten, die `allergen_tag` lesen, auf `nutritional_tag` migrieren
- MealPlan-Karten (`MealPlanHeroCard`, `MealPlanCompactCard`) auf aktuelles `MealPlanSchema` neu bauen
- RecipeSearch / RecipeSuggestions auf Exclude-Semantik (Verbote) umstellen
- Rezept-Create-UI: Portionen-Feld entfernen, Import auf `servings`-Feldname korrigieren
- Ingredient-Statistics-Tabs auf existierende API-Hooks umbauen
- Backend-Tests für Cache-Signals und Fork-Recipe reparieren

**Non-Goals:**
- Neue Features oder Datenbank-Migrationen
- Nährwert-/Kostenlogik im Backend umbauen (Inkonsistenzen dokumentiert, aber nicht Teil dieses Stabilitäts-Changes)
- MealItem-Overrides in Shopping-Service integrieren (späterer Change)
- Recipe-Detail Visibility-Check (späterer Change)

## Decisions

### Decision 1: MealPlan-Karten auf schema-konforme Felder umbauen

**Ansatz**: `MealPlanHeroCard` und `MealPlanCompactCard` erhalten neue Props und Berechnungen:
- `plan.status` → `plan.visibility` (mit Mapping: verified=owner_id null, community=visibility public, personal=owner_id === userId)
- `plan.filled_meals_count` → Berechnung aus `plan.meals_count` und `plan.meals.filter(m => m.items.length > 0).length` (vom Parent übergeben oder im Detail-Endpoint)
- `plan.portions` → `plan.norm_portions`
- Ampel-System → Coverage-Berechnung über `meals_count` (Anzahl gefüllter Mahlzeiten / Gesamt)
- `AmpelStatus`, `getAmpel`, `AMPEL_CONFIG`, `getCountdown`, `getDaysCount` → Lokale Hilfsfunktionen in `mealPlan.ts` definiert oder inline berechnet

**Alternative verworfen**: Karten entfernen und neu schreiben. Die bestehenden Karten haben gutes UI-Design und sollten erhalten bleiben; nur das Daten-Binding muss korrigiert werden.

### Decision 2: Tag-Exclude-Semantik im Frontend umsetzen

**Ansatz**: `RecipeSearchDialog` und `MealSlot` (Inline-Suche) senden `exclude_nutritional_tag_ids` statt `nutritional_tag_ids` (oder zusätzlich). Die Checkbox „Nur {Tag-Name}" wird entfernt oder semantisch invertiert („{Tag-Name} ausschließen").

RecipeSuggestions-Endpoint: Das Backend `meal_plan.py:1026` hat `require_nutritional_tags: bool = True`. Für Exclude-Semantik muss `require_nutritional_tags=false` gesetzt und `exclude_nutritional_tag_ids` übergeben werden. Der Endpoint `/recipes/suggestions/` unterstützt `exclude_nutritional_tag_ids` derzeit nicht direkt — die Suggestion-Logik filtert auf _matching_ Tags. Für Suggestions reicht es, `nutritional_tag_ids` nicht zu übergeben und stattdessen einen Client-seitigen Filter zu machen oder den Endpoint zu erweitern.

Für den Recipe-Search-Endpoint (`/recipes/search/`) existiert `exclude_nutritional_tag_ids` bereits. Die Frontend-Hooks `useRecipeSearch` und `useRecipeSuggestions` müssen diesen Parameter durchreichen.

**Alternative verworfen**: Backend-Endpoints für Suggestions um exclusiv-Filter erweitern. Wäre sauberer, aber der Change soll Backend-Änderungen minimieren. Client-seitiger Nachfilter ist akzeptabel als Übergangslösung.

### Decision 3: Ingredient-Statistics-Tabs auf existierende Hooks umbauen

**Ansatz**: Die fehlenden API-Hooks (`useIngredientScatter`, `useIngredientRankings`, `useIngredientDistributions`, `useIngredientOutliers`, `useIngredientTagLists`, `useIngredientScores`) werden in `frontend-food/src/api/supplies.ts` als TanStack Query Hooks neu implementiert, die gegen die in `ingredient-statistics/spec.md` definierten Backend-Endpoints fetchen.

**Backend-Check**: Die Statistik-Endpoints sind im Spec definiert aber möglicherweise noch nicht implementiert. Wenn die Endpoints fehlen, werden die Hooks mit `enabled: false` als stubs angelegt und die Tabs zeigen einen „Coming soon"-Zustand. Dadurch wird der Build grün, ohne dass alle 20 Tabs sofort funktionieren müssen.

**Alternative verworfen**: Tabs komplett löschen. Die Spec existiert und die Tabs sollen irgendwann funktionieren. Stubs erhalten die Struktur.

### Decision 4: RecipeImport auf `servings` umstellen

**Ansatz**: `CreateRecipePage.tsx` liest `data.recipe_draft.servings` statt `data.recipe_draft.portions`. Das Zod-Schema `RecipeDraftSchema` in `recipeImport.ts` hat bereits `servings`, die Create-Page muss nur den korrekten Feldnamen verwenden. Der `RecipeImportPage.tsx` verwendet `preview.servings` — das muss auf das Schema der Import-Page geprüft werden (verwendet anderen Endpoint `import-from-url/` statt `import-from-url-enhanced/`).

### Decision 5: `allergen_tag` → `nutritional_tag` Migration

**Ansatz**: In allen fünf betroffenen Komponenten:
- `ShoppingView.tsx:46` — `v.allergen_tag` → `v.nutritional_tag`
- `NutritionView.tsx:228` — `v.allergen_tag` → `v.nutritional_tag`
- `CostDashboard.tsx:107` — `v.allergen_tag` → `v.nutritional_tag`
- `MealSlot.tsx:304` — `v.allergen_tag` → `v.nutritional_tag`
- `TableView.tsx:410` — `v.allergen_tag` → `v.nutritional_tag`

Da `AllergenWarningBadge` den Typ `NutritionalTag[]` erwartet und `NutritionalTagSchema` `{id: number, name: string}` liefert, passt das direkt. Keine Schema-Änderung nötig.

## Risks / Trade-offs

- **[Risiko] Statistik-Endpoints fehlen im Backend** → Stub-Hooks mit `enabled: false`, Tabs zeigen Platzhalter. Backend-Implementierung in separatem Change.
- **[Risiko] `getCountdown`/`getDaysCount` sind reine Frontend-Helfer** → Werden als lokale Funktionen in `mealPlan.ts` definiert. Keine API-Änderung.
- **[Risiko] Coverage-Berechnung in Karten benötigt Item-Daten** → `meal_plan_router.get("/")` liefert `MealPlanOut` ohne `meals`. Karten können nur `meals_count` anzeigen, nicht die tatsächliche Füllung. Die alte `filled_meals_count` war ein denormalisiertes Feld, das nicht mehr existiert. → Progress Bar wird aus `meals_count` berechnet, alternativ entfällt sie in der Listenansicht.
- **[Trade-off] Client-seitiger Tag-Ausschluss bei Suggestions** → Weniger performant als Backend-Filter, aber akzeptabel für <20 Ergebnisse.
- **[Trade-off] Schemata nicht erweitert** → `ShoppingListItemSchema` fehlt `portion_options` und `ingredient_id`. Diese Felder werden vom Backend gesendet, aber Zod strippt sie. → Schema ergänzen.
