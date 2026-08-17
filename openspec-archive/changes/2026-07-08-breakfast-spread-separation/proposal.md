## Why

Butter und Margarine sind im Frühstücksassistent aktuell als normale Beläge (Tag `breakfast-topping`) modelliert und konkurrieren im selben Share%-Pool mit Nutella, Käse, Salami etc. Real wird Streichfett jedoch als Basisschicht *vor* dem Belag aufs Brot aufgetragen — eine fundamentale Modellierungslücke. Zudem fehlt die Möglichkeit, eine Ohne-Fett-Quote zu definieren und zwischen Butter/Margarine zu unterscheiden.

## What Changes

- **BREAKING**: Neuer Wizard-Schritt "Streichfett" zwischen Basis (Schritt 1) und Belag (Schritt 3) → 6 Schritte
- **BREAKING**: Neuer Content-Tag `breakfast-fat` für Streichfett-Zutaten (Butter, Margarine)
- Butter verlässt den `breakfast-topping`-Tag → wird zu `breakfast-fat`
- Neue Seed-Zutat "Margarine" mit Tag `breakfast-fat`
- Streichfett-Kcal wird vor Belag aus dem distributable Budget abgezogen
- Butter/Margarine/KeinFett haben eigene Share%-Slider (Summe=100%), rebalanceShares-Mechanismus
- Feste Portionsgröße: 8g pro Person (kein Intensity-Selector)
- "Kein Fett" wird als expliziter Eintrag im Slider-Pool geführt (0 kcal)
- Eigene Sektion im Cockpit + eigene Reste-Kalkulation + Preisanzeige
- Migration: existierende Butter-Zutat bekommt `breakfast-fat`-Tag
- Wizard kann weitere Streichfette aufnehmen (Zutaten mit Tag `breakfast-fat` erscheinen automatisch)

## Capabilities

### New Capabilities

- `breakfast-spread`: Spezifikation des Streichfett-Schritts im Frühstücksassistenten

### Modified Capabilities

- `breakfast-wizard`: Neuer Schritt, veränderter Kcal-Fluss, neuer Streichfett-Bereich im Cockpit

## Impact

- **Backend**: `supply/api/breakfast_catalog.py` — `fat_ingredients` im CatalogOut, neues Feld + Query
- **Backend**: `supply/management/commands/seed_breakfast_catalog.py` — Margarine + Tag `breakfast-fat`
- **Backend**: Migration für Tag-Umhängung von Butter
- **Frontend**: `frontend-food/src/schemas/breakfast.ts` — `FatSelectionSchema`, `WizardState` um `fatSelections` ergänzt
- **Frontend**: `frontend-food/src/pages/planning/breakfast/useWizardState.ts` — 6 Schritte, neue Actions
- **Frontend**: Neuer Step `StepStreichfett.tsx` zwischen StepBasis und StepBelag
- **Frontend**: `StepCockpit.tsx` — neue Streichfett-Sektion
- **Frontend**: `BreakfastWizardPage.tsx` — Integration neuer Schritt
- **Frontend**: `refMealToWizardState.ts` — Butter aus Toppings erkennen und in Fats umwandeln
- **Kcal-Fluss**: `breakfastCalc.ts` — `computeGroupKcal` um Streichfett-Abzug erweitert
