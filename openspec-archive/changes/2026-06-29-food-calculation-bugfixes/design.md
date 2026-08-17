## Context

Die Explore-Phase hat gezeigt, dass Backend-Berechnungslogik für Nährwerte und Kosten in zwei parallelen Implementierungen existiert:

1. `nutrition_aggregation.py` — verwendet vom Cockpit-Endpunkt, behandelt Ingredient-MealItems korrekt
2. `meal_plan.py` (API-Endpunkt `nutrition_summary`) — unabhängige, unvollständige Reimplementierung, die Ingredient-MealItems auslässt

Das `MealItemOverride`-Modell (Felder `excluded`, `quantity_override`) ist im Datenbankschema vorhanden, wird aber in keiner Berechnungsroutine ausgewertet — es ist totes Code.

Im Shopping-Service wird bei Direktzutaten mit `g`-Einheit fälschlicherweise `measuring_unit.quantity` statt `mi.quantity` (die eigentliche Menge) verwendet. `MeasuringUnit` hat kein `quantity`-Feld — der Aufruf liefert `None` oder `AttributeError`.

Im Frontend ist `rebalanceShares` anfällig für Rundungsartefakte: `Math.round` auf jeden Anteil einzeln kann dazu führen, dass die Summe von 100 abweicht.

## Goals / Non-Goals

**Goals:**
- `nutrition_summary`-API berücksichtigt Ingredient-MealItems mit derselben Logik wie `meal_item_helpers.py`
- `MealItemOverride.excluded` entfernt Items aus Nährwert- und Kostenberechnung
- `MealItemOverride.quantity_override` skaliert die Menge in Nährwert- und Kostenberechnung
- `cost_summary` berechnet `cost_per_person` pro Rezept auf Basis von `effective_portions` der jeweiligen Mahlzeit
- Shopping-Service-Bug bei `g`-Einheit behoben
- `rebalanceShares` produziert immer exakt 100% Summe
- Alle Fixes haben Tests

**Non-Goals:**
- Keine Änderung am API-Schema (kein Breaking Change)
- Keine Änderung an `nutrition_aggregation.py` (Cockpit ist korrekt)
- Keine Umstrukturierung der Berechnungsarchitektur
- Kein Frontend-Anzeigefeld für Override-Mengen (nur Berechnung)

## Decisions

### 1. Ingredient-MealItems in `nutrition_summary` — Code-Reuse statt Neuimplementierung

`meal_item_helpers._resolve_ingredient_weight_g` und `resolve_ingredient_energy_kcal` existieren bereits und sind getestet. Die `nutrition_summary`-API soll diese Helper direkt importieren und aufrufen, statt die Logik zu duplizieren.

**Alternative:** Den Cockpit-Service (`_aggregate_meal_values`) als Dependency nutzen — abgelehnt, weil er zusätzliche Felder (nutri_class, sodium_mg) berechnet, die `NutritionSummaryOut` nicht braucht, und performance-kritischer ist.

### 2. MealItemOverride-Auswertung — nur in `nutrition_summary` und `cost_summary`

`MealItemOverride` wird nur in den API-Aggregations-Endpunkten ausgewertet. `MealItemOut.resolve_energy_kcal` (für die Anzeige einzelner Items) und `shopping_service` (Einkaufsmengen) bleiben unverändert — dort sind Overrides UX-technisch nicht sinnvoll (Einkaufsliste soll Originalmengen enthalten).

**Auswertungsregel:**
```
override_weight_g = quantity_override × portion.weight_g  (wenn quantity_override gesetzt)
excluded = True → Item wird komplett übersprungen
```

Override-Lookup: `item.overrides.all()` → dict `{recipe_item_id: override}` für O(1)-Zugriff im Loop.

### 3. `cost_summary` recipe `cost_per_person` — per-meal effective_portions

Statt `recipe_costs[rid]["total_cost"] / norm_portions` wird der `cost_per_person` pro Mahlzeit berechnet (`meal_cost / effective_portions`) und summiert. Das `RecipeCostOut.cost_per_person` wird zur gewichteten Summe über alle Mahlzeiten, in denen das Rezept vorkommt.

### 4. Shopping-Service g-Einheit — `mi.quantity` statt `measuring_unit.quantity`

In `meal_item_helpers._resolve_ingredient_weight_g:47-48` ist die korrekte Implementierung bereits dokumentiert: bei `name_lower == "g"` wird `float(item.quantity)` zurückgegeben. Der Shopping-Service soll dieselbe Logik übernehmen.

### 5. `rebalanceShares` — Largest-Remainder-Algorithmus

Statt `Math.round` auf jeden Anteil einzeln: Alle unlocked Anteile als Fließkommazahlen berechnen, flooren, dann den verbleibenden Rest (1–n) auf die Items mit den größten Nachkommastellen verteilen. Standard-Algorithmus für proportionale Ganzzahlverteilung.

### 6. Extras-Hinweis — Info-Text statt UI-Block

`extrasKcalPerPerson` bleibt 0. Im `StepCockpit` wird ein kleiner Info-Text angezeigt: "Warme Gerichte und Gemüse sind nicht in der Kalorienberechnung enthalten." — einfache `<p>`-Zeile, kein neuer State.

## Risks / Trade-offs

- [Risk] `MealItemOverride` war bisher unwirksam — Aktivierung kann bestehende Essenspläne mit gesetzten Overrides anders darstellen. → **Mitigation**: Selten genutzte Funktion (Wizard-UI setzt keine Overrides), Impact minimal. Kein Datenmigration nötig.
- [Risk] `nutrition_summary` liefert nach dem Fix höhere Werte (Ingredient-Items waren vorher 0) — könnte Nutzer verwirren. → **Mitigation**: Korrekte Werte sind besser als falsche. Kein Rollback-Plan nötig.
- [Risk] Shopping-Service-Fix bei `g`-Einheit könnte Mengen ändern, wenn `measuring_unit.quantity` bisher zufällig `None` war (→ `portion_weight = None` → `weight_g = 0`). Nach Fix: `weight_g = mi.quantity * 1.0 * factor * meal_scaling`. → **Mitigation**: Bug-Fix ist korrekt; bisher wurden diese Zutaten einfach auf der Einkaufsliste mit 0g angezeigt.

## Migration Plan

Keine Datenbankmigrationen. Deployment ist ein normaler Code-Deploy:
1. Backend-Tests lokal ausführen: `cd backend && uv run pytest planner/tests/ supply/tests/ -x`
2. Frontend-Tests (wenn vorhanden): `cd frontend-food && npm run test`
3. Deploy via `opencode deploy`
