## Context

Das `RecipeHint`-Model wurde beim Rewrite des Inspi-Backends über-engineered. Es hat `min_value`/`max_value` (zwei separate Felder) und eine `range`-Option, obwohl alle existierenden Regeln exakt ein Schema verwenden: ein Schwellenwert (`value`) mit Richtung (`min`/`max`). Die Legacy-Daten (20 Regeln) nutzen `hint_level` = `"warn"`/`"error"`, das aktuelle Model hat `"warning"`/`"error"`. Es gibt keine Frontend-Pflegemaske.

Aktueller Stand:
- Model: `backend/recipe/models/hints.py` — `min_value`, `max_value`, `name`, `description`, `improvement_text`
- Matching: `backend/recipe/services/recipe_checks.py` — `match_recipe_hints()`
- Ranking: `backend/recipe/services/improvement_ranking_service.py` — merged mit Nutri-Score
- Frontend: `RecipeImprovements.tsx` zeigt Cards mit Fortschrittsbalken, keine Farb-Differenzierung nach Level

## Goals / Non-Goals

**Goals:**
- Model auf ein `value`-Feld vereinfachen
- `hint`-Feld für den angezeigten Text (deutsch, kurz)
- `hint_level` farblich im Frontend differenzieren (warn=amber, error=rot)
- Staff-only CRUD-Page unter `/admin/recipe-hints`
- Fixture mit den 20 Legacy-Regeln

**Non-Goals:**
- Kein Range-Support (min UND max gleichzeitig pro Regel)
- Keine Nutri-Score-Integration ändern (nur RecipeHint-Seite)
- Kein öffentlicher Zugang zur Pflege-Page

## Decisions

### 1. Single `value`-Feld statt `min_value`/`max_value`

**Entscheidung**: Ein `value: FloatField` + `min_max: CharField("min"|"max")`.

**Rationale**: Alle 20 existierenden Regeln verwenden genau dieses Pattern. Range-Support wurde nie genutzt. Einfacheres Model = einfacheres Matching = weniger Bugs.

**Alternative**: Beides behalten, `value` als Alias. → Unnötige Komplexität.

### 2. `hint_level` Choices: `warn`/`error`/`info`

**Entscheidung**: `"warn"` statt `"warning"` verwenden.

**Rationale**: Passt zu Legacy-Daten, kürzer, konsistent mit gängigen Log-Levels.

### 3. `recipe_type` und `recipe_objective` als Pflichtfelder

**Entscheidung**: Kein `blank=True`, jede Regel muss explizit Typ und Objective angeben.

**Rationale**: Erzwingt bewusste Zuordnung. Kein versehentliches "gilt für alles".

### 4. Frontend-CRUD mit shadcn Table + Sheet-Modal

**Entscheidung**: Eigene Page, kein Django-Admin.

**Rationale**: Nicht-technische Staff-User sollen Regeln pflegen können. Sheet-Modal für Edit/Create passt zum bestehenden UI-Pattern.

### 5. Hint-Text-Anzeige als `recommendation_text`

**Entscheidung**: Das `hint`-Feld wird im `Improvement`-Response als `recommendation_text` durchgereicht.

**Rationale**: Minimaler Frontend-Aufwand, bestehende Card-Komponente zeigt `recommendation_text` bereits an.

## Risks / Trade-offs

- **Destructive Migration**: `min_value`/`max_value` werden entfernt → Datenverlust falls Regeln existieren, die Range nutzen. Mitigation: Prüfung zeigt keine Range-Regeln in Produktion.
- **Pflichtfelder ohne Default**: Bestehende Regeln ohne `recipe_type`/`recipe_objective` brechen. Mitigation: Migration setzt Default-Werte oder Daten werden komplett neu geseeded.
- **Staff-only Route**: Muss im Frontend-Router abgesichert werden. Mitigation: Auth-Guard wie bei anderen Admin-Pages.
