## Why

Rezeptzutaten zeigen falsche Mengen an (z.B. "0 g Butter" statt "4 g Butter"). Die Ursache ist eine doppelte Division durch `servings`: Der Cooklang-Import speichert `quantity` bereits als Pro-Person-Menge, aber das Frontend teilt nochmals durch `recipe.servings`. Zusätzlich fehlt ein Safeguard gegen die Anzeige von "0 g" wenn der tatsächliche Wert > 0 ist.

## What Changes

- **Frontend-Skalierungsformel korrigieren**: `servingsMultiplier` wird von `effectiveServings / recipe.servings` zu `effectiveServings` geändert, da `quantity` bereits pro 1 Portion gespeichert ist.
- **Safeguard in `formatQuantity`**: Werte > 0 dürfen nie als "0" angezeigt werden — Minimum-Anzeige ist der kleinste sinnvolle gerundete Wert (z.B. "< 1 g" oder aufgerundet auf 1).

## Capabilities

### New Capabilities

_Keine neuen Capabilities._

### Modified Capabilities

_Keine Spec-Level-Änderungen — rein implementierungsbezogener Bugfix._

## Impact

- **Frontend**: `src/pages/recipes/RecipeDetailPage.tsx` (Zeile 33: `servingsMultiplier`-Berechnung), `src/lib/unitConversion.ts` (`formatQuantity` Safeguard)
- **Betroffene Schemas**: Keine Änderungen an Pydantic- oder Zod-Schemas nötig
- **Migrations**: Keine
- **Betroffene Django-Apps**: Keine (DB-Daten sind korrekt, quantity ist bewusst pro Person gespeichert)
