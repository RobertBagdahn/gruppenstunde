## Context

Im Food Frontend gibt es zwei Komponenten, die die Zutatenliste eines Rezepts darstellen:

- **`IngredientList`** (View-Mode): Sortiert Zutaten absteigend nach `weight_g` — schwerste Zutat zuerst
- **`InlineIngredientEditor`** (Edit-Mode): Übernimmt die Reihenfolge aus der API-Response unverändert (Backend sortiert nach `sort_order`)

Beim Umschalten von View zu Edit springt die Sortierung um, was Nutzer verwirrt.

Die einfachste Lösung: `InlineIngredientEditor` initialisiert `editItems` bereits nach `weight_g` sortiert — ohne Backend-Touch, ohne Schema-Änderungen.

## Goals / Non-Goals

**Goals:**
- Zutaten im Edit-Mode in derselben Reihenfolge anzeigen wie im View-Mode (nach `weight_g` absteigend)
- Kein Backend-Impact, keine Migration, keine Schema-Änderung

**Non-Goals:**
- `sort_order`-Feld nicht aktualisieren oder synchronisieren
- Keine Drag-and-Drop-Umsortierung
- Keine Option zum manuellen Ändern der Sortierung

## Decisions

### Decision 1: Sortierung erfolgt im `useState`-Initializer

Das `EditableItem`-Interface bekommt ein `weight_g: number`-Feld. `normalizeItems` berechnet `weight_g` aus `displayQty` (bereits vorhanden) und speichert es im Objekt. Der `useState`-Initializer sortiert das normalisierte Array:

```
const [editItems, setEditItems] = useState<EditableItem[]>(() => {
  const normalized = normalizeItems(items, servings);
  return normalized.sort((a, b) => b.weight_g - a.weight_g);
});
```

**Warum nicht im `map` von `normalizeItems` sortieren?** Weil `sort` mutiert und `.map().sort()` unerwartete Seiteneffekte haben kann. Besser explizit nach der Normalisierung sortieren.

**Warum nicht `useMemo`?** Der State wird nur einmal initialisiert — `useState` mit Lazy-Initializer ist die richtige Wahl.

### Decision 2: `weight_g` in `EditableItem` als display-skalierter Wert

Das `weight_g`-Feld enthält `displayQty` aus `normalizeItems` (bereits auf Servings skaliert). Das entspricht exakt dem Wert, den `IngredientList` für die Sortierung verwendet (`item.weight_g * servingsMultiplier`).

## Risks / Trade-offs

- **Risiko**: Beim nächsten Editieren (nach Page-Reload) sortiert die API wieder nach `sort_order`, wird aber durch den Initializer sofort nach `weight_g` umsortiert. Kein sichtbarer Unterschied für den Nutzer, da der Sortier-Step jedes Mal läuft. → **Kein Risiko**
- **Risiko**: Wenn ein Nutzer im Edit-Mode die Menge einer Zutat ändert, bleibt deren Position unverändert (kein Live-Re-Sort). → **Akzeptabel**, entspricht aktuellem View-Mode (dort auch kein Live-Sort bei Portionsänderung)
