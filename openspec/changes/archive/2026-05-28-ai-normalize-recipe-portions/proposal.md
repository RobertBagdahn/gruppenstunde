## Why

Rezeptmengen in der Datenbank sind nach der Normierungs-Migration (0005) inkonsistent. Manche Rezepte hatten bereits Pro-Portion-Mengen und wurden nochmals geteilt (z.B. 1.5g Brot), andere sind plausibel aber für Pfadfinder-Gruppenkochen zu mager (30g Linsen für eine Suppe). Die Seed-Daten müssen einmalig per KI auf realistische 1-Personen-Portionen korrigiert werden.

## What Changes

- Einmaliges Management Command `normalize_recipe_portions` das per Gemini Structured Output alle bestehenden Rezepte auf realistische 1-Personen-Mengen korrigiert
- Command kann nach Ausführung wieder gelöscht werden (einmaliger Fix, kein dauerhafter Service)

## Capabilities

### New Capabilities
- `recipe-portion-normalization`: Einmaliges KI-gestütztes Seed-Daten-Fix per Management Command

### Modified Capabilities
<!-- keine -->

## Impact

- **Backend Apps**: `recipe` (temporäres Management Command)
- **Abhängigkeiten**: `google-genai` (bereits vorhanden)
- **Migrationen**: Keine
- **Betroffene Services**: `recipe_checks.recalculate_recipe_cache` wird nach Update aufgerufen
