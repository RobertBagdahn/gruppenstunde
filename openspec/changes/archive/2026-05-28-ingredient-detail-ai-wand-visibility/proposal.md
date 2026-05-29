## Why

Der KI-Zauberstab-Button auf der Zutaten-Detail-Seite ist aktuell nicht sichtbar. Er soll für Admin- und Staff-User angezeigt werden, damit diese schnell KI-Vorschläge für Zutaten-Daten generieren und selektiv übernehmen können.

## What Changes

- Den existierenden Zauberstab-Button (`auto_fix_high`) auf der `IngredientDetailPage` für Admin/Staff-User sichtbar machen
- Button wird neben den bestehenden Edit/Delete-Buttons in der Kopfzeile platziert
- KI-Vorschläge werden im bestehenden `AiSuggestDialog` (Modal) angezeigt

## Capabilities

### New Capabilities

(keine — die Funktionalität existiert bereits, wird nur freigeschaltet)

### Modified Capabilities

- `ingredient-ai-suggest`: Button-Sichtbarkeit auf Admin/Staff beschränken statt komplett ausgeblendet

## Impact

- **Frontend**: `frontend/src/pages/supplies/IngredientDetailPage.tsx` — Sichtbarkeitslogik für den Zauberstab-Button anpassen
- **Keine Schema-Änderungen**: Pydantic/Zod-Schemas bleiben unverändert
- **Keine Migrationen**: Keine Datenbank-Änderungen nötig
- **Keine API-Änderungen**: Backend-Endpunkt `/api/ingredients/{slug}/ai-suggest-all/` existiert bereits
