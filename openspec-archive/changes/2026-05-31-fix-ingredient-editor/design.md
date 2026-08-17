## Context

Der `InlineIngredientEditor` hat zwei Probleme:
1. Das Autocomplete-Input ist ein controlled component mit `value=""` / `onChange={() => {}}` — Tippen ist unmöglich
2. Es fehlt ein KI-Button zum Vorschlagen weiterer Zutaten

Das Backend hat bereits die nötigen Endpunkte:
- `POST /api/recipes/{recipe_id}/ai-suggest-ingredients/` → liefert Vorschläge
- `POST /api/recipes/{recipe_id}/ai-apply-ingredients/` → wendet Vorschläge an

## Goals / Non-Goals

**Goals:**
- Eingabefeld im InlineIngredientEditor funktionsfähig machen (lokaler State)
- KI-Button integrieren, der `ai-suggest-ingredients` aufruft und Ergebnisse direkt per `ai-apply-ingredients` anwendet
- Loading-State während KI-Aufruf anzeigen

**Non-Goals:**
- Änderungen am Backend (Endpunkte existieren bereits)
- Auswahl/Bestätigung einzelner Vorschläge (alle drei werden direkt hinzugefügt)
- Änderungen an der CreateRecipePage (separates Problem)

## Decisions

1. **Lokaler State für Autocomplete**: `const [inputValue, setInputValue] = useState('')` im InlineIngredientEditor, wird nach erfolgreichem Hinzufügen zurückgesetzt
2. **KI-Button Platzierung**: Neben dem Autocomplete-Input, als Icon-Button mit Sparkles-Icon
3. **Direktes Anwenden**: KI schlägt vor → sofort `ai-apply-ingredients` aufrufen → Items zur lokalen Liste hinzufügen. Kein Bestätigungsdialog.
4. **Bestehende API nutzen**: Keine neuen Backend-Endpunkte nötig

## Risks / Trade-offs

- **Direktes Anwenden ohne Bestätigung**: Einfacher UX-Flow, aber User könnte ungewollte Zutaten bekommen. Akzeptabel, da Bearbeitungsmodus aktiv ist und Zutaten leicht entfernt werden können.
- **Rate Limiting**: Gemini-Aufrufe könnten fehlschlagen. Error-Toast anzeigen.
