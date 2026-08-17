## Context

Aktuell gibt es zwei Inkonsistenzen beim Hinzufügen von Zutaten:

1. **Zwei verschiedene Defaults**: `CreateRecipePage` setzt `quantity: '1'`, `InlineIngredientEditor` setzt `quantity: 0`
2. **Beide nehmen die Default-Portion (`is_default=true`)**, die fast immer die Basis-Einheit „Gramm" mit `weight_g = 1` ist. Damit startet der Nutzer mit `1 g` bzw. `0 g` — beides unpraktisch.

Die Portions-API (`GET /api/ingredients/{slug}/portions/`) liefert bereits alle benötigten Felder (`priority`, `weight_g`, `rank`, `is_default`), aber die Frontend-Funktionen mappen `priority` aktuell nicht.

## Goals / Non-Goals

**Goals:**
- Beim Hinzufügen einer Zutat wird automatisch die erste sinnvolle Portion (NICHT die `1 g`-Basis) mit `quantity = 1` ausgewählt
- Sortierung der Portions: `priority` DESC, dann `rank` ASC
- Portions mit `weight_g == None` oder `weight_g == 1` werden übersprungen
- Fallback (keine sinnvolle Portion): Gramm-Portion mit `quantity = 100`
- Beide Flows (`CreateRecipePage`, `InlineIngredientEditor`) nutzen dieselbe Logik

**Non-Goals:**
- Keine Backend-Änderungen
- Keine Schema-Änderungen (Pydantic/Zod)
- Keine Änderung am `is_default`-Flag oder Portion-Ranking
- Keine Änderung im Meal-Plan-Editor oder anderen Kontexten, die Portions auswählen

## Decisions

### 1. Shared Utility Function

Eine gemeinsame Funktion `selectSmartDefaultPortion` in `frontend-food/src/lib/portionDefaults.ts`, die beide Komponenten importieren. Dies verhindert Code-Duplizierung und stellt sicher, dass die Logik identisch ist.

```typescript
// frontend-food/src/lib/portionDefaults.ts

interface PortionSummary {
  id: number;
  weight_g: number | null;
  priority: number;
  rank: number;
  is_default: boolean;
}

interface SmartDefault {
  portion_id: number;
  quantity: number;
}

export function selectSmartDefaultPortion(portions: PortionSummary[]): SmartDefault | null {
  const meaningful = portions
    .filter((p) => p.weight_g != null && p.weight_g !== 1)
    .sort((a, b) => b.priority - a.priority || a.rank - b.rank);

  if (meaningful.length > 0) {
    return { portion_id: meaningful[0].id, quantity: 1 };
  }

  // Fallback: use Gramm portion with 100g
  const fallback = portions[0];
  if (fallback) {
    return { portion_id: fallback.id, quantity: 100 };
  }

  return null;
}
```

**Alternativen verworfen:**
- **Backend-Logik**: Ein neuer Endpunkt oder ein `suggested_portion`-Feld wäre overengineered für ein reines UX-Verhalten
- **Inline-Logik in beiden Komponenten**: Führt zu Duplizierung und Divergenz (genau das Problem, das wir beheben)

### 2. `priority` in Portion-Mapping aufnehmen

Beide Komponenten müssen `priority` in ihrem Portion-Mapping einschließen, da sie aktuell nur `id`, `name`, `quantity`, `weight_g`, `measuring_unit_name`, `is_default` mappen. Das Feld wird von der API bereits geliefert.

### 3. Vereinfachung: `is_default` nicht mehr für die Auswahl nutzen

Die neue Logik ersetzt die alte `is_default`-basierte Auswahl. Das `is_default`-Flag bleibt im Datenmodell bestehen (für andere Zwecke wie Portion-Display), wird aber beim Hinzufügen von Zutaten nicht mehr als Selektionskriterium verwendet.

## Risks / Trade-offs

- **`weight_g == 1` Filter ist grob**: Eine Portion „1 Prise" mit `weight_g = 0.5` oder „1 Liter" mit `weight_g ≈ 1000` würde nicht gefiltert. Das ist akzeptabel, weil es in der Praxis keine Überschneidungen gibt — die Basis-Einheit ist immer exakt `1`.
  - **Mitigation**: Der Filter `weight_g !== 1` erfasst alle Varianten der Basis-Einheit (Gramm, Milliliter mit quantity=1). Falls später exotischere Basis-Einheiten dazukommen, kann der Filter verfeinert werden.

- **Fallback 100 g ist willkürlich**: Für manche Zutaten (z. B. Gewürze) sind 100 g zu viel.
  - **Mitigation**: Der Fallback greift nur, wenn eine Zutat NUR die Gramm-Portion hat. Das ist selten — die meisten Zutaten haben sinnvolle Alternativ-Portions. Der Nutzer kann den Wert jederzeit ändern.

- **Kein `priority` in bestehenden State-Types**: Die Komponenten speichern Portions im lokalen State. Das Mapping muss `priority` hinzufügen, was den State minimal erweitert — ohne Breaking-Change, da es ein additiver Change ist.
