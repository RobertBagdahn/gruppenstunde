## 0. Voraussetzungen (Backend-Berechnung)

- [x] 0.1 `NORM_PERSON_DAILY_KCAL = 2335` als benannte Konstante definieren (z.B. `supply/services/norm_person_service.py` oder `supply/data/dge_reference.py`)
- [x] 0.2 Konstante an 3 Stellen referenzieren: `planner/schemas/meal_plan.py:139`, `planner/api/meal_plan.py:669`, `recipe/services/nutrition_aggregation.py:43`
- [x] 0.3 `MealOut.resolve_total_energy_kcal` (`schemas/meal_plan.py:140`): Zutaten-Items einbeziehen (kcal aus `Ingredient.energy_kcal` × Menge_g/100 × factor; ml→g via density)
- [x] 0.4 `MealOut.resolve_total_cost_eur` (`:154`): Zutaten-Items einbeziehen (Preis aus `price_per_kg` × Menge_g/1000 × factor)
- [x] 0.5 `nutrition_aggregation.py:46-82`: Zutaten-Items in alle Nährwert-Summen einbeziehen
- [x] 0.6 `nutrition_aggregation.py:86`: None-Guard ergänzen (`if item.recipe and item.recipe.cached_nutri_class`)
- [x] 0.7 Tests: gemischtes Meal (Rezept + Zutat), reines Zutaten-Meal (kcal/€/Nährwerte korrekt, kein Crash)

## 0b. Standalone-Ingredient-Vereinfachung (Backend + Frontend)

- [x] 0b.1 `standalone_type`-Feld aus `Ingredient`-Modell entfernen: `uv run python manage.py makemigrations supply`
- [x] 0b.2 Pydantic-Schemas bereinigen: `standalone_type` aus `IngredientOut`, `IngredientCreateIn`, `IngredientUpdateIn` in `supply/schemas/ingredients.py` entfernen
- [x] 0b.3 Signal `create_dummy_recipe_for_standalone_food` aus `supply/signals.py:20` entfernen
- [x] 0b.4 Management Command `migrate_standalone_to_ingredient_items`: konvertiert MealItems mit Dummy-Rezept (recipe_type='ingredient') zu ingredient-MealItems, löscht verwaiste Dummy-Rezepte — idempotent
- [x] 0b.5 Suchendpunkt `meal_plan.py:1540`: `standalone_type`-Filter entfernen, `is_standalone_food=True` bedingungslos filtern
- [x] 0b.6 Neuer Portionsauswahl-Dialog (`IngredientPortionDialog.tsx`) in `src/pages/planning/`: zeigt Portionsliste der Zutat, Default vorausgewählt, erstellt ingredient-MealItem bei Bestätigung
- [x] 0b.7 `RecipeSearchDialog.tsx`: Standalone-Zutaten in gemischter Liste mit Recipe-Items; Klick auf Zutat → Portionsauswahl-Dialog statt direktem Hinzufügen
- [x] 0b.8 `MealSlot.tsx`: ingredient-MealItems mit Badge "Zutat" darstellen, sonst identisch zu Rezept-Items
- [x] 0b.9 Zod-Schemas: `standalone_type` entfernen, Portionsauswahl-Request/Response ergänzen — synchron zu Pydantic
- [x] 0b.10 Einkaufsliste verifizieren: `supply/services/shopping_service.py:189` deckt ingredient-MealItems bereits ab (kein neuer Code, nur Integrations-Test)
- [x] 0b.11 Tests: Bereinigung idempotent, Suchendpunkt ohne standalone_type, MealItem mit Portion, Zutat-Badge im Frontend (Snapshot/E2E optional)

## 1. Daten & Seed (Backend, supply)

- [x] 1.1 BE-Modellierung entscheiden: Konvention (ganze Brötchen als eigene Zutat mit 2 BE) vs. neues Feld `breakfast_units_per_piece` — Entscheidung in design.md Open Questions auflösen
- [x] 1.2 Falls Feld nötig: Migration in `supply` erstellen (`uv run python manage.py makemigrations supply`)
- [x] 1.3 Seed-Command für Basis-Zutaten: Tag "frühstücks-basis", `standard_recipe_weight_g` (Scheibengewicht), BE/Stück (Bauernbrot, Toastbrot, Stuten, Körnerbrot, Brötchen, ½ Brötchen, Müsli, Cornflakes, Porridge, Overnight Oats) — idempotent
- [x] 1.4 Seed-Command für Belag-Zutaten: je Zutat Portionen "Belag knapp", "Belag normal" (Default), "Belag üppig" und "Packung" mit `weight_g`; `price_per_kg` setzen — idempotent
- [x] 1.5 `seed_breakfast_recipes` auf warme Gerichte reduzieren (Rührei, Pfannkuchen); Brot+Belag-, Cerealien- und Getränke-Mini-Rezepte entfernen
- [x] 1.6 Tests für Seed-Commands (idempotent, korrekte Portionen/Tags)

