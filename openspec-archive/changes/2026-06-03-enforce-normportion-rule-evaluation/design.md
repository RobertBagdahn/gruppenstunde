## Context

`recipe-portion-normalization` legt fest: Jedes `Recipe` repräsentiert genau **eine Normportion**, `Recipe.servings` ist immer `1`, und alle `RecipeItem.quantity`-Werte gelten für genau eine Portion. Die gecachten Werte (`cached_weight_g`, `cached_price_total`, `cached_energy_total_kj`, `cached_*_g`) beschreiben damit eine Normportion.

Die Regel- und Aggregationslogik hält diese Norm derzeit nicht durch:

- `recipe_checks.evaluate_recipe_rules` und `match_recipe_hints` multiplizieren Nährwerte mit `factor = (total_weight_g / 100.0) / servings`. Solange `servings = 1` ist, ist das mathematisch eine Umrechnung von per-100g auf Gesamtportion — aber die `/ servings`-Division ist konzeptionell falsch und bricht, sobald jemand `servings > 1` setzt.
- `nutrition_aggregation._aggregate_meal_values` skaliert mit `nutrient_scale = (total_weight_g / 100.0) / servings` und `price_scale = 1.0 / servings`.
- Es existieren noch Tests mit `servings=2/4/5`, die die falsche Annahme zementieren.
- Die Einkaufszettel-/Kosten-Endpunkte (`planner/api/meal_plan.py`, `planner/schemas/meal_plan.py`) skalieren korrekt mit `norm_portions / servings`, `activity_factor`, `reserve_factor`. Das ist die richtige Stelle für reale Mengen — und genau diese Skalierung darf nicht in die Regelbewertung lecken.

Die fachliche Entscheidung des Nutzers: **Im Rezept gilt die Normportion. In der Mahlzeit wird mit `MealItem.factor` aggregiert. Reale Mengen erst im Einkaufszettel.**

## Goals / Non-Goals

**Goals:**

- Eindeutige, kontextunabhängige Bewertungsbasis: eine Normportion.
- Rezeptregeln werten genau eine Normportion aus (keine `servings`-Division).
- Mahlzeitregeln werten `Σ(Rezept-Normportionwert × MealItem.factor)` aus.
- Tages-/Planregeln aggregieren diese Mahlzeitwerte ohne Personen-/Gruppen-Skalierung.
- `cached_weight_g` und `cached_price_total` als Normportionwerte festschreiben.
- Bestehende Tests auf `servings = 1` und Normportion-Erwartungen umstellen.

**Non-Goals:**

- Keine Änderung an der Einkaufszettel-, Mengen- oder Kosten-Skalierung (`norm_portions`, `activity_factor`, `reserve_factor`, `override_portions`, `day_part_factor`).
- Keine neue Migration oder neues Feld (`cached_weight_g` existiert bereits).
- Keine Schema-Erweiterung (Pydantic/Zod-Strukturen bleiben gleich).
- Keine Entfernung des `servings`-Feldes selbst (Legacy bleibt, wird aber als immer `1` behandelt).
- Keine Auflösung der parallelen Changes `fix-portion-evaluation-bugs` / `extend-food-rule-scopes` — das ist ein separater Aufräumschritt.

## Decisions

### 1. `servings`-Faktor aus der Rezept-Regelbewertung entfernen

`evaluate_recipe_rules` und `match_recipe_hints` rechnen heute `actual_value * factor` mit `factor = (total_weight_g / 100.0) / servings`.

- **Entscheidung**: Der Umrechnungsfaktor wird `total_weight_g / 100.0` (per-100g → Normportion-Gesamtwert). Die `/ servings`-Division entfällt.
- **Begründung**: `cached_*_g`-Werte sind per-100g; eine Normportion hat `total_weight_g` Gramm. Der korrekte Normportionwert ist `value_per_100g * total_weight_g / 100`. Da `servings = 1` gilt, ändert sich numerisch nichts, aber die Formel wird korrekt und robust gegen versehentliche `servings > 1`.
- **`weight_g` / `nutri_class`**: bleiben unskaliert (`weight_g` = Normportion-Gesamtgewicht; `nutri_class` = Qualitätsklasse).
- **Feldbenennung**: `value_per_serving` bleibt als Antwortfeldname, bedeutet jetzt eindeutig „Wert je Normportion".
- **Alternative**: Faktor `/ servings` behalten und überall `servings = 1` erzwingen. Verworfen, weil die Formel dann fragil bleibt und die Absicht verschleiert.

