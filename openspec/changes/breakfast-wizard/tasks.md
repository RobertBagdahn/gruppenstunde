## 1. Daten & Seed (Backend, supply)

- [ ] 1.1 BE-Modellierung entscheiden: Konvention (ganze Brötchen als eigene Zutat mit 2 BE) vs. neues Feld `breakfast_units_per_piece` — Entscheidung in design.md Open Questions auflösen
- [ ] 1.2 Falls Feld nötig: Migration in `supply` erstellen (`uv run python manage.py makemigrations supply`)
- [ ] 1.3 Seed-Command für Basis-Zutaten: Tag "frühstücks-basis", `standard_recipe_weight_g` (Scheibengewicht), BE/Stück (Bauernbrot, Toastbrot, Stuten, Körnerbrot, Brötchen, ½ Brötchen, Müsli, Cornflakes, Porridge, Overnight Oats) — idempotent
- [ ] 1.4 Seed-Command für Belag-Zutaten: je Zutat Portionen "Belag knapp", "Belag normal" (Default), "Belag üppig" und "Packung" mit `weight_g`; `price_per_kg` setzen — idempotent
- [ ] 1.5 `seed_breakfast_recipes` auf warme Gerichte reduzieren (Rührei, Pfannkuchen); Brot+Belag-, Cerealien- und Getränke-Mini-Rezepte entfernen
- [ ] 1.6 Tests für Seed-Commands (idempotent, korrekte Portionen/Tags)

## 2. Backend-API (planner + supply)

- [ ] 2.1 Endpunkt `GET /api/supply/breakfast-catalog/`: Basis-Zutaten (Scheibengewicht, BE/Stück) + Belag-Zutaten (Intensitäts-Portionen, Packung, price_per_kg), gruppiert nach Kategorie
- [ ] 2.2 Pydantic-Schemas für den Katalog (Basis, Belag mit Portionen)
- [ ] 2.3 RefMeal/MealItem: `ingredient_id` + Gramm/ml-Menge unterstützen (Schema + Create/Update prüfen)
- [ ] 2.4 Soll-Berechnung über `NORM_PERSON_DAILY_KCAL × day_part_factor` im RefMeal-Response bereitstellen
- [ ] 2.5 Tests: Katalog-Endpunkt (Happy-Path + 403), MealItem mit ingredient_id, gemischte Items

## 3. Frontend-Datenschicht (frontend-food)

- [ ] 3.1 Zod-Schemas für Katalog, Wizard-State (Basis/Belag/Extras/Getränke) und Reste-Berechnung — synchron zu Pydantic
- [ ] 3.2 TanStack-Query-Hook für `breakfast-catalog`
- [ ] 3.3 Hook/Mutation zum Speichern des Wizard-Ergebnisses als RefMeal + MealItems
- [ ] 3.4 Rechen-Utilities: BE↔Gramm↔kcal, Belag-Deckung, Packungsrundung + Rest in g/€, Milch-Merge, Normalisieren

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