## 2. Backend-API (planner + supply)

- [ ] 2.1 Endpunkt `GET /api/supply/breakfast-catalog/`: Basis-Zutaten (Scheibengewicht, BE/Stück) + Belag-Zutaten (Intensitäts-Portionen, Packung, price_per_kg), gruppiert nach Kategorie
- [ ] 2.2 Pydantic-Schemas für den Katalog (Basis, Belag mit Portionen)
- [ ] 2.3 Reste-Endpunkt `POST /api/meal-plans/{id}/breakfast-leftovers/`: nimmt Belag-Mengen/Person + norm_portions + Tage, liefert pro Belag Bedarf (g), Packungen, Rest (g), Restwert (€)
- [ ] 2.4 Pydantic-Schemas für Reste-Endpunkt (Request + Response)
- [ ] 2.5 RefMeal-Response liefert `day_part_factor` für die Soll-Rechnung (prüfen, bereits vorhanden)
- [ ] 2.6 Tests: Katalog-Endpunkt (Happy-Path + 403), Reste-Endpunkt (Packungsrundung, Rest in g/€)

## 3. Frontend-Datenschicht (frontend-food)

- [ ] 3.1 Zod-Schemas für Katalog, Wizard-State (Basis/Belag/Extras/Getränke) und Reste-Response — synchron zu Pydantic
- [ ] 3.2 TanStack-Query-Hook für `breakfast-catalog`
- [ ] 3.3 Hook/Query für Reste-Endpunkt
- [ ] 3.4 Hook/Mutation zum Speichern des Wizard-Ergebnisses als RefMeal + MealItems
- [ ] 3.5 Rechen-Utilities (Frontend): BE↔Gramm↔kcal, Belag-Deckung, Milch-Merge, Normalisieren (Reste kommen vom Backend)

## 4. Wizard-UI (frontend-food)

- [ ] 4.1 Wizard-Gerüst `src/pages/planning/breakfast/` mit Schritt-Navigation und Wizard-State-Hook
- [ ] 4.2 Wiederverwendbarer Schieberegler mit Auto-Rebalance + Lock-Icon (Summe 100%)
- [ ] 4.3 Schritt 1 Basis: BE/Person + Sortenverteilung + Gramm/kcal-Anzeige
- [ ] 4.4 Schritt 2 Belag: globaler Intensitäts-Schalter, Sortenverteilung, Belag-Deckungs-Check, Sortenwarnung ab 3 Sorten
- [ ] 4.5 Schritt 3 Extras: Gemüse (Mengen) + warme Gerichte (Rezeptauswahl + Faktor)
- [ ] 4.6 Schritt 4 Getränke: Anteile Kaffee/Kakao/Tee + Milch-Zusammenrechnung
- [ ] 4.7 Abschluss-Cockpit: alle Doppelchecks, Transparenz-Tabelle (Menge/Gewicht/kcal/Anteil), Reste-Tabelle (g + €), Hochrechnung × Personen × Tage, SollIstBar
- [ ] 4.8 "Normalisieren" verdrahten (Basis+Belag+Getränke skalieren, Extras fix, Deckung erhalten)

## 5. Einstieg & Integration

- [ ] 5.1 `RefMealEditorPage` für Frühstück: "Referenz-Mahlzeit erstellen" öffnet Wizard statt direktem `createRefMeal`; harte 2400-kcal-Konstante entfernen
- [ ] 5.2 "Frühstücksassistent"-Button für vorhandenes Frühstücks-RefMeal (Wizard vorausgefüllt aus MealItems)
- [ ] 5.3 State-Rekonstruktion aus vorhandenen MealItems (Mengen → Verteilungen/Intensität ableiten)

## 6. Validierung & Doku

- [ ] 6.1 Mobile-First prüfen (320px) für alle Schritte und Cockpit
- [ ] 6.2 `openspec validate breakfast-wizard --strict` bestehen
- [ ] 6.3 AGENTS.md (Food) um Wizard-Konventionen (Basis-Tag, Belag-Portionen, BE) ergänzen
- [ ] 6.4 Manuelle Verifikation an `/meal-plans/:id/ref-meals/breakfast` (Erstellen, Speichern, Wiederöffnen)
