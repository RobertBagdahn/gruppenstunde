## Why

Die drei AGENTS.md-Dateien (Root, Backend, Frontend) enthalten veraltete und falsche Referenzen: Feldnamen, die nicht mehr existieren (`cached_energy_kj`), Dateipfade zu gelöschten Dateien (`cockpit_service.py`), und Beschreibungen, die der aktuellen Code-Realität widersprechen (`Ingredient` als Supply-Subklasse). Das verwirrt Entwickler und KI-Agenten.

## What Changes

- **Root AGENTS.md**: `Ingredient` ist standalone, nicht Supply-Subklasse. Beschreibung korrigieren.
- **Backend AGENTS.md**: `cached_energy_kj` → `cached_energy_kcal` Referenzen. `cockpit_service.py` → `suggestion_service.py`. `HintParameterChoices.ENERGY_KJ` existiert nicht mehr. Alle RecipeHint-Referenzen durch Rule ersetzen. `RuleHintLevelChoices` Referenzen ergänzen.
- **Frontend AGENTS.md**: EntityType-Tabelle korrigieren (`recipe` fehlt). Falsche Routen in CommandPalette-Doku. Food-spezifische Einträge entfernen, die laut Domain-Trennungsregel nicht ins Haupt-Frontend gehören. EntityLink-Tests dokumentieren die falschen Testnamen.

## Capabilities

### New Capabilities

Keine — reine Dokumentations-Korrektur.

### Modified Capabilities

Keine — es werden keine Spec-Level-Requirements geändert.

## Impact

- **Dokumentation**: `AGENTS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md`
- **Keine Code-Änderungen**, keine Migrationen
