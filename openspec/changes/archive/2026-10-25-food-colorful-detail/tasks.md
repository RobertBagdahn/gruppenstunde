# Tasks

## 1. Chip-Zeilen

- [x] 1.1 `lib/recipeTypeStyle.ts`: Konstante `RECIPE_DOT_CLASSES` mit vollständigen Literalen (`bg-category-*-foreground`) je Rezepttyp ergänzen.
- [x] 1.2 `components/recipe/CategoryPills.tsx`: inaktive Chips weiß mit Rand und Farbpunkt; aktiv `border-primary text-primary-dark`, keine Füllung; „Alle“ ohne Punkt; Klassen auf 44 px Höhe mobil.
- [x] 1.3 Test: `CategoryPills` rendert Punkte je Typ und keine `bg-primary`-Klasse am aktiven Chip.

## 2. Kennzahlen

- [x] 2.1 `components/recipe/RecipeKeyFigures.tsx`: Prop `tint` entfernen, Kacheln `bg-card shadow-card border border-line`, Label `text-primary-dark uppercase`.
- [x] 2.2 Abgedeckt durch die Regel „bg-category- nur in erlaubten Dateien“ (4.1); kein eigener Kennzahlen-Test, Label-Großschreibung per Klasse `uppercase`.

## 3. Tönungen außerhalb von Rezepttypen

- [x] 3.1 `pages/HomePage.tsx`: Bereichskacheln und Anleitungs-Marken ohne Tönung, Icon in `text-primary`; Blöcke „Mahlzeiten“/„Personen“ neutral.
- [x] 3.2 `pages/ingredients/detail/IngredientSummary.tsx`: Kennzahlen neutral, Icon in Petrol.
- [x] 3.3 `pages/shopping/ShoppingListDetailPage.tsx` (Hinweisbanner Zeile 680): neutral mit Petrol-Icon.
- [x] 3.4 Bestehende Tests der drei Dateien unverändert grün; Test-IDs und `aria`-Labels unverändert.

## 4. Regelprüfung

- [x] 4.1 `src/__tests__/designRules.test.ts`: Regel „bg-category- nur in erlaubten Dateien“ ergänzen; erlaubte Liste dokumentieren.
- [x] 4.2 Geprüft: eine temporäre Datei mit `bg-category-warm-soft` lässt die Regel rot werden; Datei danach entfernt.

## 5. Prüfung

- [x] 5.1 Im Verzeichnis `frontend-food`: `npm test` grün.
- [x] 5.2 `npm run lint` grün.
- [x] 5.3 `npx tsc --noEmit` grün.
- [x] 5.4 `openspec validate food-colorful-detail --strict` grün.
- [x] 5.5 Playwright-Baselines im Container aktualisiert (`e2e/update-ui-baselines.sh`, zweimal identisch, 117 passed); Sichtprüfung der Baselines für Startseite (390 px) und Rezeptdetail (1440 px) OK.
