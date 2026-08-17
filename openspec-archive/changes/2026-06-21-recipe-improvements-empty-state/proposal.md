## Why

Der Abschnitt „Verbesserungsvorschläge" im Gesundheits-Tab der Rezept-Detailseite bleibt für bestimmte Rezepttypen (z.B. Getränke) lautlos leer — kein Hinweis, kein Platzhalter, keine Erklärung. Der Backend-Endpunkt gibt in diesem Fall `{ items: [], all_good: false, message: "" }` zurück, und das Frontend rendert schlicht nichts unter der bereits vorhandenen Überschrift. Das ist verwirrend und unvollständig, besonders da an anderer Stelle (RecipeRulesBox) bereits klar erklärt wird, warum Regeln für diesen Typ nicht angewandt werden.

## What Changes

- **Backend** (`improvement_ranking_service.py`): Wenn `items == []` und `all_good == false`, wird das `message`-Feld mit einem kontextspezifischen Grund befüllt (z.B. Rezepttyp nicht anwendbar, keine Nährwertdaten, nichts Umsetzbares gefunden). Außerdem wird ein `is_applicable`-Flag zum `ImprovementListOut`-Schema hinzugefügt — analog zum `RecipeRulesOut`-Schema.
- **Backend** (`nutrition.py` Schema `ImprovementListOut`): Neues Feld `is_applicable: bool` und kontextualisiertes `message`-Feld.
- **Frontend** (`RecipeImprovements.tsx`): Neuer vierter Render-Zweig für `!all_good && items.length === 0` — rendert eine neutrale Info-Karte mit `data.message`. Außerdem wird der stille `return null` bei Fehlern durch einen minimalen Fehlerzustand ersetzt.
- **Frontend** (Zod-Schema `recipe.ts`): Neues Feld `is_applicable` im `ImprovementListOut`-Schema synchronisieren.

## Capabilities

### New Capabilities

- `recipe-improvements-empty-state`: Erklärende Leer-Zustände im Verbesserungsvorschläge-Abschnitt der Rezept-Detailseite — mit kontextspezifischer Begründung warum keine Vorschläge vorhanden sind.

### Modified Capabilities

_(keine bestehenden Specs betroffen — reine UI/UX-Lücke ohne eigene Spec)_

## Impact

- **Backend**: `backend/recipe/services/improvement_ranking_service.py`, `backend/recipe/schemas/nutrition.py`
- **Frontend**: `frontend-food/src/components/recipe/RecipeImprovements.tsx`, `frontend-food/src/schemas/recipe.ts`
- **Pydantic-Schema**: `ImprovementListOut` — neues Feld `is_applicable: bool`
- **Zod-Schema**: `ImprovementListOut` — synchron zu Pydantic
- **Keine Migrationen** nötig (reine Schema-/Service-Änderung, kein Datenbankmodell betroffen)
- **Keine Breaking Changes** für bestehende Clients (additives Feld)
