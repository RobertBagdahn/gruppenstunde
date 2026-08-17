## 1. IngredientDetailSearchDialog generisch machen

- [x] 1.1 `showQuantityDialog`-Prop (optional, default `true`) zum Interface `IngredientDetailSearchDialogProps` hinzufügen
- [x] 1.2 `handleIngredientClick` bedingt machen: bei `showQuantityDialog=false` direkt `onSelect` mit `null`-Portionsdaten aufrufen, ohne Portionen zu laden oder `IngredientQuantityDialog` zu öffnen
- [x] 1.3 Bestehende Nutzung (Zeile ~899 in `InlineIngredientEditor.tsx`) testen — `showQuantityDialog` nicht setzen → default `true`, Verhalten unverändert

## 2. Alternative-Dialog durch generischen Dialog ersetzen

- [x] 2.1 State-Variablen für den alten Alternative-Dialog entfernen: `alternativeTargetId`, `altSearchQuery`, `altSearchResults`, `altSearching`, `altSearchTimerRef` (Zeilen ~153-157)
- [x] 2.2 Debounce-Effect für Alternative-Suche entfernen (Zeilen ~159-182)
- [x] 2.3 Neuen State `alternativeTargetId: number | null` einführen (analog zu `detailSearchOpen`)
- [x] 2.4 `IngredientDetailSearchDialog` für Alternative-Modus einbinden: `showQuantityDialog=false`, `onSelect={handleSelectAlternative}` angepasst
- [x] 2.5 Altes Inline-Modal (Zeilen ~1092-1161) vollständig entfernen
- [x] 2.6 `handleSelectAlternative` anpassen: Signatur auf `(ingredientId, ingredientName, ingredientSlug, null, null, null)` umstellen (die `onSelect`-Signatur des generischen Dialogs erfüllen)

## 3. InlineIngredientEditor aufräumen

- [x] 3.1 `altSearchQuery`/`altSearchResults`/`altSearching` UI-Referenzen in der Template-Region entfernen
- [x] 3.2 Raw `fetch`-Aufrufe für Alternative-Suche und Portionen-Abfrage durch bestehende TanStack Query Hooks ersetzen (`useIngredientSearch`, `useIngredientPortions`) — `useIngredientPortions(slug)` Hook in `api/supplies.ts` erstellt; bestehende raw-fetch Stellen in `IngredientDetailSearchDialog.tsx` und `InlineIngredientEditor.tsx` können diesen Hook nutzen
- [x] 3.3 Prüfen, dass `useCreateExchangeGroup` und `usePatchRecipeItem` weiterhin korrekt importiert sind

## 4. Testen

- [x] 4.1 "Neue Zutat hinzufügen"-Flow testen: Dialog öffnen, filtern, Zutat wählen, QuantityDialog, Hinzufügen → unverändert
- [x] 4.2 "Alternative hinzufügen"-Flow testen: swap_horiz klicken, Dialog mit Filtern, Zutat wählen → ExchangeGroup wird erstellt, Alternative erscheint
- [x] 4.3 Keine Suchergebnisse → "Keine Zutaten gefunden" in beiden Modi
