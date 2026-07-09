## Context

Die Nährwertberechnung für Rezepte erfolgt über zwei unabhängige Code-Pfade:

```
Path A: Cache (get_recipe_nutritional_values → recalculate_recipe_cache)
  └─ Liefert per-100g Werte → cached_energy_kcal, cached_energy_total_kcal
  └─ Genutzt für: RecipeList, RecipeDetail, Vorschau-Dialoge, Druckansicht

Path B: Breakdown API (GET /api/recipes/{id}/nutrition-breakdown/)
  └─ Liefert total + per-serving + per-100g + per-item Beiträge
  └─ Genutzt für: NutritionTab (Inhaltsstoffe), ContributionPanels
```

Beide Pfade teilen sich die gleiche Gewichtsberechnungslogik, aber mit subtilen Unterschieden.

## Goals / Non-Goals

**Goals:**
- Korrekte Gewichtsberechnung für Volumen-basierte Zutaten (unter Einbezug von `physical_density`)
- Konsistente per-serving Darstellung in Vorschau-Dialogen und Druckansicht
- Konsistente Summen zwischen per-item Beiträgen und Kachelwerten
- N+1 Query Eliminierung im Cache-Pfad
- Tests für alle Fixes

**Non-Goals:**
- Kein Eingriff in die Mahlzeiten-Aggregation (`nutrition_aggregation.py`) — dort ist die Dichte-Berechnung bereits korrekt
- Keine Änderung des Nutri-Score Algorithmus
- Keine Datenmigration (nur Logik-Änderungen)

## Decisions

### Decision 1: Density-Aware Weight Calculation

**Problem:** Sowohl Cache als auch Breakdown API ignorieren `ingredient.physical_density` bei Volumen-Einheiten (EL, Tasse, ml). Der MeasuringUnit-Konvertierungsfaktor (`unit.quantity`) geht von Wasser-Dichte (1 g/ml) aus.

**Lösung:** Extrahiere die Gewichtsberechnung in eine gemeinsame Hilfsfunktion, die density berücksichtigt:

```python
def _calculate_item_weight_g(item: RecipeItem) -> float:
    portion = item.portion
    if not portion:
        return 0.0
    if portion.weight_g:
        return item.quantity * portion.weight_g
    if portion.measuring_unit:
        raw = item.quantity * portion.quantity * portion.measuring_unit.quantity
        ingredient = portion.ingredient
        if ingredient and portion.measuring_unit.unit == "VOLUME":
            density = getattr(ingredient, "physical_density", 1.0) or 1.0
            raw *= density
        return raw
    return 0.0
```

**Alternativen verworfen:**
- MeasuringUnit-spezifische Dichte-Tabelle → zu komplex, wartbarer via ingredient.physical_density
- Nur für ml-Einheiten → inkonsistent, EL/Tasse brauchen gleiche Behandlung

### Decision 2: Fix per-serving vs total in Contribution Panel

**Problem:** Der Breakdown-API response enthält per-item `energy_kcal` als TOTAL-Werte, aber das UI zeigt sie unter "Zutaten-Beiträge pro Portion". Bei `portions > 1` stimmen die Summen nicht mit der `per_serving_energy_kcal`-Kachel überein.

**Lösung:** Teile per-item values durch `portions` bevor sie ans Frontend gehen.

### Decision 3: Fix Vorschau-Dialoge

**Problem:** `RecipePreviewDialog`, `RecipePreviewInline`, `RecipePrintPage` verwenden `cached_energy_kcal` (per-100g) direkt als "kcal" — ohne Konvertierung zu per-serving.

**Lösung:** Stattdessen `cached_energy_total_kcal / portions` verwenden. Fallback auf `null` wenn Cache fehlt.

### Decision 4: Rounding-Konsistenz

**Problem:** Breakdown API rundet per-item Beiträge auf 1 Dezimalstelle (für Display), summiert aber ungerundete Werte für totals. Die Contributions zeigen `absolute` aus gerundeten Werten → minimale Inkonsistenz.

**Lösung:** Verzichte auf per-item Rounding im Backend; lass das Frontend runden.

### Decision 5: N+1 Query Fix

**Problem:** `get_recipe_nutritional_values` verwendet `.select_related("portion", "portion__ingredient")` ohne `"portion__measuring_unit"`. Items mit measuring_unit-basierten Portionen erzeugen eine zusätzliche Query pro Item.

**Lösung:** Füge `"portion__measuring_unit"` zum select_related hinzu.

## Risks / Trade-offs

- **BREAKING**: Bestehende Cache-Werte ändern sich nach Neuberechnung — Rezepte mit Volumen-Zutaten bekommen andere Nährwerte (korrektere). Kein Risiko, da Rückwärtskompatibilität nicht erforderlich.
- **physical_density nicht gepflegt**: Wenn viele Ingredients `physical_density = 1` (Default) haben, bringt der Fix wenig. Aber er ist dennoch korrekt für die, die es haben.
- **Density bei VOLUME vs MASS**: Wir müssen unterscheiden, ob das measuring_unit Volumen (ml, l) oder Masse (g, kg) repräsentiert. `MeasuringUnitType` existiert bereits.
