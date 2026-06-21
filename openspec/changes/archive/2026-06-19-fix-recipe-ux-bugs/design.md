## Context

Sechs UX-Bugs im Food-Frontend, alle im `frontend-food/` Verzeichnis. Keine Backend-Änderungen. Die Bugs betreffen Number-Inputs, Rezept-Portionen-Anzeige, Zutaten-Auswahl/Anlage, API-Pfade und Dropdown-Labels.

## Goals / Non-Goals

**Goals:**
- Number-Inputs: Leere Eingabe zulassen, erst beim Submit/Blur validieren
- Rezept-Portionen: Servings als Display-Skalierung im Editor verwenden, Datenbank bleibt `servings=1`
- Zutaten-Auswahl: Portion manuell wählen lassen, `portion_id` setzen vor Speichern
- Neue Zutat: `createIngredient` + Default-Portion inline im Editor
- API-Pfade: `API_BASE_URL` in `IngredientAutocomplete`, `UnknownIngredientDialog`, `InlineIngredientEditor`
- Einheiten-Dropdown: Eindeutige Labels mit Menge + Einheit

**Non-Goals:**
- Backend-Änderungen (APIs, Schemas, Modelle bleiben unverändert)
- Portion-Auflösung automatisieren
- Servings-Datenmodell ändern

## Decisions

### 1. Number-Input: String-State Pattern

**Entscheidung**: Alle Number-Felder auf `useState<string>` umstellen. Parsen bei `onBlur` oder Submit.

**Betroffene Dateien**:
- `frontend-food/src/pages/planning/MealEventListPage.tsx` (createPortions)
- `frontend-food/src/pages/planning/SettingsPanel.tsx` (portions, reserve, budget)
- `frontend-food/src/pages/recipes/CreateRecipePage.tsx` (servings)
- `frontend-food/src/pages/recipes/EditRecipePage.tsx` (servings)
- `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` (servingsMultiplier)

**Begründung**: `Number('') === 0` ist das Kernproblem. String-State hält `''` als gültigen Wert. Beim Submit wird `parseInt(val, 10) || minVal` verwendet.

**Alternative verworfen**: `inputMode="numeric"` mit `type="text"` — würde Tastatur auf Mobile nicht korrekt triggern. `type="number"` mit String-State kombiniert beides.

### 2. Servings im Edit-Modus: Display-Skalierung ohne Normalisierung

**Entscheidung**: InlineIngredientEditor erhält die `servings`-Prop des Rezepts. Quantities werden NICHT mehr auf 1 Portion normalisiert. Stattdessen werden die Original-Daten (pro-1-Portion) * Servings angezeigt. Beim Speichern werden die editierten Mengen / Servings geteilt, bevor sie gesendet werden.

**Betroffene Dateien**:
- `frontend-food/src/components/recipe/InlineIngredientEditor.tsx`: `normalizeItems()` ändern — nicht mehr auf 1 runterrechnen. Stattdessen `displayQuantity = item.quantity * servings`.
- `frontend-food/src/components/recipe/InlineIngredientEditor.tsx:319`: `updateRecipe.mutateAsync({ servings: 1 })` ENTFERNEN.
- `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`: `servings`-Prop korrekt übergeben (aktuell wird teilweise `recipe.servings` oder der dirty-State genutzt).

**Begründung**: Das Datenmodell speichert pro 1 Portion. Das UI soll aber zeigen „für N Portionen“, wenn der Nutzer das so eingestellt hat. Der Editor zeigte bisher immer pro-1-Portion-Werte, was verwirrend war.

### 3. Zutaten-Auswahl mit manueller Portion-Wahl

**Entscheidung**: Nach Auswahl einer Zutat im CreateRecipePage-IngredientAutocomplete werden die Portionen per `GET /api/ingredients/{slug}/portions/` geladen. Ein `<select>`-Dropdown erscheint neben der Zutat. `portion_id` wird gesetzt, sobald der Nutzer wählt. Beim Speichern werden nur Zutaten mit `portion_id !== null` übernommen.

**Betroffene Dateien**:
- `frontend-food/src/pages/recipes/CreateRecipePage.tsx`: `addIngredient()` erweitern um Portionen-Fetch und `portion_id`-Dropdown

