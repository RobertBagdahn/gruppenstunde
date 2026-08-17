## Context

Der MealPlan hat derzeit ein Feld `allergen_tags` (M2M zu `NutritionalTag`) mit `limit_choices_to={"is_dangerous": True}`. Es akzeptiert nur Tags, die als Allergen markiert sind (laktosefrei, glutenfrei, etc.). Tags wie "vegan" oder "vegetarisch" (is_dangerous=False) können nicht ausgewählt werden. Die Tag-Auswahl existiert nur im SettingsPanel (nach der Erstellung), nicht im Create-Dialog.

Der Allergen-Scan (`GET /{meal_plan_id}/allergen-scan/`) vergleicht die `allergen_tags` des Plans mit den `nutritional_tags` der Rezepte, filtert dabei aber auf `is_dangerous=True` — nicht-Allergen-Tags werden ignoriert.

## Goals / Non-Goals

**Goals:**
- `MealPlan.allergen_tags` → `MealPlan.nutritional_tags` umbenennen
- `limit_choices_to={"is_dangerous": True}` entfernen — alle Tags wählbar
- Allergen-Scan über **alle** nutritional_tags laufen lassen (nicht nur is_dangerous)
- Tag-Auswahl in den Create-Dialog einbauen
- SettingsPanel auf `NutritionalTagMultiSelect` umstellen

**Non-Goals:**
- `NutritionalTag`-Model selbst ändern (is_dangerous bleibt erhalten für UI-Farben)
- Recipe- oder Ingredient-Tag-System ändern (bleiben unverändert)
- Die Semantik des Scans ändern (bleibt ein Violation-Scanner, nur mit erweitertem Scope)

## Decisions

### 1. Ein einziges `nutritional_tags` Feld statt getrennter allergen/preference Felder

**Entscheidung**: Ein M2M-Feld für alle Tags.

**Alternativen**:
- Zwei separate Felder (`allergen_tags` + `nutritional_tags`): Mehr UI-Komplexität, zwei Tag-Picker, unklar welche Tags für den Scan relevant sind. Overkill für den Use Case.

**Begründung**: Für die Plan-Filterung und den Scan ist die Unterscheidung "Allergen vs. Präferenz" irrelevant. Der User will einfach "zeig keine Rezepte, die gegen meine diätischen Anforderungen verstoßen" — egal ob Allergie oder Präferenz.

### 2. Allergen-Scan prüft alle Tags, nicht nur is_dangerous

**Entscheidung**: Der Scan vergleicht alle `nutritional_tags` des Rezepts mit allen `nutritional_tags` des Plans. Der `is_dangerous`-Filter in `get_allergen_scan` wird entfernt.

**Begründung**: Der User hat explizit gesagt, dass `is_dangerous` für den Scan egal sein soll. Ein vegetarischer Plan soll Rezepte mit "Tierbestandteile (nicht Vegetarisch)" als Violation anzeigen, obwohl das Tag `is_dangerous=False` hat.

### 3. `NutritionalTagMultiSelect` in Create-Dialog und SettingsPanel wiederverwenden

**Entscheidung**: Die existierende Komponente `NutritionalTagMultiSelect` wird in beiden Orten verwendet. Sie unterstützt bereits Alle-Tags-Anzeige, Suche und Multi-Select.

**Begründung**: Keine Duplizierung. Die Komponente muss nicht geändert werden — sie zeigt bereits alle Tags ohne `is_dangerous`-Filter.

## Risks / Trade-offs

- **[Risk] Migration auf bestehender DB**: M2M-Tabelle wird umbenannt. → Django `RenameField` oder manuelles `AlterField` mit `db_table`. Migration in staging testen.
- **[Risk] Mehr Tags = mehr Scan-Violations**: Wenn ein Plan "vegan" und "glutenfrei" auswählt, werden mehr Rezepte als Violation markiert. → Gewünschtes Verhalten, aber UI muss damit umgehen können.
- **[Risk] Frontend-Feldumbenennung**: `allergenTagIds` → `nutritionalTagIds` / `planTagIds` in vielen Komponenten. TypeScript-Compiler fängt alle Stellen ab.

## Migration Plan

1. Migration erstellen: `uv run python manage.py makemigrations planner`
2. Migration anwenden: `uv run python manage.py migrate`
3. Keine Datenmigration nötig — die M2M-Tabelle wird nur umbenannt, die bestehenden Verknüpfungen bleiben erhalten
4. Kein Rollback-Plan nötig (aktive Entwicklung, keine Rückwärtskompatibilität)

## Open Questions

- Keine
