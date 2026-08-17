## Why

Die Funktion „Rezept für X Personen bearbeiten" (in Kochmengen denken, z.B. für 4 Personen) ist für den Stakeholder verschwunden. Tatsächlich existiert die Logik vollständig im Inline-Zutaten-Editor (`InlineIngredientEditor` mit `displayPortions`, inkl. korrekter Runter-Rechnung auf 1 Portion beim Speichern), ist aber **nicht auffindbar**: Sie ist an `portionsMultiplier > 1` gekoppelt und hat keinen eigenen Einstiegspunkt. Im normalen Bearbeiten-Flow ist `portionsMultiplier = 1`, sodass die Skalier-Bearbeitung nie aktiv wird.

## What Changes

- **Klarer Einstieg „Für X Personen bearbeiten"** — Ein sichtbarer Einstiegspunkt, der die Bearbeitung in Kochmengen aktiviert, unabhängig vom Anzeige-`portionsMultiplier`.
- **Personenzahl-Eingabe im Editor** — Im Inline-Editor kann die Personenzahl, in der gedacht/eingegeben wird, gewählt/geändert werden; alle Mengen werden live entsprechend hochgerechnet.
- **UI-only, Backend bleibt 1 Portion** — Die Eingabe erfolgt in Kochmengen, beim Speichern werden die Mengen wie bisher auf 1 Portion normiert. Das Backend speichert Rezepte weiterhin immer auf 1 Portion.

## Capabilities

### New Capabilities
- `recipe-cooking-quantity-edit`: Auffindbare, UI-seitige Bearbeitung von Rezepten in Kochmengen (für X Personen) mit Live-Skalierung und Normierung auf 1 Portion beim Speichern.

### Modified Capabilities
- (keine)

## Impact

- **Frontend-Pages**: `frontend-food` — `pages/recipes/RecipeDetailPage.tsx` (Einstiegspunkt, Entkopplung von `portionsMultiplier`), `components/recipe/InlineIngredientEditor.tsx` (Personenzahl-Eingabe statt read-only `displayPortions`), `components/recipe/PortionScaler.tsx` (Wiederverwendung).
- **Backend**: Keine Änderung — Rezepte bleiben auf 1 Portion normalisiert (`recipe/api/items.py`, `recipe/models/`).
- **Pydantic-/Zod-Schemas**: Keine Änderung (reine UI-Funktion).
- **Migration**: Keine.
- **Tests**: Frontend — Hochskalieren beim Eingeben, Runter-Rechnung auf 1 Portion beim Speichern, Auffindbarkeit des Einstiegs.
