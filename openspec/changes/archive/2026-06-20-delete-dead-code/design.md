## Context

Die Codebasis hat eine lange Evolutionsgeschichte (idea → Content, RecipeHint → Rule, MealPlan → MealEvent und zurück). Jeder evolutionäre Schritt hat Backward-Compat-Shims hinterlassen, die mittlerweile von niemandem mehr verwendet werden. Gleichzeitig existieren tote Komponenten und verwaiste Seiten im Frontend.

## Goals / Non-Goals

**Goals:**
- Alle Idee-Legacy-Referenzen entfernen
- Backward-Compat-Shims entfernen, die von keinem produktiven Code mehr verwendet werden
- Tote Frontend-Komponenten und -Seiten löschen
- Seed-Daten korrigieren (energy_kj → energy_kcal)
- Unsinnige Test-Assertions beheben

**Non-Goals:**
- Keine Feature-Änderungen
- Keine API-Änderungen (außer Legacy-Endpunkt-Entfernung)
- Kein Refactoring von funktionierendem Code über das Minimum hinaus

## Decisions

### 1. content/base_schemas.py und base_api.py komplett löschen

**Entscheidung**: Die Re-Export-Shims werden gelöscht. Alle Importe werden auf die direkten Module umgestellt (`content.schemas.base`, `content.api.helpers`).

**Begründung**: Die Shims existieren nur für Backward-Compat. Da keine Rückwärtskompatibilität nötig ist, können sie sicher entfernt werden.

### 2. RecipeHint-Properties entfernen

**Entscheidung**: Die `min_max`, `value`, `hint` Properties auf dem `Rule`-Modell werden entfernt. Tests die `make_recipe_hint()` oder `make_health_rule()` nutzen, werden auf `make_rule()` umgestellt.

### 3. `/me/ideas/` Legacy-Endpunkt entfernen

**Begründung**: Die idea-App existiert nicht mehr. Der Endpunkt ist ein reiner Alias auf `/me/content/` und wird von keinem Frontend mehr aufgerufen.

### 4. Meal.db_column korrigieren

**Entscheidung**: `db_column="meal_event_id"` → `db_column="meal_plan_id"` mit Migration. Der Spaltenname ist historisch (FK zeigte früher auf Event, jetzt auf MealPlan).

## Risks / Trade-offs

- **Test-Bruch bei Legacy-Helper-Entfernung**: Tests die `make_recipe_hint()` nutzen müssen auf `make_rule()` umgestellt werden → Mittelgroßer Aufwand, aber klarer Scope
- **`content/base_schemas.py`-Importe**: Alle Konsumenten müssen auf direkte Importe umgestellt werden → Grep & Replace, aber viele Dateien