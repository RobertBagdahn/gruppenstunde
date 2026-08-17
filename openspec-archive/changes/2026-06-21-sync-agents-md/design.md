## Context

Die AGENTS.md-Dateien dienen als Single Source of Truth für KI-Agenten und Entwickler. Aktuell dokumentieren sie Felder, die migriert wurden (`cached_energy_kj` → `cached_energy_kcal`), Dateien, die umbenannt wurden (`cockpit_service.py` → `suggestion_service.py`), und Modell-Beziehungen, die nicht stimmen (`Ingredient` erbt nicht von `Supply`).

## Goals / Non-Goals

**Goals:**
- Alle drei AGENTS.md-Dateien spiegeln den aktuellen Code-Stand wider
- Keine veralteten Referenzen mehr auf gelöschte/umbenannte Dateien oder Felder

**Non-Goals:**
- Kein Code-Refactoring
- Keine Änderung der Architektur (Ingredient bleibt standalone, keine Supply-Subklasse)

## Decisions

### 1. Ingredient als standalone dokumentieren

**Entscheidung**: AGENTS.md beschreibt `Ingredient` als eigenständiges Model (`models.Model`), nicht als Supply-Subklasse. Begründung: Ingredient hat 30+ Nährwert-Felder und dupliziert bewusst Slug/SoftDelete-Felder statt von Supply zu erben.

### 2. Rule statt RecipeHint

**Entscheidung**: Alle AGENTS.md-Referenzen auf `RecipeHint` werden durch `Rule` ersetzt. Die Backward-Compat-Aliase (`HintLevelChoices`, `RecipeStatusChoices`) werden als "Legacy-Aliase, zur Entfernung vorgesehen" dokumentiert.

## Risks / Trade-offs

- Keine Risiken — rein dokumentativ
