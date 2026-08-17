## Why

Beim Hinzufügen von Rezepten zu einem Essensplan muss der User aktuell immer erst tippen, bevor Ergebnisse erscheinen. Das erzeugt einen "kalten Start" — kein Kontext, keine Hilfe. Die häufigsten Rezepte sollten sofort sichtbar sein, sortiert nach Verwendungshäufigkeit und passend zum Mahlzeit-Typ (Frühstück, Mittagessen etc.).

## What Changes

- Neuer API-Endpunkt für Rezept-Vorschläge basierend auf globaler Verwendungshäufigkeit in MealItems
- Vorschläge sind kontextsensitiv nach `meal_type` (Frühstücksrezepte für Frühstücks-Slots)
- Beim Öffnen des Suchfelds (grüner "+"-Button) werden sofort 10 Vorschläge angezeigt
- Suche feuert bereits ab dem 1. Buchstaben (200ms Debounce)
- Suchergebnisse sind nach Verwendungshäufigkeit sortiert statt alphabetisch

## Capabilities

### New Capabilities
- `recipe-suggestions`: API-Endpunkt der Rezept-Vorschläge nach Häufigkeit und meal_type liefert, inkl. Suchfilter

### Modified Capabilities

## Impact

- **Backend**: `planner` App — neuer API-Endpunkt, neues Pydantic-Schema für Suggestions-Response
- **Frontend**: `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — Inline-Suche erweitern um Initial-Load und Sortierung nach Häufigkeit
- **Schemas**: Neues Pydantic-Schema `RecipeSuggestionOut`, neues Zod-Schema im Frontend
- **Keine Migrations nötig** — Daten werden per Aggregation aus bestehendem `MealItem`-Modell berechnet
