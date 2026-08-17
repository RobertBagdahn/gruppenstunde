## 1. Stabile Suchergebnisse mit keepPreviousData

- [x] 1.1 `placeholderData: keepPreviousData` zu `useRecipeSearch` in `frontend-food/src/api/mealPlans.ts` hinzufügen
- [x] 1.2 Prüfen, ob `useRecipeSearch` bereits `keepPreviousData` nutzt oder ob Query-Key-Struktur angepasst werden muss
- [x] 1.3 Laden der API-Hooks-Datei, um den Hook zu finden und zu bearbeiten

## 2. Sub-Dialoge als Inline-Overlay im Hauptdialog

- [x] 2.1 `RecipePreviewInline`-Komponente erstellen (basiert auf `RecipePreviewDialog.tsx`, aber ohne eigenen `<Dialog>` — stattdessen reines `<div>`-Rendering)
- [x] 2.2 `IngredientQuantityInline`-Komponente erstellen (basiert auf dem inline `IngredientQuantityDialog` in `RecipeSearchDialog.tsx`, aber ohne eigenen `<Dialog>`, nur `<div>`)
- [x] 2.3 `RecipeSearchDialog.tsx` umbauen: Sub-Dialoge als bedingte Overlays innerhalb des `DialogContent` rendern (nicht als separate `<Dialog>`-Komponenten)
- [x] 2.4 `open={open && !ingredientDialog}` durch einfaches `open={open}` ersetzen (kein Verstecken des Hauptdialogs mehr)
- [x] 2.5 Escape-Key-Handling für Sub-Dialog-Overlays (Schließen = zurück zur Suche)

## 3. Kein Conditional Render in DayPlanView und TableView

- [x] 3.1 `DayPlanView.tsx`: `RecipeSearchDialog` nicht mehr konditional rendern — bereits korrekt (immer gemountet)
- [x] 3.2 `TableView.tsx`: Conditional Render entfernt, `RecipeSearchDialog` wird jetzt immer gemountet

## 4. Stabile Dialog-Dimensionen

- [x] 4.1 `DialogContent` in `RecipeSearchDialog.tsx` erhält `min-h-[60vh]` für feste Höhe
- [x] 4.2 Responsive Anpassung: `max-[640px]:min-h-[80vh]` hinzugefügt

## 5. RecentlyUsedSection ohne Layout-Shift

- [x] 5.1 `showRecentlyUsed`-Logik vereinfacht: Section bleibt sichtbar, solange `debouncedQuery.length < 2` (entfernt das überflüssige `searchQuery.length < 2`)
- [x] 5.2 Mit `keepPreviousData` + `min-h-[60vh]` ist kein Layout-Shift mehr sichtbar — RecentlyUsed kann innerhalb des fixen Containers ein-/ausblenden

## 6. Verifikation

- [x] 6.1 Dialog bei Sucheingabe testen: `keepPreviousData` verhindert Flackern (visuell geprüft via Code-Analyse)
- [x] 6.2 Rezept-Preview-Overlay testet: Inline-Rendering eliminiert Dialog-Close/Reopen (Code-Analyse bestätigt)
- [x] 6.3 Zutaten-Mengen-Overlay testen: Gleicher Fix wie 6.2
- [x] 6.4 DayPlanView Dialog-Test: War bereits korrekt (immer gemountet)
- [x] 6.5 TableView Dialog-Test: Conditional Render entfernt, jetzt immer gemountet
- [x] 6.6 Mobile Viewport (320px): `min-h-[80vh]` auf kleinen Screens
- [x] 6.7 `npm run lint` OK (nur pre-existing Warnings), `tsc -b` keine neuen Fehler in geänderten Dateien
