## Why

BE (Broteinheit) als Recheneinheit im Frühstücksassistenten ist eine unnötige Abstraktion, die die Bedienung und das Verständnis des Energie-Checks erschwert. Nutzer denken in Gramm und Kalorien, nicht in belegbaren Flächen. Die BE führt zu doppelten Berechnungsschritten (BE → Scheiben → Gramm → kcal) und schafft Verwirrung bei der Belag-Deckung. Ziel ist eine vollständige Umstellung auf Gramm + kcal als einzige Einheiten.

## What Changes

- **BREAKING**: `bePerPerson` aus Wizard-State entfernt, ersetzt durch `gramsPerPerson` (Gramm Brot pro Person)
- **BREAKING**: Alle Berechnungsfunktionen in `breakfastCalc.ts` von BE auf Gramm umgestellt
- Schritt 1 (Basis): Gesamt-Gramm/Person als Eingabe, nicht BE/Person
- Schritt 2 (Belag): Gramm-basierte Deckung statt BE-Deckung (Brot:Belag-Verhältnis in Gramm)
- Schritt 5 (Cockpit): Gramm + natürliche Einheiten (z.B. "158g (2,64 Scheiben)"), kein BE-Begriff
- Normalisieren: Skaliert Brot-Gramm + Belag-Gramm proportional (nicht BE)
- `day_part_factor` für Frühstück auf 0.30 geändert (30% Tagesbedarf)
- Extras (warme Gerichte) liefern kcal über Backend, fließen in Energie-Ist
- Backend: Neuer Endpoint für Extra-Zutaten kcal-Berechnung
- Keine Datenmigration nötig (Backend speichert bereits in Gramm)

## Capabilities

### New Capabilities
- `breakfast-wizard-no-be`: Komplette Entfernung der BE als Recheneinheit im Frühstücksassistenten, Umstellung auf Gramm + kcal

### Modified Capabilities
- `breakfast-wizard`: Anpassung der Requirements für Schritt 1 (Gramm statt BE), Schritt 2 (Gramm-basierte Deckung), Schritt 5 (Gramm + natürliche Einheiten), Normalisieren (Gramm-Skalierung), day_part_factor auf 0.30
- `breakfast-cockpit-portions`: Keine Portions-Anzeige mehr aus BE abgeleitet, stattdessen Gramm + natürliche Einheiten direkt

## Impact

- `frontend-food/src/lib/breakfastCalc.ts` — komplett überarbeitet (keine BE-Funktionen mehr)
- `frontend-food/src/pages/planning/breakfast/StepBasis.tsx` — Gramm-Slider statt BE-Slider
- `frontend-food/src/pages/planning/breakfast/StepBelag.tsx` — Gramm-basierte Deckung
- `frontend-food/src/pages/planning/breakfast/StepCockpit.tsx` — Gramm + natürliche Einheiten im Cockpit
- `frontend-food/src/pages/planning/breakfast/useWizardState.ts` — bePerPerson → gramsPerPerson
- `frontend-food/src/schemas/breakfast.ts` — Zod-Schemas angepasst
- `frontend-food/src/lib/refMealToWizardState.ts` — Rekonstruktion aus RefMeal ohne BE
- `backend/recipe/api/` — ggf. neuer Endpoint für Extra-Zutaten kcal
- Keine DB-Migration erforderlich (Backend speichert bereits in Gramm)
