## Why

Im Rezept-Zutaten-Bearbeitungsmodus wird ein "Portionen (Basis)"-Feld angezeigt, das verwirrend ist und zu Fehlern führt. Zutatenmengen sollen immer pro 1 Portion gespeichert werden – die Skalierung erfolgt beim Anzeigen über den PortionScaler.

## What Changes

- **BREAKING**: Das editierbare "Portionen (Basis)"-Feld im `InlineIngredientEditor` wird entfernt
- Rezepte werden immer mit `servings = 1` als Basis gespeichert
- Der bestehende PortionScaler (Anzeigeseite) bleibt unverändert – er skaliert weiterhin die Mengen
- Das `servings`-Feld im Recipe-Model bleibt erhalten (für Skalierung), wird aber nicht mehr im Zutaten-Editor bearbeitet

## Capabilities

### New Capabilities

_Keine neuen Capabilities._

### Modified Capabilities

_Keine Spec-Level-Änderungen – dies ist eine reine UI-Vereinfachung._

## Impact

- **Frontend (food)**: `InlineIngredientEditor.tsx` – Entfernung des Servings-Editors und zugehöriger State-Logik
- **Backend**: Keine Änderungen nötig – `servings`-Feld bleibt im Model, wird nur immer auf 1 gesetzt
- **Schemas**: Keine Änderungen an Pydantic/Zod-Schemas nötig
- **Migrationen**: Keine