### 2. `servings`-Skalierung aus der Cockpit-/Suggestion-Aggregation entfernen

In `_aggregate_meal_values` gilt heute `nutrient_scale = (total_weight_g / 100.0) / servings`, `price_scale = 1.0 / servings`.

- **Entscheidung**:
  - `nutrient_scale = total_weight_g / 100.0` (per-100g → Normportion).
  - `price`-Beitrag = `cached_price_total * item.factor` (kein `/ servings`).
  - Mahlzeitwert je Rezept = Normportionwert × `item.factor`.
- **Begründung**: `cached_price_total` ist bereits der Normportionpreis. Mahlzeitregeln sollen die fachliche Zusammensetzung über `factor` abbilden, nicht durch Portionsanzahl teilen.
- **Tages-/Planaggregation**: summieren weiterhin Mahlzeitwerte; `nutri_class` bleibt Durchschnitt der vorhandenen Werte.
- **Alternative**: Aggregation auf reale Personenmenge skalieren. Verworfen — das ist Aufgabe des Einkaufszettels.

### 3. Plan-Scope-Regeln nicht durch Personenzahl teilen

`suggestion_service._evaluate_admin_rules` teilt `meal_event`-Werte aktuell durch `num_days` (Durchschnitt pro Tag). Das ist eine zeitliche Normierung, keine Personen-Normierung.

- **Entscheidung**: Die `/ num_days`-Mittelung über Tage bleibt erlaubt (Tagesdurchschnitt in Normportion-Logik). Es darf keine zusätzliche Division durch `norm_portions` / reale Personenzahl geben.
- **Begründung**: „Durchschnitt pro Tag" ist eine fachlich sinnvolle Aggregation und bewegt sich innerhalb der Normportion-Welt. Nur Personen-/Gruppenmengen-Skalierung ist verboten.
- **Alternative**: Auch die Tagesmittelung entfernen. Verworfen, weil Tagesziele (z.B. Energie/Tag) sonst nicht abbildbar wären.

### 4. `servings` als Legacy-Konstante behandeln

- **Entscheidung**: Code, der `recipe.servings` liest, behandelt es als `1`. Wir entfernen das DB-Feld nicht, aber neue Regel-/Aggregationslogik nutzt es nicht mehr als Divisor.
- **Begründung**: Die API erzwingt bereits `servings=1` beim Speichern (`recipe/api/recipes.py`). Feld-Entfernung wäre ein größerer, separater Schritt.

## Risks / Trade-offs

- **[Risk] Bestehende Daten mit `servings > 1`** → Mitigation: API erzwingt `servings=1` bei Create/Update; `normalize_recipe_servings` existiert als Backfill. Neue Formeln nutzen `servings` ohnehin nicht mehr als Divisor, daher ist der Effekt selbst bei Altdaten neutralisiert.
- **[Risk] Verwirrung mit parallelen Changes** (`fix-portion-evaluation-bugs` rechnet noch mit `/ servings`) → Mitigation: Dieser Change ist die maßgebliche Entscheidung; die parallelen Changes sollten danach an Normportion-Logik angeglichen oder archiviert werden (separater Schritt, hier als Open Question vermerkt).
- **[Trade-off] Numerisch identische Ergebnisse bei `servings=1`**: Der sichtbare Effekt ist gering, aber die Formel-Korrektur verhindert künftige Fehlbewertungen und macht die Absicht explizit.

## Migration Plan

1. `recipe_checks.py`: `factor`-Berechnung in `evaluate_recipe_rules` und `match_recipe_hints` auf `total_weight_g / 100.0` ändern (kein `/ servings`).
2. `nutrition_aggregation.py`: `nutrient_scale`/`price_scale` in `_aggregate_meal_values` (Cache- und Fallback-Pfad) auf Normportion-Logik umstellen.
3. `suggestion_service.py`: prüfen, dass nur Tagesmittelung (`/ num_days`) für `meal_event` bleibt, keine Personen-Division.
4. Tests auf `servings=1` umstellen und erwartete Normportion-Werte anpassen.
5. `uv run pytest` als finale Verifikation.

Kein DB-Rollback nötig (keine Migration). Rückbau ist rein codebasiert.

## Open Questions

- Sollen die parallelen Changes `fix-portion-evaluation-bugs` und `extend-food-rule-scopes` nach diesem Change an die Normportion-Logik angeglichen oder archiviert werden? Empfehlung: separater Aufräum-Change.
- Soll `Recipe.servings` mittelfristig ganz entfernt werden? Empfehlung: ja, aber als eigener Breaking-Change.
