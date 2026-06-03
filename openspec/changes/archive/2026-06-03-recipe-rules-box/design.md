## Context

Die `Rule`-Entität (`backend/recipe/models/rule.py`) definiert Ampel-Schwellenwerte (`min_green`/`min_yellow`/`max_green`/`max_yellow`) pro Nährwert-Parameter und Scope. Für `scope=recipe` existiert bereits die Auswertung `match_recipe_hints(recipe)` (`recipe/services/recipe_checks.py:105`), die jedoch ausschließlich **nicht erfüllte** (gelb/rot) Regeln zurückgibt — grüne werden verworfen (`if status != "green"`). Werte werden dort pro 100g berechnet.

Auf der Detailseite (`frontend-food/src/pages/recipes/RecipeDetailPage.tsx`) zeigt `RecipeImprovements` nur die Top-5-Verbesserungen. Es gibt ein etabliertes ausklappbares UI-Muster (`AnalysisSection`, RecipeDetailPage.tsx:79), aber mit statischem Titel ohne Vorschau-Badge.

`Rule.evaluate(value)` (rule.py:140) liefert `"green"|"yellow"|"red"`. `get_recipe_nutritional_values(recipe)` liefert per-100g-Werte. Pro-Portion-Umrechnung erfolgt heute im Frontend (`RecipeImprovements`: `totalWeightG/100/servings`).

Constraints: keine Rückwärtskompatibilität nötig; UI ausschließlich in `frontend-food/`; Pydantic↔Zod synchron; mobile-first; keine Migration (keine Model-Änderung).

## Goals / Non-Goals

**Goals:**
- Alle aktiven `scope=recipe`-Regeln eines Rezepts mit Pass/Fail-Status (grün/gelb/rot) anzeigen.
- Werte pro Portion anzeigen, konsistent mit `RecipeImprovements`.
- Ausklappbare Box mit Zähler-Ampel-Vorschau im Titel.
- Saubere Datenquelle über `Rule.evaluate()`, ohne Logik-Duplizierung im Frontend.

**Non-Goals:**
- Keine Änderung der Rule-CRUD-API oder des Rule-Models.
- Keine Ablösung oder Reparatur von `improvement_ranking_service.py`.
- Keine Regeln für andere Scopes (meal/day/meal_event) oder andere Content-Typen.
- Keine neue ausklappbare Generalkomponente; eigene `RecipeRulesBox`.

## Decisions

### 1. Neuer Service `evaluate_recipe_rules(recipe)` statt Erweiterung von `match_recipe_hints`
Eigene Funktion in `recipe/services/recipe_checks.py`, die alle `scope=recipe`-Regeln auswertet und **jede** Regel zurückgibt (auch grün), inkl. Schwellenwerte für die Anzeige.
- **Warum nicht `match_recipe_hints` erweitern?** Dessen Vertrag (nur gelb/rot) wird vom Improvement-Pfad konsumiert; ein zweiter Modus würde es überladen. Eigener Service hält beide Konsumenten klar getrennt. Die per-100g-Berechnung (Gewicht, `nutri_class`-Ermittlung) wird in eine gemeinsame Helper-Funktion extrahiert bzw. wiederverwendet.

### 2. Pro-Portion-Umrechnung im Backend
Der Service berechnet `total_weight_g` (wie in `match_recipe_hints`) und liefert `value_per_serving = value_per_100g * (total_weight_g/100) / servings`. Schwellen sind als Pro-Portion-Zielwerte definiert (analog DGE in `RecipeImprovements`) und werden unverändert durchgereicht.
- **Warum Backend statt Frontend?** Vermeidet Logik-Duplizierung und hält die Zod-Daten direkt anzeigbar. Frontend rendert nur.
- **Alternative (Frontend-Umrechnung wie RecipeImprovements):** verworfen, da die Box eigenständig konsumierbar sein soll und die Auswertungs-Semantik (`evaluate` auf welcher Basis) zentral bleibt.

### 3. `nutri_class` als Buchstabe
Falls eine Regel `parameter=nutri_class` hat, gibt der Service ein optionales `display_value` (z.B. `"A"`) plus numerischen `value` zurück. Mapping 1→A … 5→E. `unit` bleibt leer.

