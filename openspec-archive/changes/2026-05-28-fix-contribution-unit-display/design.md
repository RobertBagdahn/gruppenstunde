## Context

Die Rezept-Verbesserungsvorschläge zeigen pro Nährstoff die "Hauptverursacher"-Zutaten mit ihrem Beitrag an. Aktuell wird der Beitrag immer mit der Einheit `g` dargestellt, obwohl der berechnete Wert je nach Parameter in kJ, mg oder g vorliegt.

Relevante Dateien:
- `backend/recipe/services/nutri_improvement_service.py` — `_find_contributing_ingredients()` berechnet `amount_g` (Naming irreführend)
- `backend/recipe/services/improvement_ranking_service.py` — `_format_ingredients()` mappt auf `contribution_g`
- `backend/recipe/schemas/nutrition.py` — `SuggestedIngredientOut` Schema
- `frontend-food/src/components/recipe/RecipeImprovements.tsx` — zeigt `{ing.contribution_g.toFixed(0)}g`

## Goals / Non-Goals

**Goals:**
- Korrekte Einheit pro Parameter anzeigen (kJ für Energie, mg für Natrium, g für den Rest)
- Minimaler Eingriff, da es ein einfacher Bugfix ist

**Non-Goals:**
- Umbenennung von `contribution_g` zu `contribution_value` (wäre sauberer, aber nicht nötig für den Fix)
- Änderung der Berechnungslogik selbst

## Decisions

1. **Unit im Backend mitliefern**: Das Backend kennt den Parameter und kann die Einheit direkt mitgeben. Das ist sauberer als im Frontend eine Mapping-Tabelle zu pflegen.

2. **Feld `unit` zu `SuggestedIngredientOut` hinzufügen**: Neues Pflichtfeld `unit: str` im Schema. `_format_ingredients` bekommt den `parameter`-String übergeben und leitet daraus die Unit ab (nutzt bestehende `_UNIT_MAP`).

3. **Frontend zeigt `ing.unit` statt hartem `g`**: Einfache Änderung in beiden Frontends.

## Risks / Trade-offs

- **Breaking Schema-Änderung**: Das neue `unit`-Feld ist Pflicht. Da keine Rückwärtskompatibilität nötig ist, kein Problem.
- **Feldname `contribution_g` bleibt falsch**: Der Name suggeriert Gramm, enthält aber je nach Parameter andere Einheiten. Akzeptabel als technische Schuld, da der User nur die formatierte Anzeige sieht.
