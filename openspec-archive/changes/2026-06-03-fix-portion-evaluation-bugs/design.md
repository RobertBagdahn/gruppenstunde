## Context

Auf der Rezept-Detailseite und in den Menüplan-Cockpit-Aggregationen werden Rezepte und deren Nährwerte fälschlicherweise auf 100g-Basis bewertet bzw. aufsummiert anstatt auf Portionsbasis. Da die DGE-Referenzregeln absolute Portions-Sollwerte vorgeben, führt dies zu fehlerhaften Bewertungen (z.B. rote Ampelfarben für proteinreiche Rezepte) und massiv verzerrten Nährwert-Aggregationen im Menüplan-Cockpit und bei automatischen Empfehlungen.

Zusätzlich tritt bei der Rezept-Regelauswertung der Bug auf, dass der Score-Wert für `nutri_class` (1.0-5.0) fälschlicherweise mit dem Portionsskalierungsfaktor multipliziert wird, wodurch die korrekte A–E-Mapping-Anzeige zerstört wird.

## Goals / Non-Goals

**Goals:**
- Portionsbasierte Auswertung aller Rezeptregeln auf der Detailseite (Wert pro 100g × Gesamtgewicht / 100 / Portionen).
- Portionsbasierte (pro Person) Aggregation aller Nährwerte im Cockpit (Mahlzeiten-, Tages- und Planebene).
- Performante und N+1-sichere Berechnung durch Denormalisierung des Rezept-Gesamtgewichts (`cached_weight_g`).
- Korrektur des `nutri_class` Skalierungs-Bugs.
- 100%ige Testabdeckung für die korrigierten Logiken.

**Non-Goals:**
- Änderungen an den eigentlichen API-Schemas (Pydantic / Zod) – die JSON-Strukturen bleiben identisch, nur die berechneten Werte werden korrigiert.
- Überarbeitung der UI-Komponenten im Frontend.

## Decisions

### 1. Feld `cached_weight_g` im `Recipe`-Model ergänzen
- **Entscheidung**: Wir fügen das Feld `cached_weight_g` (FloatField, nullable) dem `Recipe`-Modell hinzu.
- **Begründung**: Bei der Aggregation im Cockpit für einen gesamten Menüplan werden viele Rezepte geladen. Ohne ein gecachtes Feld für das Gesamtgewicht müsste für jedes Rezept eine N+1-Abfrage auf alle `RecipeItem`s durchgeführt werden, was die Ladezeit des Cockpits drastisch verschlechtern würde.
- **Alternativen**:
  - *Dynamische Berechnung bei jeder Anfrage*: Führt zu extremen N+1-Abfragen beim Laden des Menüplan-Cockpits.
  - *Mengen/Gewichte im MealItem selbst speichern*: Erhöht die Redundanz und macht Änderungen an Rezepten im Cockpit nicht sofort wirksam.

### 2. Portionsbasierte Auswertung in `evaluate_recipe_rules` und `match_recipe_hints`
- **Entscheidung**: Die Auswertung von Regeln erfolgt auf Basis von `value_per_serving`. Für alle Parameter außer `nutri_class` und `weight_g` wird der per-100g-Wert mit dem Faktor `(total_weight_g / 100.0) / servings` multipliziert, bevor er an `rule.evaluate(val)` übergeben wird.
- **Begründung**: Dadurch werden die absoluten Portionsgrenzen der DGE-Regeln korrekt eingehalten.
- **Alternativen**:
  - *Regeln in der DB anpassen*: Nicht möglich, da die Sollwerte (z.B. >= 30g Protein) absolute Portionen darstellen und nicht sinnvoll auf 100g-Dichte umgerechnet werden können.

### 3. Behebung des Nutri-Klassen-Skalierungs-Bugs
- **Entscheidung**: `nutri_class` und `weight_g` werden explizit von der Multiplikation mit dem Portionsskalierungsfaktor ausgeschlossen.
- **Begründung**: `nutri_class` repräsentiert eine Qualitätsklasse (1.0 - 5.0) und darf niemals skaliert werden. `weight_g` ist bereits ein absoluter Gewichtswert und kein Nährwert pro 100g.

### 4. Aggregation im Cockpit anpassen
- **Entscheidung**: In `_aggregate_meal_values` in `nutrition_aggregation.py` berechnen wir den `portion_scale` pro Rezept:
  ```python
  total_weight_g = recipe.cached_weight_g or 0.0
  servings = recipe.servings or 1
  portion_scale = (total_weight_g / 100.0) / servings
  ```
  Der Nährwertbeitrag für das Meal wird dann mit `portion_scale * item.factor` multipliziert.
- **Begründung**: Dies stellt sicher, dass das Cockpit echte Werte pro Person anzeigt, skaliert nach der geplanten Portionsgröße des Essens.

## Risks / Trade-offs

- **[Risk] Unvollständiger Cache-Backfill führt zu fehlerhaften Aggregationen im Cockpit**
  - *Mitigation*: Nach Ausführen der Migration führen wir das Management-Command `recalculate_recipe_caches` aus, um alle Rezepte in der Datenbank zu aktualisieren. Zusätzlich fangen wir in der Aggregation `cached_weight_g is None` ab und berechnen es im Fallback-Pfad (ohne Cache) dynamisch.
