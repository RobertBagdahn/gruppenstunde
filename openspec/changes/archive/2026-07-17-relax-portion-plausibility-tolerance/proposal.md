## Why

Die 1%-Toleranz des Backend-Plausibilitätschecks beim Speichern von AI-geschätzten Rezeptmengen ist für den Küchenkontext viel zu streng. Legitime Portion-Variationen wie "Stück Karotte = 24g statt 25g" (4% Abweichung) und Floating-Point-Rauschen (0.99g vs 1.0g) führen zu falschen HTTP-422-Ablehnungen, die den User-Workflow blockieren. Der Check wurde als Safety Net für Faktor-10/333-Bugs entworfen — diese fängt er auch mit großzügiger Toleranz zuverlässig.

## What Changes

- **Toleranz des Plausibilitätschecks lockern**: Von `max(expected * 0.01, 0.01)` (1% / 0.01g) auf `max(expected * 0.15, 2.0)` (15% / 2g). Fängt katastrophale Fehler (10x–333x) weiterhin ab, lässt aber legitime Küchen-Varianz und Floating-Point-Noise durch.
- Tests in `test_recipe_item_plausibility_guard.py` auf neue Toleranzwerte anpassen.

## Capabilities

### New Capabilities

_Keine._

### Modified Capabilities

- `recipe-ai-quantity-estimate`: Anforderung "Backend plausibility check on save" — Toleranz von ±1% auf ±15% (min. 2g) gelockert. Keine Änderung an API-Signatur oder Client-Verhalten.

## Impact

- **Backend**: `backend/recipe/api/items.py:174` — eine Zeile
- **Tests**: `backend/recipe/tests/test_recipe_item_plausibility_guard.py` — Toleranz-Werte anpassen
- **Keine** Schema-Änderungen, keine Migrationen, kein Frontend-Impact
