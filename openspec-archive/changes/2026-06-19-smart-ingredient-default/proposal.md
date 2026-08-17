## Why

Beim Hinzufügen einer Zutat zu einem Rezept wird aktuell entweder `0 g` (InlineIngredientEditor) oder `1 g` (CreateRecipePage) als Startwert gesetzt. Beide Werte sind unpraktisch — `0 g` ist verwirrend, `1 g` ist zu klein für jede reale Rezeptzutat. Stattdessen soll automatisch die erste „sinnvolle" Portion der Zutat (z. B. „1 Esslöffel" mit 15 g) als Default gesetzt werden.

## What Changes

- **Neue Default-Logik beim Hinzufügen von Zutaten**: Statt der Basis-Portion (Gramm mit `weight_g = 1`) wird die erste Portion mit `weight_g != 1` gewählt, sortiert nach `priority` absteigend, dann `rank` aufsteigend
- **Fallback**: Wenn eine Zutat nur eine „Gramm"-Portion hat (keine Portion mit `weight_g != 1`), wird `quantity = 100` mit der Gramm-Portion verwendet
- **Vereinheitlichung**: `CreateRecipePage` und `InlineIngredientEditor` nutzen dieselbe Logik (aktuell unterschiedliche Defaults: `1` vs `0`)
- Portions mit `weight_g = None` werden übersprungen (keine Gewichtsinfo → kein sinnvoller Default)

## Capabilities

### New Capabilities

- `smart-ingredient-default`: Automatische Auswahl der ersten sinnvollen Portion beim Hinzufügen einer Zutat zu einem Rezept

### Modified Capabilities

<!-- Keine bestehenden Specs werden geändert — das ist ein neues Verhalten ohne Spec-Änderungen -->

## Impact

- **Frontend**: `CreateRecipePage.tsx` (`addIngredient`), `InlineIngredientEditor.tsx` (`handleAddIngredient`)
- **Keine Backend-Änderungen**: Die Portion-Logik lebt vollständig im Frontend
- **Keine Schema-Änderungen**: Pydantic/Zod Schemas bleiben unverändert
- **Keine Migrations**: Reines Frontend-Verhalten
