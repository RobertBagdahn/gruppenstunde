## Why

Alle Signal-Handler in `recipe/signals.py`, `planner/signals.py` und `supply/signals.py` fehlen `dispatch_uid`. Ohne diese werden Signal-Handler bei mehrfachem Modulimport (z.B. in Tests) mehrfach registriert, was zu doppelten Cache-Invalidierungen, doppelten `usage_count`-Inkrements und anderen Nebeneffekten führt. In `supply/signals.py` ist zusätzlich `instance.tracker` referenziert, das auf `Ingredient` nie existiert → `AttributeError`, der im `except`-Block schluckt wird, sodass Quality-Score- und Embedding-Updates für Zutaten nie feuern. Außerdem fehlt in `recipe/signals.py` der `post_delete`-Handler für `MeasuringUnit`, sodass der Recipe-Cache nach Unit-Löschung nie invalidiert wird.

## What Changes

- Alle Signal-Handler in allen drei Dateien bekommen eindeutige `dispatch_uid`-Strings
- `supply/signals.py`: `instance.tracker`-Referenz entfernen; `_embedding_fields_changed` auf direkten Feldvergleich umschreiben (kein `FieldTracker` nötig — stattdessen `update_fields` aus dem Signal-`kwargs` prüfen)
- `supply/signals.py`: Tippfehler `environment_score` → `environmental_score` korrigieren
- `recipe/signals.py`: `post_delete`-Handler für `MeasuringUnit` ergänzen
- `planner/signals.py`: `usage_count`-Decrement mit `GREATEST(usage_count - 1, 0)` absichern (via `F()`-Expression mit `Max`)
- `recipe/signals.py`: Embedding-Thread re-fetcht Recipe aus DB statt stale `instance` zu verwenden

## Capabilities

### New Capabilities
_(kein neues Feature)_

### Modified Capabilities
_(keine Spec-Level-Änderungen)_

## Impact

- **Backend**: `backend/recipe/signals.py`, `backend/planner/signals.py`, `backend/supply/signals.py`
- **Keine Frontend-Änderungen**, keine Migrationen
