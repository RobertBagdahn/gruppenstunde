## 1. Root AGENTS.md korrigieren

- [x] 1.1 `Ingredient` als standalone-Model dokumentieren, nicht als Supply-Subklasse. Supply-Typ-Liste: `supply.Material` (erbt von Supply), `supply.Ingredient` (standalone models.Model)

## 2. Backend AGENTS.md korrigieren

- [x] 2.1 `cached_energy_kj` → `cached_energy_kcal` und `cached_energy_total_kj` → `cached_energy_total_kcal` in Recipe-Model-Beschreibung
- [x] 2.2 `recipe/services/cockpit_service.py` → `recipe/services/suggestion_service.py`
- [x] 2.3 RecipeHint-Referenzen durch Rule ersetzen: Rule-Model beschreiben (Ampel-Schwellenwerte, nicht "Hints")
- [x] 2.4 `HintParameterChoices.ENERGY_KJ` existiert nicht mehr → `ENERGY_KCAL` dokumentieren
- [x] 2.5 `RuleHintLevelChoices` (nicht `HintLevelChoices`) als das aktuelle Enum dokumentieren
- [x] 2.6 Alte Backward-Compat-Aliase als "zur Entfernung vorgesehen" markieren: `HintLevelChoices`, `HintMinMaxChoices`, `HintParameterChoices` in `recipe/choices.py`, `RecipeStatusChoices`

## 3. Frontend AGENTS.md korrigieren

- [x] 3.1 EntityType-Tabelle um `recipe` erweitern (Route: `/recipes/:slug`, Identifier: `slug`)
- [x] 3.2 CommandPalette-Routen in Doku aktualisieren: `/create/session` statt `/sessions/new`, `/session-planner/app` statt `/planner`
- [x] 3.3 Food-spezifische Einträge entfernen, die laut Domain-Trennungsregel nicht ins Haupt-Frontend gehören (Rezept-spezifische Pages/Routen, Ingredient-APIs)
