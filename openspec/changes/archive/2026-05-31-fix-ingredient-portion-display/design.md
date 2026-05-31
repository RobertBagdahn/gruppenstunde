## Context

Die `IngredientList.tsx`-Komponente zeigt unter jeder Zutat eine Subzeile mit der "highPrioPortion" und dem Preis. Die Filterlogik (`!is_default && weight_g > 0`) ist zu schwach — sie lässt Basis-Portionen (weight_g=1, Name "g"/"ml") durch, wenn diese nicht als `is_default` markiert sind. Die parallele Funktion `calculateNaturalPortions` in `portionDisplay.ts:73` hat bereits den korrekten Filter (`weight_g <= 1 → skip`).

Aktuell in `IngredientList.tsx:82-87`:
```ts
const highPrioPortion = item.ingredient_portions
  ?.filter((p) => !p.is_default && (p.weight_g ?? 0) > 0)
  .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))[0];
```

## Goals / Non-Goals

**Goals:**
- Keine redundanten/sinnlosen Portions-Anzeigen (wie "≈ 100 g" oder "≈ 1 100g Brot")
- Preis mit Bezugsangabe anzeigen
- Konsistenz zwischen `highPrioPortion`-Filter und `calculateNaturalPortions`-Filter

**Non-Goals:**
- Backend-Datenbereinigung (Portionen umbenennen/löschen)
- Änderung des Datenmodells
- Änderung der expanded "weitere Portionen"-Anzeige (nutzt bereits korrekten Filter)

## Decisions

1. **`weight_g > 1` statt `weight_g > 0`** — Gleicher Schwellenwert wie in `portionDisplay.ts`. Schließt die automatisch angelegte Gramm-Portion (weight_g=1) aus.

2. **Keine Namens-Filterung** — Statt generische Namen ("g", "100g") per String-Match auszufiltern, reicht der `weight_g > 1`-Filter. Portionen mit weight_g=100 und Name "100g" haben noch einen Informationswert (sie zeigen Packungsgrößen). Das eigentliche Problem ist die redundante Basiseinheit.

3. **Redundanz-Check** — Zusätzlich: wenn `highPrioDisplay` numerisch dem Gramm-Wert entspricht (z.B. "≈ 100 g"), nicht anzeigen. Einfacher Check: wenn `highPrioPortion.weight_g === 1`, skip (schon durch Filter 1 abgedeckt).

4. **Preis-Suffix** — Kein "/Portion" anhängen. Der Header sagt bereits "pro Portion", das reicht als Kontext.

## Risks / Trade-offs

- **Minimales Risiko**: Der Filter ist strenger, d.h. weniger wird angezeigt. Kein Informationsverlust, da die Gramm-Anzeige in der Hauptzeile steht.
- **Portionen mit weight_g zwischen 1-2**: Theoretisch könnte eine Portion "1 Prise" mit weight_g=1.5 existieren. Der `> 1` Filter lässt diese durch — korrekt.
