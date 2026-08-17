## Context

Der Frühstücksassistent erzeugt MealItems für den MealPlan. Aktuell speichert er `quantity = Pro-Person-Gramm` und `factor = normPortions`. Das führt zu verwirrender Darstellung (`×18g ×10,00`) und ist inkonsistent zu Rezept-Items, die `effectivePortions` intern im Backend verrechnen.

Ziel: Zutaten-Items und Rezept-Items gleich behandeln — beide skalieren über `effectivePortions`. Der Wizard speichert reine Pro-Person-Werte (Anteile), der Backend skaliert auf die Gesamtmenge.

## Goals / Non-Goals

**Goals:**
- `resolve_ingredient_energy_kcal` und `resolve_ingredient_cost_eur` multiplizieren mit `effectivePortions` — analog zur Rezept-Formel
- Wizard `buildItems()`: `quantity = sharePercent/100` (Pro-Person-Anteil in Portionen), `factor = 1.0`
- Wizard speichert mit Portions-Einheiten statt rohem "g"
- Portions-Display im MealPlan: `×1,4 Scheiben (25g)`
- Getränke von Frühstücks-Coverage ausgeschlossen
- Kosten für Zutaten-Items sichtbar (Bugfix `resolve_cost_eur`)
- Seed + API erstellen fehlende Portionen automatisch
- Pro-Person-Portionen im MealPlan editierbar (z.B. "0.14 → 0.5 Scheiben/Person")

**Non-Goals:**
- Keine Änderung an der Struktur von MealItems (keine neuen DB-Felder)
- Keine Migration existierender Daten
- Cockpit-Visualisierung bleibt unverändert (zeigt weiter Pro-Person)
- Warme Gerichte und Getränke-Rezepte unverändert (`factor` = Rezeptskalierung)

## Decisions

### 1. Backend: effectivePortions in Zutaten-Berechnung

**Entscheidung:** `resolve_ingredient_energy_kcal` und `resolve_ingredient_cost_eur` erhalten einen `effective_portions`-Parameter (default: 1.0, backward-safe für direkte Aufrufe). `MealItemOut` und `MealOut` übergeben `obj.meal.effective_portions`.

**Alternative:** Wizard multipliziert selbst (quantity × normPortions). Verworfen weil: inkonsistent zu Rezepten, keine automatische Skalierung bei Plan-Änderung, Wizard muss normPortions kennen.

**Rationale:** Rezepte rechnen bereits `× effectivePortions` intern. Gleiche Logik für Zutaten macht das System konsistent und trennt Pro-Person-Logik (Wizard) von Gesamtberechnung (Backend).

### 2. Wizard: quantity = sharePercent/100, factor = 1.0

**Entscheidung:** `buildItems()` rechnet nicht mehr mit normPortions. `quantity = sharePercent/100` (z.B. 0.14 für 14%), `factor = 1.0`.

**Formeln:**
```
Basis:           quantity = sharePercent/100
Belag:           quantity = sharePercent/100
Extras:          quantity = gramsPerPerson (in Portionen)
Getränke:        quantity = totalMl / portionMl  (z.B. 600 / 200 = 3 Tassen)
Milch:           quantity = totalMilkMl / 30  (in "Schuss")
Warme Gerichte:  factor = userSetting  (unverändert)
```

**Rationale:** Der Wizard "denkt" pro Person. sharePercent IST der Pro-Person-Anteil. Kein normPortions im Code. Der Backend macht aus 0.14 × effectivePortions(10) = 1.4 Portionen.

### 3. Portions-Einheiten statt "g"

**Entscheidung:** Basis → "Scheibe", Belag → Intensitätsname ("Belag normal"), Getränke → "Tasse (200ml)", Milch → "Schuss (30ml)".

**MeasuringUnit-Modellierung:**
- `MeasuringUnit("Scheibe", gram_equivalent=None)` — Name-only Einheit, Gewicht kommt von Portion
- `MeasuringUnit("Tasse (200ml)", gram_equivalent=None)` — ml-Aquivalent
- `MeasuringUnit("Schuss (30ml)", gram_equivalent=None)`

Jede Zutat bekommt eine `Portion(ingredient, measuring_unit, name, weight_g)`. Die Portion ist die Brücke zwischen Einheitsname und physikalischem Gewicht.

**Portionserkennung im Display:** `MealItemOut` findet die passende Portion via `item.ingredient + item.measuring_unit` → `Portion.objects.filter(ingredient=..., measuring_unit=...).first()`. Daraus: `portion.name` und `portion.weight_g`.

### 4. quantity_g Feld

**Entscheidung:** `MealItemOut.resolve_quantity_g(obj) = portion.weight_g × obj.quantity × effective_portions` für ingredient-Items. Für recipe-Items: `recipe.cached_* × factor × effective_portions / portions` (existierende Logik).

**Rationale:** Kein DB-Feld nötig. Berechnet zur Laufzeit. `quantity_g` ist das Gesamtgewicht (für alle Personen) — konsistent zu `energy_kcal` und `cost_eur`, die auch Gesamtwerte sind.

