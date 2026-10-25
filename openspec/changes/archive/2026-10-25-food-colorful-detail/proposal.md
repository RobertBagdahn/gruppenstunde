# Proposal

## Why

Die freigegebene Farbrichtung „Essensplan Farbrichtungen“ (Claude-Design-Leinwand) wünscht ein ruhiges, buntes Food-Frontend: Farbe über kleine Akzente, Plaketten und Beschriftungen statt über große Flächen. Der Code weicht davon an mehreren Stellen ab. Filter-Chips sind als gefüllte Petrol-Flächen gestaltet, Kennzahlen und Kacheln tragen Kategorie-Tönungen als große Flächen, und die Kategorie-Tönungen erscheinen auch dort, wo sie nach `food-sticker-redesign` nur Rezepttypen kennzeichnen dürfen (Startseite, Zutaten-Kennzahlen, Einkaufsliste). Dadurch sind Tönungen nicht mehr eindeutig einem Rezepttyp zugeordnet.

## What Changes

- Filter-Chip-Zeilen (Rezeptübersicht) werden weiß mit feinem Rand; nur ein Farbpunkt je Rezepttyp trägt Farbe. Der aktive Chip wird über Rand und Schrift in Petrol markiert, nicht über eine gefüllte Fläche.
- Kennzahlen auf der Rezeptdetailseite werden neutrale Kacheln (weiße Fläche, Kartenschatten, feine Linie) mit kleiner, farbiger Großbuchstaben-Beschriftung in der einen Akzentfarbe Petrol. Kategorie-Tönungen entfallen dort.
- Kategorie-Tönungen entfallen auf der Startseite (Bereichskacheln, Anleitungs-Marken), bei den Kennzahlen der Zutatenseite und im Hinweisbanner der Einkaufsliste. Die Kacheln bekommen eine Petrol-Ikone statt einer Fläche.
- **Nicht umgesetzt** (Konflikte mit der bestehenden Spec, siehe `design.md`): farbige Schatten, mehrfarbige Detail-Tags über Rezepttypen hinaus (Zeit, Preis, Quelle, Allergene, Abteilung).

## Capabilities

### New Capabilities
- `food-category-colour-usage`: Regeln, wo Farbe im Food-Frontend erscheinen darf: Kategorie-Tönungen nur für Rezepttypen, Chip-Zeilen weiß mit Farbpunkt, Kennzahlen mit farbigem Label auf neutraler Fläche.

### Modified Capabilities
<!-- Keine. Die Requirements der Basis-Spec food-design-system stehen im noch nicht archivierten Change food-sticker-redesign. Deshalb werden die neuen Regeln als ADDED in einer eigenen Capability festgehalten, nicht als MODIFIED gegen den Hauptspec. -->

## Impact

- Frontend (`frontend-food/`): `components/recipe/CategoryPills.tsx`, `components/recipe/RecipeKeyFigures.tsx`, `pages/HomePage.tsx`, `pages/ingredients/detail/IngredientSummary.tsx`, `pages/shopping/ShoppingListDetailPage.tsx`, `lib/recipeTypeStyle.ts` (Punkt-Klassen als vollständige Literale), zugehörige Tests und die Design-Regeln in `src/__tests__/designRules.test.ts`.
- Backend: keine Änderung. Keine API-, Schema- oder Zod-Änderung.
- Abhängigkeit: Der Change `food-sticker-redesign` ist noch nicht archiviert. Die neue Capability ist zu ihm kompatibel; Archivierungsreihenfolge ist unkritisch, weil keine MODIFIED-Deltas bestehen.
- Visuelle Baselines (Playwright-Screenshots) ändern sich; die Aktualisierung erfolgt nur im Container (`e2e/update-ui-baselines.sh`) und ist in diesem Lauf nicht möglich.