### 4. Status-Berechnung & Zähler
Pro Regel `status = rule.evaluate(value_per_100g)` (Auswertung auf derselben Basis wie heute, also per-100g, damit Schwellen-Semantik unverändert bleibt — die Anzeige zeigt zusätzlich den Pro-Portion-Wert). Der Service aggregiert `green_count`/`yellow_count`/`red_count`.
- **Hinweis:** Auswertung per-100g, Anzeige per-Portion. Damit die Schwellenangabe in der UI konsistent bleibt, liefert der Service je Regel die relevante Schwelle (`threshold`) und deren Richtung (`min`/`max`) als anzeigbaren Text mit.

### 5. Eigene UI-Komponente `RecipeRulesBox`
Kopiert das `AnalysisSection`-Muster (useState-Toggle, `expand_more`-Rotation), ergänzt den Titel um einen Zähler-Ampel-Badge. Liste sortiert nach `sort_order` (Backend-Reihenfolge).

## API-Änderungen

**Neuer Endpunkt:** `GET /api/recipes/{recipe_id}/rules/`
- Auth: öffentlich (wie andere Analyse-Endpunkte in `nutrition.py`).
- Response `RecipeRulesOut`:
  ```
  {
    "green_count": int,
    "yellow_count": int,
    "red_count": int,
    "items": [RecipeRuleResult, ...]
  }
  ```
- `RecipeRuleResult`:
  ```
  {
    "rule_id": int,
    "name": str,
    "parameter": str,
    "status": "green" | "yellow" | "red",
    "value_per_serving": float,
    "display_value": str | null,   # z.B. "A" für nutri_class, sonst null
    "unit": str,
    "threshold": float | null,     # die relevante Grenze (erfüllt oder verfehlt)
    "threshold_direction": "min" | "max" | null,
    "tip_text": str                # nur relevant bei gelb/rot, sonst ""
  }
  ```

**Betroffene Dateien:**
- `backend/recipe/services/recipe_checks.py` (neuer Service)
- `backend/recipe/api/nutrition.py` (neuer Endpunkt)
- `backend/recipe/schemas/nutrition.py` + `schemas/__init__.py` (Re-Export)
- `frontend-food/src/schemas/recipe.ts` (Zod)
- `frontend-food/src/api/recipes.ts` (`useRecipeRules`)
- `frontend-food/src/components/recipe/RecipeRulesBox.tsx`
- `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`

**Datenbank-Migration:** keine (keine Model-Änderung).

## Risks / Trade-offs

- **Auswertungsbasis (100g) vs. Anzeigebasis (Portion) divergieren** → Mitigation: Service liefert sowohl den Pro-Portion-Wert als auch den anzeigbaren Schwellentext; Doku im Code-Kommentar (Warum), damit klar ist, dass `evaluate` auf 100g läuft. Alternativ später konsolidieren, wenn Schwellen auf Portionsbasis migriert werden.
- **Keine `scope=recipe`-Regeln vorhanden** → Box zeigt leeren/„keine Regeln"-Zustand statt zu crashen.
- **`nutri_class`-Sonderfall vergessen** → expliziter Test für `display_value`-Mapping.
- **Doppel-Berechnung Gewicht/nutri_class** (auch in `match_recipe_hints`) → Mitigation: gemeinsamen Helper extrahieren, um Drift zu vermeiden.

## Migration Plan

1. Backend-Service + Schema + Endpunkt + Tests (`uv run pytest`).
2. Zod-Schema synchronisieren, Hook, Komponente, Einbindung.
3. Manuell mobil + Desktop prüfen an einem Rezept mit gemischten Regeln.
4. Rollback: rein additiv — Endpunkt/Box entfernen, keine Datenänderung.

## Open Questions

- Sollen inaktive Regeln (`is_active=False`) komplett ignoriert werden? → Annahme: ja (nur `is_active=True`, wie `match_recipe_hints`).
- Leerer Zustand: Box ausblenden oder mit Hinweis „Keine Regeln definiert" anzeigen? → Annahme: Box ausblenden, wenn keine Regeln existieren.
