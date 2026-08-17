## Context

Die IngredientDetailPage zeigt aktuell Nährwerte, Portionen, Aliase und Metadaten – aber nicht, welche Rezepte diese Zutat verwenden. Der Nutzer muss umständlich recherchieren. Es gibt bereits einen `usage_count`-Counter auf dem Ingredient-Modell, aber keine Auflistung der tatsächlichen Rezepte.

Die Recipe-Item-Relation ist ein 3-Hop-Chain: `RecipeItem → Portion → Ingredient`. Ein dedizierter Endpunkt und eine neue Sektion auf der Detailseite schließen diese Lücke.

## Goals / Non-Goals

**Goals:**
- Neuer API-Endpunkt `GET /api/ingredients/{slug}/recipes/` mit paginierter Response und Visibility-Filterung
- Neue Sektion „Rezepte mit dieser Zutat" am Ende der IngredientDetailPage
- Kompaktes Recipe-Grid (2-3 Spalten) mit Bild, Titel, Schwierigkeit – Lucide Icons
- Empty State mit CTA „Rezept mit {name} erstellen"
- Pre-Fill der Zutat bei Navigation zu `/recipes/new?ingredient={slug}` (inkl. portion_id)
- Neuer TanStack Query Hook `useRecipesByIngredient(slug)`

**Non-Goals:**
- Keine Änderung am Ingredient-Modell (usage_count bleibt bestehen, wird aber nicht für diese Sektion genutzt)
- Keine Änderung am RecipeItem-Modell
- Keine Filter-/Sortier-UI in der Sektion (erstmal einfache Auflistung)
- Keine „load more"-Pagination in der Sektion (erstmal nur erste Seite)

## Decisions

### 1. Dedizierter Endpunkt statt Embedding in IngredientDetailOut
- **Entscheidung**: `GET /api/ingredients/{slug}/recipes/` als separater Endpunkt im ingredient_router
- **Begründung**: Die Recipe-Liste ist paginiert und potenziell umfangreich. Sie in die Ingredient-Detail-Response zu embedden würde die Response unnötig aufblähen und Caching erschweren. Ein eigener Endpunkt erlaubt lazy loading und Pagination.
- **Alternative**: In `IngredientDetailOut` embedden – verworfen wegen Response-Größe und fehlender Paginierung.

### 2. Schema: RecipeSimilarOut + PaginatedRecipeSimilarOut
- **Entscheidung**: Existierendes `RecipeSimilarOut` für Items, neuer `PaginatedRecipeSimilarOut` als paginierter Wrapper (definiert in `supply/schemas/ingredients.py`). Frontend: `RecipeSimilarSchema` existiert bereits, nur `PaginatedRecipeSimilarSchema` als Zod-Wrapper ergänzen.
- **Begründung**: `RecipeSimilarOut` (id, title, slug, summary, image_url, difficulty, execution_time) ist kompakt und existiert bereits 1:1 synchron zwischen Pydantic und Zod. Nur der Paginierungs-Wrapper fehlt.
- **Alternative**: `RecipeListOut` – zu schwergewichtig.

### 3. Visibility-Filterung wie Recipe-Liste API
- **Entscheidung**: Gleiche Logik wie `_get_visible_recipes_qs()` in `recipe/api/recipes.py:70-101` anwenden: Staff sieht alles, System-Rezepte (owner=null, approved) + öffentliche Community (visibility=public, approved) für alle, eigene Rezepte für authenticated User. Zusätzlich `status=approved` + Ingredient-Filter.
- **Begründung**: Konsistenz mit der restlichen Recipe-API. Verhindert, dass private Rezepte oder Drafts in der Ingredient-Detailsektion auftauchen.

### 4. URL Query Param für Pre-Fill
- **Entscheidung**: `navigate('/recipes/new?ingredient={slug}')` – CreateRecipePage liest `useSearchParams().get('ingredient')` und lädt die Zutat
- **Begründung**: URL-Parameter sind persistent (überlebt Refresh), teilbar und bookmark-bar. Kein zusätzlicher State-Management-Aufwand.
- **Alternative**: Router State – verworfen weil flüchtig bei Refresh.

### 5. CreateRecipePage: Pre-Fill mit portion_id
- **Entscheidung**: CreateRecipePage lädt die Zutat per `useIngredient(slug)`, findet die Default-Portion (`is_default=true` oder erste Portion), und setzt `portion_id` direkt in den IngredientEntry.
- **Begründung**: Die `handleSave`-Funktion filtert `ingredients.filter(ing => ing.portion_id !== null)`. Ohne portion_id wird die Zutat stumm aus dem Save entfernt. Anders als `addIngredient` (das portion_id null setzt – pre-existing bug) MUSS unser Pre-Fill die portion_id befüllen.
- **Risiko**: Der Autocomplete-Flow setzt `portion_id: null` – ein pre-existing bug der mit diesem Change nicht gefixt wird, aber nicht wiederholt werden darf.

### 6. Lucide Icons
- **Entscheidung**: Alle Icons in der neuen Rezept-Sektion und dem Empty State verwenden **Lucide Icons** (`<ChefHat />`, `<UtensilsCrossed />`, `<Plus />` etc.)
- **Begründung**: Food-Frontend-Konvention (AGENTS.md): Neue Komponenten nutzen Lucide als Standard. Material Symbols bleiben nur in bestehenden Komponenten.

## Risiken / Trade-offs

- **Große Zutaten (z.B. Mehl, Salz, Wasser)**: Könnten hunderte Recipes haben. Paginierung mit erstmal nur erster Seite (20 Items) reicht für die Sektion – wer mehr will, öffnet die Recipe-Liste. → Kein Risiko
- **Pre-Fill bei nicht-existenter Zutat**: Wenn der Slug im URL-Parameter nicht existiert, soll CreateRecipePage graceful ignorieren (kein Fehler, einfach leere Zutatenliste). → Wird im Code abgesichert
- **Mehrere Zutaten im URL**: Erstmal nur eine Zutat. `ingredient=mehl&ingredient=salz` wird ignoriert (nur erste). → bewusst einfach gehalten, könnte später erweitert werden
- **Pre-existing bug in CreateRecipePage**: `addIngredient` setzt `portion_id: null`, aber `handleSave` filtert null portion_ids heraus. Manuell hinzugefügte Zutaten werden nie gespeichert. Dieser Bug wird nicht gefixt – aber unser Pre-Fill vermeidet ihn aktiv.
