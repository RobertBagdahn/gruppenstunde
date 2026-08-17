## Context

Legacy-Import (`import_inspi_data`) hat `salt_g`-Werte als `sodium_mg * 2.5` berechnet statt `sodium_mg * 2.5 / 1000`. Betroffen sind alle Ingredients mit `salt_g > 0 AND sodium_mg > 0 AND salt_g == sodium_mg * 2.5`. Zusätzlich fehlt in `planner/api/meal_plan.py:560` die Skalierung `norm_portions / recipe_servings` in der Nährwert-Zusammenfassung.

## Goals / Non-Goals

**Goals:**
- Alle falsch importierten `salt_g`-Werte korrigieren (÷ 1000)
- `nutrition_summary` Code-Bug fixen
- Rezept-Caches nach Daten-Fix invalidieren
- Fix auf lokal UND Produktion anwenden

**Non-Goals:**
- Andere Nährwert-Felder prüfen (nur `salt_g` ist betroffen)
- Import-Skript reparieren (Legacy-Import wird nicht erneut ausgeführt)
- Frontend-Änderungen (Anzeige ist korrekt, nur Daten waren falsch)

## Decisions

1. **Data-Migration statt Management Command**: Django-Migration mit `RunPython` für den Daten-Fix. So wird er automatisch auf Prod angewendet und ist reversibel.

2. **Bedingung für Fix**: `WHERE salt_g > 0 AND sodium_mg IS NOT NULL AND sodium_mg > 0 AND ABS(salt_g - sodium_mg * 2.5) < 0.01`. Das schützt manuell eingetragene korrekte Werte (z.B. Seed-Daten mit `salt_g=48` für Gemüsebrühepulver).

3. **Cache-Neuberechnung**: In der Migration via `recalculate_recipe_cache` für alle Rezepte, die betroffene Zutaten verwenden.

4. **Code-Fix**: `scale = (weight_g / 100.0) * mi.factor * (norm_portions / (mi.recipe.servings or 1))` — analog zur Cost-Berechnung in Zeile 636.

5. **Null-Guard**: `if not mi.recipe: continue` am Anfang der Loop hinzufügen, um MealItems ohne Rezept zu überspringen.

## Risks / Trade-offs

- **Risk**: Manuell korrigierte `salt_g`-Werte könnten fälschlich geändert werden → Mitigation: Nur Zeilen mit exakt `salt_g == sodium_mg * 2.5` (±0.01 Toleranz) werden geändert
- **Risk**: Cache-Neuberechnung bei vielen Rezepten ist langsam → Akzeptabel, einmalige Migration
- **Trade-off**: Migration statt Command = sauberer, aber nicht wiederholbar ohne Rollback → Akzeptabel für einmaligen Fix
