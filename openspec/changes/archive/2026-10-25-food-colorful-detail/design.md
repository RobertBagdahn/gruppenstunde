# Design

## Kontext

Der Code-Stand liegt nach `food-sticker-redesign` vor (Tokens, Sticker, `RecipeTypeTag`, `RecipeThumbnail`). Vier Stellen widersprechen der freigegebenen Farbrichtung oder der Regel „Kategorie-Tönungen nur für Rezepttypen“:

- `components/recipe/CategoryPills.tsx`: aktive Chips als gefüllte Petrol-Fläche, inaktive Chips neutral mit Rand.
- `components/recipe/RecipeKeyFigures.tsx`: jede Kennzahl als Kategorie-Tönungsfläche (`bg-category-*-soft`).
- `pages/HomePage.tsx`: Bereichskacheln (Zeilen 28 bis 31) und Anleitungs-Marken (Zeile 37) mit Kategorie-Tönungen, dazu Blöcke „Mahlzeiten“/„Personen“ (Zeilen 144 bis 151).
- `pages/ingredients/detail/IngredientSummary.tsx` (Zeilen 52 bis 70) und `pages/shopping/ShoppingListDetailPage.tsx` (Zeile 680): Tönungen außerhalb von Rezepttypen.

## Entscheidungen

- **D1 Chips**: `CategoryPills` bleibt der einzige Chip-Baustein der Rezeptübersicht. Inaktiv: `bg-card border-border` mit Farbpunkt (`span` mit Klasse aus einer neuen Konstante `RECIPE_DOT_CLASSES` in `lib/recipeTypeStyle.ts`, vollständige Literale). Aktiv: `border-primary text-primary-dark`, keine Füllung. „Alle“ erhält keinen Punkt.
- **D2 Kennzahlen**: `Figure` in `RecipeKeyFigures.tsx` nutzt `bg-card shadow-card border border-line` und ein Label mit `text-primary-dark uppercase`. Die Prop `tint` entfällt. Die Nutri-Score-Plakette bleibt unverändert, weil sie über `NutriScoreBadge` läuft.
- **D3 Bereichskacheln**: Das Feld `tint`/`accent` in der Konstante der Startseite wird durch ein Icon in `text-primary` ersetzt. Die Anleitungs-Marke wird ein Petrol-Punkt. Blöcke „Mahlzeiten“/„Personen“ werden auf `bg-card` mit Petrol-Label umgestellt.
- **D4 Zutatenkennzahlen und Einkaufsbanner**: neutrale Fläche mit Petrol-Icon bzw. Petrol-Schrift.
- **D5 Tests**: `designRules.test.ts` erhält eine Regel: Außerhalb von `RecipeTypeTag`, `RecipeThumbnail`, `RecipeMetaCard`, `RecipeSearchCard`, `RecipeStepsReadOnly`, `CategoryPills` und `recipeTypeStyle.ts` darf `bg-category-` nicht vorkommen. Die Liste der erlaubten Dateien wird als Konstante geführt.

## Konflikte mit der Canvas (bewusst nicht umgesetzt)

- **Farbige, weiche Schatten** (Canvas „weiche farbige Schatten“): Die Spec `food-design-system` (Requirement „Reduziertes Gradient- und Schatten-Set“) verlangt genau drei neutrale Schatten (`card`, `soft`, `raised`) und kein weiteres Set. Umgesetzt wird `shadow-card` wie spezifiziert. Entscheidung für die Spec, nicht für die Canvas.
- **Mehrfarbige Detail-Tags** (Typ, Zeit, Preis, Quelle, Eigenschaften, Allergene, Abteilung): Die Spec (Requirement „Kategorie-Tönungen nur für Rezepttypen“) erlaubt Tönungen ausschließlich für Rezepttypen. Die Canvas verlangt Farbe für alle Detail-Tags. Umgesetzt wird nur, was die Spec zulässt: Tags bleiben neutral, Farbe nur über Icon oder Punkt in Petrol. Die Eigenschaften-Tags (`PositiveTraitsBadges`, Status-Grün) bleiben unverändert, weil sie bereits eine Statusdarstellung mit Rand und Icon sind.
- **Gelber Sticker**: Die Canvas erlaubt eine Plakette „Beliebt“. Die Spec erlaubt höchstens einen Sticker je Ansicht. Bestehender Stand wird beibehalten.
- **Weißer Grund und Petrol als Hauptfarbe** bleiben unverändert (Spec).

## Risiken

- Die e2e-Screenshots ändern sich. Die Baselines können nur im Container erzeugt werden; in diesem Lauf nicht möglich. Die Abnahme der Screenshots ist damit offen.
- `food-sticker-redesign` ist nicht archiviert; die neue Capability ist unabhängig davon, bei einer späteren Konsolidierung der Specs bleiben die Requirements erhalten.
