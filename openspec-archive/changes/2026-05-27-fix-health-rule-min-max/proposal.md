## Why

Die `HealthRule.evaluate()`-Methode verwendet nur eine Vergleichsrichtung (`value <= threshold`). Für Mindest-Regeln (Protein, Vitamine, Ballaststoffe) führt das dazu, dass ein leerer Tag (0g Protein, 0mg Vitamin C) fälschlicherweise als "grün" bewertet wird. Nutzer sehen keine roten Punkte bei zu wenig Nährstoffen — das Cockpit ist damit für die Hälfte der Regeln nutzlos.

## What Changes

- **BREAKING**: `HealthRule` Model erhält ein neues Feld `rule_type` (`"min"` / `"max"`) zur Unterscheidung von Unter- und Obergrenzen
- `evaluate()`-Methode wird angepasst: bei `rule_type="min"` wird die Vergleichsrichtung umgekehrt
- Seed-Daten werden aktualisiert: bestehende Regeln erhalten den korrekten `rule_type`
- Pydantic-Schema `HealthRuleSchema` wird um `rule_type` erweitert
- Migration für das neue Feld

## Capabilities

### New Capabilities

(keine — das Feature existiert bereits, die Logik ist nur fehlerhaft)

### Modified Capabilities

- `meal-cockpit`: Die Bewertungslogik für HealthRules muss Min/Max-Richtung unterstützen

## Impact

- **Backend**: `recipe` App — Model `HealthRule`, Service `cockpit_service.py`, Schemas
- **Django-Migration**: Ein neues Feld `rule_type` auf `HealthRule`
- **Pydantic-Schema**: `HealthRuleSchema` in `backend/recipe/schemas/`
- **Zod-Schema**: Falls `HealthRule` im Frontend dargestellt wird (Admin/Cockpit-Config)
- **Seed-Daten**: `seed_all.py` — alle 19 bestehenden Rules brauchen `rule_type`-Zuweisung
- **Django Admin**: `rule_type` in `list_display` und `list_filter` aufnehmen