### 5. Portions-Anzeige im MealSlot

**Entscheidung:** Format `×{quantity} {portion_name} ({quantity_g}g)` für ingredient-Items. Wenn keine Portion gefunden: `×{quantity_g}g` (Fallback).

Beispiel: `×1,4 Scheiben (25g)` bei quantity=1.4, portion.name="Scheibe", quantity_g=25

### 6. Getränke von Coverage ausgeschlossen

**Entscheidung:** `totalKcalPerPerson()` in `breakfastCalc.ts` summiert nur `basis + topping + extras` (keine `drinks`). `energyTargetKcal()` bleibt `NORM_PERSON_DAILY_KCAL × dayPartFactor` (584 kcal). Cockpit-Balken und Soll-Ist basieren nur auf Basis+Belag+Extras.

**Normalisieren:** Nur `bePerPerson` wird skaliert. Getränke-Mengen bleiben unverändert.

### 7. Portion-Auto-Anlage

**Entscheidung:** `POST /wizard-items/` prüft für jede `ingredient_id`: Hat die Zutat eine Portion mit dem angeforderten `measuring_unit_id`? Falls nicht → idempotent anlegen (Portion name = measuring_unit name, weight_g aus Catalog/Ingredient-Daten).

**Seed:** `seed_breakfast_recipes` erweitert um Portions-Anlage für ALLE Basis- und Belag-Zutaten.

### 8. Cost-Fix

**Entscheidung:** `MealItemOut.resolve_cost_eur` ruft für ingredient-Items `resolve_ingredient_cost_eur(item)` auf (mit effectivePortions). Analog zu `resolve_energy_kcal`.

### 9. Quantity-Edit im MealSlot

**Entscheidung:** Im MealSlot wird der FactorInput für ingredient-Items durch einen QuantityInput ersetzt. Statt `factor` (der immer 1.0 ist) editiert der Nutzer `quantity` — die Anzahl Portionen pro Person.

**UX:**
```
Aktuell:                        Neu:
┌──────────────────────┐        ┌──────────────────────┐
│ Bauernbrot  Zutat    │        │ Bauernbrot  Zutat    │
│ 6,5 kcal             │        │ 6,5 kcal             │
│ ×0,14      [×1,00]  │        │ ×0,14     [×0,14]   │
└──────────────────────┘        └──────────────────────┘
  FactorInput (sinnlos)           QuantityInput (editiert quantity)
```

**Backend:** `PATCH /api/meal-plans/{id}/meal-items/{itemId}/` akzeptiert `{ quantity: float | null }` (zusätzlich zum bestehenden `factor`). Nach dem Update wird `item.quantity` geändert, die Energie/Kosten passen sich automatisch an (berechnet im Resolver beim nächsten Read).

**Schema:** `MealItemUpdateIn` erhält `quantity: float | None = None`.

**Abgrenzung:** Der QuantityInput erscheint NUR für ingredient-Items (`item.ingredient_id && !item.recipe_id`). Für recipe-Items (warme Gerichte, Getränke) bleibt der FactorInput für `factor`.

**Rationale:** Da `quantity` jetzt "Portionen pro Person" bedeutet, ist das Editieren direkt an der Stelle wo der Nutzer sie sieht (MealSlot) die natürlichste Interaktion.

## Risks / Trade-offs

**[Risk] Breaking für existierende ingredient-Items:** Wenn ein Plan existierende Zutaten-Items hat, die VOR diesem Change mit `factor=10, quantity=18g` angelegt wurden, ist die Energie nach dem Change 10× zu hoch (weil `effectivePortions` jetzt doppelt einfließt).  
→ **Mitigation:** Projekt ist in aktiver Entwicklung, keine Produktionsdaten. Lokale/dev-Daten werden nach dem Change neu angelegt.

**[Risk] Portions-Lookup schlägt fehl:** Wenn eine Zutat keine passende Portion hat, hat `MealItemOut` keinen `portion_name` und kein `quantity_g`.  
→ **Mitigation:** Seed + Auto-Anlage im Wizard-Endpoint stellen sicher, dass alle verwendeten Zutaten Portionen haben. Fallback: zeige `quantity_g` aus Gramm-Berechnung der MeasuringUnit.

**[Risk] Portion-Namen kollidieren:** "Scheibe" könnte für verschiedene Brote unterschiedliche Gewichte haben.  
→ **Mitigation:** Korrekt — jedes Brot hat eine EIGENE Portion "Scheibe" mit seinem `standard_recipe_weight_g`. Portionen sind pro ingredient + measuring_unit unique.

**[Risk] Getränke nicht in Coverage:** Nutzer wundert sich, warum Getränke-Kcal nicht zählen.  
→ **Mitigation:** Klare Trennung im Cockpit (Separator "Getränke" mit eigener Zeile, aber ohne Coverage-Einfluss). Tooltip erklärt "Getränke werden nicht zum Frühstücks-Soll gezählt".
