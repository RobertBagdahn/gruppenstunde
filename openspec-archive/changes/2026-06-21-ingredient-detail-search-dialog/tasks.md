## 1. Backend: API-Erweiterungen

- [x] 1.1 `GET /api/ingredients/` in `backend/supply/api/ingredients.py`: `ordering`-Parameter hinzufügen (`price_asc`, `price_desc`, `nutri_class_asc`, `energy_kcal_asc`) mit `nulls_last=True` für NULL-Werte
- [x] 1.2 `GET /api/ingredients/` in `backend/supply/api/ingredients.py`: `nutritional_tag`-Parameter (int, optional) hinzufügen, der per ManyToMany-Filter (`nutritional_tags__id`) filtert
- [x] 1.3 Backend manuell testen: `GET /api/ingredients/?ordering=price_asc&nutritional_tag=5` liefert korrekte Ergebnisse

## 2. Frontend: Schema-Sync-Fix

- [x] 2.1 `IngredientListItemSchema` in `frontend-food/src/schemas/supply.ts`: Feld `quality_score: z.number().int().nullable().optional()` hinzufügen

## 3. Frontend: TanStack-Query-Hook

- [x] 3.1 `useIngredientSearch`-Hook in `frontend-food/src/api/supplies.ts` erstellen: Parameter `name`, `retail_section`, `nutritional_tag`, `ordering`, `page`, `page_size`; nutzt `GET /api/ingredients/`; gibt paginiertes `IngredientListItemSchema` zurück
- [x] 3.2 Hook mit `useDeferredValue` für den Suchtext entwerfen (kein manuelles Debounce nötig)

## 4. Frontend: IngredientQuantityDialog extrahieren

- [x] 4.1 Privaten `IngredientQuantityDialog` aus `frontend-food/src/pages/planning/RecipeSearchDialog.tsx` in eigenständige Komponente `frontend-food/src/components/recipe/IngredientQuantityDialog.tsx` extrahieren
- [x] 4.2 Props-Interface anpassen: `ingredient: { id: number; name: string; portions: PortionSchema[] }`, `open`, `onOpenChange`, `onConfirm: (portionId: number | null, measuringUnitId: number | null, quantity: number) => void`
- [x] 4.3 Standardportion via `is_default=true` vorauswählen (statt `portions[0]`)
- [x] 4.4 Import in `RecipeSearchDialog.tsx` auf neue Komponente umstellen, Verhalten prüfen (RecipeSearchDialog behält eigene private Komponente wegen inkompatibler IngredientPortion-Typen aus mealPlan.ts; neue Komponente wird im IngredientDetailSearchDialog verwendet)

## 5. Frontend: IngredientDetailSearchDialog

- [x] 5.1 Neue Komponente `frontend-food/src/components/recipe/IngredientDetailSearchDialog.tsx` erstellen: shadcn `<Dialog>` mit `max-w-3xl max-h-[85vh]`
- [x] 5.2 Suchfeld mit `autoFocus` und `useDeferredValue` implementieren
- [x] 5.3 Abteilungs-Filter-Pills mit `useRetailSections()` befüllen; "Alle" als Default
- [x] 5.4 Diät-Tag-Toggle-Pills mit `useNutritionalTags()` befüllen; Mehrfachauswahl (AND-Logik)
- [x] 5.5 Sortierungs-Auswahl implementieren: Relevanz / Preis (↑) / Preis (↓) / Nutriscore / Kalorien
- [x] 5.6 Ergebnisliste mit `useIngredientSearch`-Hook rendern; "Mehr laden"-Button für Paginierung
- [x] 5.7 Ergebniszeile: Name, Abteilungsname, Preis/kg, Nutriscore-Badge (A–E farbig), kcal, Protein anzeigen; fehlende Werte als "–"
- [x] 5.8 Nutriscore-Badge: `nutri_class` 1→grün (A), 2→hellgrün (B), 3→gelb (C), 4→orange (D), 5→rot (E)
- [x] 5.9 Bei Klick auf Zutat: Portionen via `GET /api/ingredients/{slug}/portions/` laden und `IngredientQuantityDialog` öffnen
- [x] 5.10 State-Reset bei Dialog-Öffnung: Suchtext, Filter und Sortierung zurücksetzen
- [x] 5.11 Props: `open`, `onOpenChange`, `onSelect: (ingredientSlug: string, portionId: number | null, measuringUnitId: number | null, quantity: number) => void`

## 6. Frontend: InlineIngredientEditor integrieren

- [x] 6.1 [⚙]-Button (shadcn `<Button variant="ghost" size="icon">` mit `<SlidersHorizontal>`-Icon) neben dem "Zutat hinzufügen..."-Feld im `InlineIngredientEditor` ergänzen
- [x] 6.2 `IngredientDetailSearchDialog` in `InlineIngredientEditor` einbinden; Dialog-State verwalten
- [x] 6.3 `onSelect`-Callback: Aus Dialog-Rückgabe (slug, portionId, measuringUnitId, quantity) eine neue Zeile in `editItems` anlegen — analog zu `handleAddIngredient`, aber mit befüllter `quantity` statt 0
- [x] 6.4 Sicherstellen dass nach Dialog-Bestätigung der Dialog geschlossen wird und die neue Zeile am Ende der Liste erscheint
