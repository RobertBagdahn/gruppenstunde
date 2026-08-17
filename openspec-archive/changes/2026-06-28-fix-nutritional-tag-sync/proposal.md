## Why

Der automatische Sync von Ernährungstags (vegan, vegetarisch, etc.) von Zutaten auf Rezepte hat einen Self-Perpetuating-Bug: Sobald ein nicht-gefährlicher Tag (wie "vegan") einmal auf einem Rezept landet, wird er nie wieder entfernt – auch wenn später eine nicht-vegane Zutat (z.B. Käse) hinzugefügt wird. Die Ursache: `sync_recipe_nutritional_tags()` preserviert fälschlich alle vorhandenen non-dangerous Tags, kann aber nicht unterscheiden, ob diese vom Sync selbst oder manuell gesetzt wurden.

## What Changes

- **BREAKING**: `sync_recipe_nutritional_tags()` berechnet nur noch die reine Schnittmenge der Zutaten-Tags – keine Preservation mehr
- Neues `manual_nutritional_tags` M2M-Feld auf `Recipe` für explizit vom User gesetzte Tags
- API create/update speichert `nutritional_tag_ids` in `manual_nutritional_tags` statt direkt in `nutritional_tags`
- Response kombiniert beide Felder (Intersection + Manual), API-Contract bleibt identisch
- Management Command `sync_recipe_nutritional_tags` aktualisiert
- Bestehende fehlerhafte Tags werden beim ersten Sync-Durchlauf korrigiert

## Capabilities

### New Capabilities
- `nutritional-tags-sync`: Automatische Synchronisation von Ernährungstags zwischen Zutaten und Rezepten mit korrekter Trennung von manuellen und auto-synced Tags

### Modified Capabilities

- *(none – keine bestehenden Specs werden geändert)*

## Impact

| Bereich | Änderung |
|---------|----------|
| **Backend Model** | Recipe: neues `manual_nutritional_tags` M2M-Feld → Migration nötig |
| **Backend Sync** | `recipe/services/recipe_checks.py:sync_recipe_nutritional_tags()` – Preservation-Logik entfernt, schreibt nur noch `nutritional_tags` |
| **Backend API** | `recipe/api/recipes.py` create/update – `nutritional_tag_ids` in `manual_nutritional_tags` speichern, Reihenfolge: Items → Sync → Manual |
| **Backend Schemas** | `recipe/schemas/recipes.py` – `RecipeDetailOut.resolve_nutritional_tags` merged beide M2Ms |
| **Backend Signals** | Unverändert – RecipeItem-Signale triggern weiterhin Sync |
| **Backend Tests** | `recipe/tests/test_recipe_nutritional_sync.py` – neue Tests für Preservation-Bug, Intersection-only, Manual-Tags |
| **Management Command** | `recipe/management/commands/sync_recipe_nutritional_tags.py` – läuft mit neuer Logik, korrigiert alle Rezepte |
| **Frontend** | Keine Änderung – API-Contract bleibt identisch |
