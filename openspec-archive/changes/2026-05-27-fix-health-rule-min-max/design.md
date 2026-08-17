## Context

Das `HealthRule`-Model in der `recipe` App hat eine `evaluate(value)`-Methode, die nur Obergrenzen korrekt bewertet (`value <= threshold_green → green`). Für 13 von 19 Regeln (Vitamine, Mineralien, Protein, Ballaststoffe) ist die Logik invertiert — diese prüfen Mindestmengen, aber der Code behandelt sie wie Maximalwerte.

Bestehender Code: `backend/recipe/models/health_rule.py`

## Goals / Non-Goals

**Goals:**
- HealthRules können sowohl Mindest- als auch Höchstwerte korrekt evaluieren
- Leere Tage/Mahlzeiten zeigen rot für Mindest-Nährstoffe
- Bestehende Regeln werden korrekt klassifiziert
- Django Admin erlaubt einfache Pflege des `rule_type`

**Non-Goals:**
- Keine neuen Frontend-Komponenten (TrafficLightIndicator unterstützt bereits rot/gelb/grün)
- Kein neues Zod-Schema nötig (rule_type wird nur im Backend verwendet, Frontend empfängt weiterhin nur `status: green/yellow/red`)
- Keine Range-Regeln (gleichzeitig min und max) — das wäre Overengineering

## Decisions

### 1. Neues Feld `rule_type` als CharField mit Choices

```python
class RuleType(models.TextChoices):
    MIN = "min", "Minimum (zu wenig = schlecht)"
    MAX = "max", "Maximum (zu viel = schlecht)"
```

Default: `"max"` (bestehende Obergrenze-Semantik bleibt Standard).

### 2. Evaluierungslogik

```python
def evaluate(self, value: float) -> str:
    if self.rule_type == "max":
        if value <= self.threshold_green: return "green"
        if value <= self.threshold_yellow: return "yellow"
        return "red"
    else:  # min
        if value >= self.threshold_green: return "green"
        if value >= self.threshold_yellow: return "yellow"
        return "red"
```

Für `rule_type="min"`: `threshold_green` ist der Wert, ab dem alles gut ist (z.B. 50g Protein). `threshold_yellow` ist die Warnschwelle darunter (z.B. 30g). Alles unter `threshold_yellow` ist rot.

### 3. Threshold-Semantik bleibt gleich

- `threshold_green` = grüner Bereich (guter Wert)
- `threshold_yellow` = gelber Bereich (Warnung)
- Für MAX: green < yellow (aufsteigend: grün → gelb → rot)
- Für MIN: green > yellow (absteigend: rot → gelb → grün)

Die bestehenden Seed-Werte passen bereits zu dieser Semantik.

### 4. Keine Zod-/Frontend-Änderung nötig

Das Frontend empfängt über die Cockpit-API nur `status: "green"|"yellow"|"red"`. Der `rule_type` ist ein Backend-internes Implementierungsdetail.

## Risks / Trade-offs

- **Migration auf Produktion**: Einfach — ein neues Feld mit Default-Wert, keine Daten gehen verloren
- **Seed-Daten müssen stimmen**: Falsche `rule_type`-Zuweisung würde Regeln invertieren. Mitigation: klare Zuordnung im Seed-Script
- **Kein Range-Support**: Falls jemand sowohl "zu wenig Energie" als auch "zu viel Energie" prüfen will, braucht es zwei separate Regeln. Das ist akzeptabel.
