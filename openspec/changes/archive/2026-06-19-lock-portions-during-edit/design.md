## Context

Der `InlineIngredientEditor` initialisiert `editItems` via `useState(() => normalizeItems(items, servings))`. Der Initializer läuft nur beim Mount. Wenn der Nutzer während des Edit-Modus den PortionScaler in der Sidebar verstellt, ändert sich die `servings`-Prop, aber `editItems` wird nicht neu berechnet. Das führt zu inkonsistenten Mengen.

## Goals / Non-Goals

**Goals:**
- PortionScaler während `isInlineEditMode === true` deaktivieren
- Nach Schließen des Editors wieder aktivieren

**Non-Goals:**
- Edit-Items bei servings-Änderung live neu berechnen (komplexer, anderer Change)
- Mobile/Desktop unterschiedlich behandeln

## Decisions

### 1. `disabled`-Prop an PortionScaler weiterreichen

**Entscheidung**: `PortionScaler` erhält eine optionale `disabled?: boolean`-Prop. Bei `true` werden +/- Buttons per `disabled`-Attribut und Tailwind-`opacity-50` deaktiviert, das Input-Feld wird `readOnly`.

**Betroffene Dateien**:
- `frontend-food/src/components/recipe/PortionScaler.tsx`: Neue `disabled` Prop, CSS-Klassen
- `frontend-food/src/components/recipe/RecipeSidebar.tsx`: `disabled`-Prop annehmen und an PortionScaler durchreichen
- `frontend-food/src/components/recipe/PortionBottomSheet.tsx`: `disabled`-Prop annehmen und an PortionScaler durchreichen
- `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`: `isInlineEditMode` als `disabled` an RecipeSidebar und PortionBottomSheet übergeben

### 2. Kein separater Lock-Zustand

**Entscheidung**: `isInlineEditMode` direkt als `disabled`-Signal verwenden. Kein zusätzlicher State nötig.

**Begründung**: `isInlineEditMode` spiegelt exakt den Zustand wider, den wir sperren wollen — wenn der Editor offen ist, soll der Scaler gesperrt sein.

## Risks / Trade-offs

- **Nutzer kann Portionen nicht ändern während Editor offen**: Absicht. Der Nutzer muss den Editor schließen, Portionen ändern, und neu öffnen.
  → **Mitigation**: Ist das gewünschte Verhalten. Alternativ könnte man beim Schließen warnen „Ungespeicherte Änderungen“, aber das ist out of scope.
