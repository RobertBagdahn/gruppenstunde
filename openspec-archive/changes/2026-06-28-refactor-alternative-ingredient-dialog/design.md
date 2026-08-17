## Context

Der `InlineIngredientEditor` (`frontend-food/src/components/recipe/InlineIngredientEditor.tsx`) hat zwei verschiedene Wege, Zutaten zu suchen:

1. **Neue Zutat hinzufügen**: Nutzt `IngredientDetailSearchDialog` (Zeile ~899) — voll ausgestattet mit Filtern, Paginierung, Nährwerten und `IngredientQuantityDialog`
2. **Alternative hinzufügen**: Eigenes Inline-Modal (Zeile ~1092) — roher `fetch` zu `/api/supplies/`, keine Filter, max 10 Ergebnisse, nur Name

Der `IngredientDetailSearchDialog` (`frontend-food/src/components/recipe/IngredientDetailSearchDialog.tsx`) hat aktuell eine feste `onSelect`-Signatur, die Portion/Unit/Quantity voraussetzt. Die `handleIngredientClick`-Methode (Zeile 221) lädt immer Portionen und öffnet den `IngredientQuantityDialog`.

## Goals / Non-Goals

**Goals:**
- `IngredientDetailSearchDialog` wird generisch: `showQuantityDialog`-Prop + flexibler `onSelect`-Callback
- "Alternative hinzufügen" nutzt denselben generischen Dialog statt des eigenen Inline-Modals
- API-Endpoint wird von `/api/supplies/` auf `/api/ingredients/` korrigiert
- Bisheriges Verhalten für "Neue Zutat hinzufügen" bleibt identisch

**Non-Goals:**
- Keine Änderungen am Backend
- Keine Änderungen an Pydantic- oder Zod-Schemas
- Keine Änderungen an der Exchange-Group-Logik selbst (nur der Einstiegs-Dialog wird ersetzt)

## Decisions

### 1. `showQuantityDialog`-Prop statt separate Komponente

**Entscheidung**: Der `IngredientDetailSearchDialog` bekommt eine optionale Bool-Prop `showQuantityDialog` (default: `true`). Bei `false` wird nach Klick auf eine Zutat direkt `onSelect` aufgerufen, ohne Portionen zu laden oder den `IngredientQuantityDialog` zu öffnen.

**Alternativen**:
- **Eigene `AlternativeSearchDialog`-Komponente**: Dupliziert 90% des Codes. Abgelehnt wegen Wartungsaufwand.
- **Render-Prop Pattern**: Zu abstrakt für diesen Fall. Die zwei Varianten sind einfach genug.

```typescript
// Neue Props
interface IngredientDetailSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (
    ingredientId: number,
    ingredientName: string,
    ingredientSlug: string,
    portionId: number | null,
    measuringUnitId: number | null,
    quantity: number,
  ) => void;
  showQuantityDialog?: boolean; // neu, default true
}
```

### 2. Zwei onSelect-Signaturen — oder eine?

**Entscheidung**: Eine einzige `onSelect`-Signatur beibehalten. Bei `showQuantityDialog=false` werden `portionId`, `measuringUnitId` und `quantity` als `null` übergeben — der aufrufende Code (`handleSelectAlternative`) ignoriert sie und führt stattdessen die Portionen-Logik selbst aus.

Begründung: Type-Safety bleibt erhalten, der Dialog muss keine Portionen-Logik für den Alternative-Fall duplizieren.

### 3. Alternative-Dialog-Zustand vereinfachen

**Entscheidung**: Die 5 State-Variablen für den Alternative-Dialog in `InlineIngredientEditor` (`alternativeTargetId`, `altSearchQuery`, `altSearchResults`, `altSearching`, `altSearchTimerRef`) werden durch einen einzigen State `alternativeTargetId: number | null` ersetzt. Der Dialog selbst wird über `open`/`onOpenChange` gesteuert, analog zum bestehenden `detailSearchOpen`.

```typescript
// Vorher (5 states)
const [alternativeTargetId, setAlternativeTargetId] = useState<number | null>(null);
const [altSearchQuery, setAltSearchQuery] = useState('');
const [altSearchResults, setAltSearchResults] = useState<Array<...>>([]);
const [altSearching, setAltSearching] = useState(false);
const altSearchTimerRef = useRef<ReturnType<typeof setTimeout>>();

// Nachher (1 state)
const [alternativeTargetId, setAlternativeTargetId] = useState<number | null>(null);
```

### 4. handleIngredientClick wird bedingt

**Entscheidung**: `handleIngredientClick` prüft die `showQuantityDialog`-Prop:
- `true` (default): Lädt Portionen, öffnet `IngredientQuantityDialog` (bisheriges Verhalten)
- `false`: Ruft direkt `onSelect` mit `(id, name, slug, null, null, null)` auf

### 5. Kein API-Call innerhalb des generischen Dialogs für Alternativen

**Entscheidung**: Der Alternative-onSelect ruft `onSelect` auf, der Dialog schließt sich. Der aufrufende `InlineIngredientEditor` (`handleSelectAlternative`) ist verantwortlich für:
- Portionen laden (`GET /api/ingredients/<slug>/portions/`)
- ExchangeGroup erstellen/suchen
- RecipeItem patchen
- Neues RecipeItem in lokalen State hinzufügen

Das entspricht exakt der aktuellen `handleSelectAlternative`-Logik (Zeile 493), nur dass die Suche nicht mehr mit raw `fetch` passiert.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Bestehendes Verhalten ändert sich**: Der `IngredientDetailSearchDialog` wird umgebaut — Regression-Risiko für "Neue Zutat hinzufügen" | `showQuantityDialog` default `true`; der Pfad für `showQuantityDialog=true` bleibt unverändert. Test: beide Modi in der Vorschau prüfen |
| **Portionen-Doppellogik**: Portionen werden einmal im Dialog geladen (für QuantityDialog), dann nochmal in `handleSelectAlternative` | Für Alternative-Fall (showQuantityDialog=false) wird im Dialog kein Portionen-Call gemacht. Der aufrufende Code macht den Call selbst — sauber getrennt |
| **Inline-Modal-Reste**: Das alte Alternative-Modal wird nicht sauber entfernt | Der gesamte Block (Zeile ~1092-1161) wird entfernt inklusive aller State-Variablen und des debounce-Effekts |
