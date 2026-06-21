## Context

Verschiedene Feldnamen für dasselbe Konzept verteilen sich über 6+ Apps und 3 Frontend-Codebases. Die Umbenennung betrifft Django-Modelle (mit Migrationen), Pydantic-Schemas, API-Endpunkte, Zod-Schemas und UI-Komponenten.

## Goals / Non-Goals

**Goals:**
- Ein einheitliches Vokabular: `portions` (nicht `servings`, nicht `norm_portions`) für "wie viele Portionen"
- `participants` (nicht `players`) für "wie viele machen mit"
- `location_type` (nicht `play_area`) für "wo findet es statt"
- `food_category` (nicht `physical_viscosity`) für Lebensmittel-Kategorie

**Non-Goals:**
- Keine Änderung der verbose_name / help_text auf Deutsch (die sind korrekt)
- Keine UI-Text-Änderungen (die sind bereits auf Deutsch mit "Portionen")
- Keine Änderung von `execution_time` (ist bereits einheitlich auf Content-Ebene)

## Decisions

### 1. `portions` statt `servings`

**Begründung**: "Portionen" ist der deutsche Begriff, der bereits im UI verwendet wird. Der Code sollte denselben Begriff nutzen. `norm_portions` vereinfacht sich zu `portions`, weil der "norm"-Präfix im Code keinen Mehrwert bringt (im UI steht ohnehin "Portionen").

### 2. `participants` statt `players`

**Begründung**: GroupSession nutzt bereits `participants`. Game sollte dasselbe Feld nutzen. "Teilnehmer" ist der deutsche Begriff für beide.

### 3. `location_type` statt `play_area`

**Begründung**: `location_type` ist der generische Name auf Content-Ebene. `play_area` ist Game-spezifisch, aber das Konzept ist dasselbe.

### 4. `food_category` statt `physical_viscosity`

**Begründung**: "Viskosität" (viscosity) ist ein physikalisches Konzept (Fließverhalten). Die Choices sind "Essen/Getränk" — das ist eine Lebensmittel-Kategorie, keine Viskosität. `food_category` ist semantisch korrekt.

### 5. Migrations-Strategie

**Entscheidung**: Da keine Rückwärtskompatibilität nötig ist, einfache `RenameField`-Migrationen. Kein Staged Rollout, keine_ALIAS-Spalten.

## Risks / Trade-offs

- **5+ Migrationen** müssen gleichzeitig deployt werden → Niedriges Risiko, da App in aktiver Entwicklung
- **Frontend und Backend müssen synchron deployt werden** → Feldnamen ändern sich in beiden
- **`food_category` ist ein neues Choice-Enum** → Migration muss `physical_viscosity` → `food_category` Feldumbenennung + Choice-Enum-Referenz ändern