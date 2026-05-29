## Context

Der `InlineIngredientEditor` in `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` zeigt ein editierbares "Portionen (Basis)"-Feld. Dieses erlaubt es, die Basis-Portionszahl zu ändern, auf der die Zutatenmengen beruhen. In der Praxis sollen alle Rezepte immer auf 1 Portion normiert sein – die Skalierung auf gewünschte Portionen erfolgt über den `PortionScaler` auf der Anzeigeseite.

## Goals / Non-Goals

**Goals:**
- "Portionen (Basis)"-Feld aus dem Bearbeitungsmodus entfernen
- `servings` beim Speichern immer auf 1 setzen
- Bestehende Rezepte mit `servings != 1` bei Bearbeitung auf 1 normieren (Mengen umrechnen)

**Non-Goals:**
- Änderungen am PortionScaler (Anzeigeseite)
- Änderungen am Backend-Model oder API-Schema
- Migration bestehender Daten (wird bei nächster Bearbeitung normiert)

## Decisions

1. **Immer `servings = 1` beim Speichern**: Der `InlineIngredientEditor` sendet immer `servings: 1` an die API.

2. **Mengen-Normierung bei Bearbeitung**: Wenn ein Rezept mit `servings > 1` geöffnet wird, werden die Zutatenmengen durch `servings` geteilt, sodass sie pro 1 Portion vorliegen. Beim Speichern wird dann `servings: 1` gesetzt.

3. **UI-Vereinfachung**: Das gesamte Servings-Editor-Element (Zeilen 266-278 in `InlineIngredientEditor.tsx`) wird entfernt. Der `editServings`-State wird entfernt oder auf konstant 1 gesetzt.

## Risks / Trade-offs

- **Datenkonsistenz**: Rezepte mit `servings != 1` die nicht erneut bearbeitet werden, bleiben unverändert. Der PortionScaler auf der Anzeigeseite funktioniert weiterhin korrekt mit deren `servings`-Wert.
- **Rundungsfehler**: Bei Division durch `servings` können Rundungsfehler entstehen (z.B. 3 Eier / 4 Portionen = 0.75). Das ist akzeptabel – der Nutzer kann manuell korrigieren.
