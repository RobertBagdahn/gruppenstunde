## Why

Die AI-Mengenschätzung zeigt aktuell eine Gesamtmenge für N Portionen und übernimmt alle Werte auf einmal. Nutzer können nicht erkennen, was sich ändert (kein Alt/Neu-Vergleich) und haben keine Kontrolle über einzelne Zutaten. Die Schätzung soll immer nur pro Person (1 Portion) erfolgen und jede Zeile einzeln übernehm- oder ablehnbar sein.

## What Changes

- AI-Mengenschätzung zeigt nur noch Werte pro Person (keine Hochrechnung auf Portionen)
- Jede Zutat-Zeile zeigt **Alt-Wert** (aktuell gespeichert) und **Neu-Wert** (AI-Schätzung)
- Jede Zeile hat eine Checkbox — standardmäßig **unchecked**
- "Übernehmen" appliziert nur die angehakten Zeilen
- Bulk-Aktionen: "Alle auswählen" / "Alle abwählen"

## Capabilities

### New Capabilities

_Keine neuen Capabilities — rein UI-Änderung im bestehenden Feature._

### Modified Capabilities

_Keine Spec-Level-Änderungen — das Backend liefert bereits `quantity_per_person`. Nur Frontend-Darstellung und Interaktion ändern sich._

## Impact

- **Frontend**: `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` — Dialog-Darstellung und Apply-Logik
- **Backend**: Keine Änderung nötig (liefert bereits `quantity_per_person` und `unit`)
- **Schemas**: Keine Änderung — `EstimateQuantityItem` hat bereits alle benötigten Felder
- **Migrations**: Keine