**Begründung**: Der Nutzer soll explizit entscheiden, welche Portion (z.B. „1 Stück Zwiebel“ vs. „100g Zwiebel gewürfelt“) gemeint ist. Automatische Default-Portion-Auswahl wäre auch möglich, aber der Nutzer hatte sich für „manuell wählen“ entschieden.

### 4. Inline-Zutaten-Anlage

**Entscheidung**: `handleAddIngredient` im InlineIngredientEditor akzeptiert nun auch `slug: ''` (neue Zutat). Bei slug leer:
1. `POST /api/ingredients/` mit `name` → erhält neuen Ingredient mit slug
2. `POST /api/ingredients/{slug}/portions/` mit Default-Portion (name="Gramm", measuring_unit_id=14, quantity=1)
3. Neues EditItem mit `portion_id` der Default-Portion einfügen

Der `UnknownIngredientDialog`-`onCreateNew`-Callback ruft diesen Flow auf.

**Betroffene Dateien**:
- `frontend-food/src/components/recipe/InlineIngredientEditor.tsx`: `handleAddIngredient` umstellen
- `frontend-food/src/components/recipe/UnknownIngredientDialog.tsx`: `onCreateNew` signatur ändern → `(name: string) => void`

**Begründung**: Die bestehende Blockade (`toast.error('Bitte eine bestehende Zutat auswählen')`) wird durch echten Create-Flow ersetzt. Der Nutzer hatte sich für „Echtes Anlegen implementieren“ entschieden.

### 5. API_BASE_URL in Components

**Entscheidung**: `API_BASE_URL` aus `@/lib/api` importieren und in allen drei Komponenten verwenden.

**Betroffene Dateien**:
- `frontend-food/src/components/recipe/IngredientAutocomplete.tsx:61-63`: `fetch(\`/api/ingredients/...\`)` → `fetch(\`${API_BASE_URL}/api/ingredients/...\`)`
- `frontend-food/src/components/recipe/UnknownIngredientDialog.tsx:44`: `fetch(\`/api/ingredients/suggest/...\`)` → `fetch(\`${API_BASE_URL}/api/ingredients/suggest/...\`)`
- `frontend-food/src/components/recipe/InlineIngredientEditor.tsx:187`: `fetch(\`/api/ingredients/...\`)` → `fetch(\`${API_BASE_URL}/api/ingredients/...\`)`

**Begründung**: Alle anderen API-Hooks nutzen bereits `API_BASE_URL`. Diese drei Komponenten waren inkonsistent und würden in Production (ohne Vite-Proxy) scheitern.

### 6. Einheiten-Dropdown-Labels

**Entscheidung**: Option-Label von `{p.measuring_unit_name || p.name}` ändern zu `{p.quantity} {p.measuring_unit_name || p.name}`. Bei `quantity === 1` und existierendem `weight_g`: `{p.weight_g}g` als zusätzliche Info.

**Betroffene Dateien**:
- `frontend-food/src/components/recipe/InlineIngredientEditor.tsx:439`

**Begründung**: Wenn eine Zutat Portionen „1 Gramm“ (default, weight_g=1) und „100 Gramm“ (weight_g=100) hat, sieht der Nutzer bisher zweimal „Gramm“. Mit Quantity-Präfix: „1 Gramm“ und „100 Gramm“ — eindeutig.

## Risks / Trade-offs

- **String-State für Number-Inputs**: `type="number"` mit String-Value ist ein React-Antipattern. React wirft eine Warning wenn `value` kein gültiger Number-String ist. Workaround: `inputMode="numeric"` mit `type="text"` und eigenem Parsing. Mobile-Tastatur bleibt numerisch.
  → **Mitigation**: `inputMode="numeric"` pattern="[0-9]*" verwenden, Parsing in onChange/onBlur.

- **Servings-Division bei Save**: Wenn Servings=0 (sollte nie vorkommen, aber defensiv), Division by zero.
  → **Mitigation**: `servings || 1` als Fallback.

- **Neue Zutat ohne Netzwerk**: Wenn Create-Ingredient-API nicht erreichbar ist, bleibt die Zutat im Editor hängen.
  → **Mitigation**: Toast-Fehlermeldung, Editor-State wird nicht verändert.

## Open Questions

Keine — alle Entscheidungen wurden in der Explore-Session getroffen.
