## Context

RecipeItem speichert `quantity` als Pro-Person-Menge (Gesamtmenge ÷ servings beim Import). Das Frontend berechnet aktuell `servingsMultiplier = effectiveServings / recipe.servings`, was die Menge ein zweites Mal durch servings teilt. Ergebnis: Bei 1 Portion werden unrealistisch kleine Werte angezeigt, teilweise "0 g".

Betroffene Dateien:
- `frontend/src/pages/recipes/RecipeDetailPage.tsx` (Zeile 33)
- `frontend/src/lib/unitConversion.ts` (`formatQuantity`, `smartRound`)
- `frontend/src/lib/unitConversion.test.ts`

## Goals / Non-Goals

**Goals:**
- Korrekte Mengenberechnung: `quantity × effectiveServings`
- Nie "0 g" anzeigen wenn der tatsächliche Wert > 0 ist

**Non-Goals:**
- Änderung des DB-Speichermodells (quantity bleibt pro Person)
- Änderung der Backend-API oder Schemas
- Keine Migration nötig

## Decisions

### 1. servingsMultiplier = effectiveServings (nicht ÷ recipe.servings)

**Rationale**: `quantity` ist bereits pro 1 Person. Um die Menge für N Portionen zu berechnen, reicht `quantity × N`. Die bisherige Formel `quantity × (N / servings)` war nur korrekt wenn quantity die Gesamtmenge wäre.

**Alternative verworfen**: Quantity in DB auf Gesamtmenge umstellen — würde Migration + Neuberechnung aller Rezepte erfordern, ohne Mehrwert.

### 2. Safeguard: Minimum-Anzeige bei Werten > 0

In `formatQuantity`: Wenn `grams > 0` aber nach Rundung 0 ergeben würde, stattdessen `1` (kleinste sinnvolle Einheit) anzeigen. `smartRound` rundet bereits auf mit `Math.ceil`, aber der Guard `if (grams <= 0) return 0` fängt nur exakt 0 ab — das ist korrekt. Der zusätzliche Safeguard stellt sicher, dass auch bei zukünftigen Änderungen nie fälschlich 0 angezeigt wird.

## Risks / Trade-offs

- **[Risiko] Andere Stellen nutzen servingsMultiplier** → Prüfen ob `IngredientList` der einzige Consumer ist oder ob MealPlan/Einkaufsliste ebenfalls betroffen sind.
- **[Risiko] Bestehende Rezepte mit manuell eingegebener Gesamtmenge** → Nur importierte Cooklang-Rezepte haben Pro-Person-Mengen. Manuell erstellte Rezepte speichern ebenfalls pro Person (Frontend-Formular). Kein Risiko.
