## Why

Der Zutaten-Editor im Bearbeitungsmodus auf der Rezept-Detailseite (`InlineIngredientEditor`) ist kaputt: Das Eingabefeld "Zutat hinzufügen..." nimmt keine Tastatureingaben an, weil `value=""` und `onChange={() => {}}` fest verdrahtet sind (controlled component ohne State). Zusätzlich soll ein KI-Button hinzugefügt werden, der automatisch drei passende Zutaten vorschlägt und hinzufügt.

## What Changes

- **Bugfix**: Lokalen State für das Autocomplete-Eingabefeld im `InlineIngredientEditor` einführen, damit Tippen funktioniert
- **Feature**: Neuer Button "KI-Vorschläge" neben dem Eingabefeld, der basierend auf den bereits vorhandenen Zutaten und dem Rezepttitel drei weitere passende Zutaten per KI vorschlägt und direkt hinzufügt

## Capabilities

### New Capabilities
- `recipe-ai-ingredient-suggestions`: KI-basierte Vorschläge für passende Zutaten im Inline-Editor, basierend auf bestehendem Rezeptkontext

### Modified Capabilities
- `recipe-inline-edit`: Bugfix des kaputten Autocomplete-Inputs im InlineIngredientEditor

## Impact

- **Frontend**: `frontend-food/src/components/recipe/InlineIngredientEditor.tsx` — State-Fix + neuer KI-Button
- **Backend**: Neuer API-Endpunkt (oder Erweiterung bestehender AI-Services) für Zutaten-Vorschläge basierend auf Rezeptkontext
- **Schemas**: Neues Pydantic-Schema für Request/Response der KI-Vorschläge, entsprechendes Zod-Schema im Frontend
- **Keine Migrations nötig** (kein Datenmodell-Änderung)
