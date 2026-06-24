## Why

Frühstück ist das am schwersten planbare Essen im Pfadfinderlager ("das Horror-Ding zum Plan"). Es lässt sich nicht sinnvoll als einzelnes Rezept abbilden, und das Kernproblem ist die Spannung zwischen Auswahl (Wertschätzung) und Resten (angebrochene Packungen, schwer kalkulierbarer Aufschnitt). Statt hunderter Kombi-Rezepte ("Bauernbrot mit Käse", "Toast mit Käse", …) braucht es einen strukturierten Wizard, der Basis und Belag dynamisch kombiniert und die entstehenden Reste transparent in Gramm und Euro sichtbar macht.

## What Changes

- **Frühstücks-Wizard** als neuer geführter Prozess auf der Route `/meal-plans/:id/ref-meals/breakfast`. Der Button "Referenz-Mahlzeit erstellen" öffnet den Wizard statt direkt ein leeres RefMeal zu erzeugen. **BREAKING**: Der bisherige Rezept-Baukasten in `RefMealEditorPage` wird für Frühstück durch den Wizard ersetzt.
- **Dynamische Basis⊗Belag-Kombination** statt Kombi-Rezepten: Basis-Sorten (Brot/Brötchen/Müsli) und Belag-Sorten werden unabhängig konfiguriert und zur Laufzeit verrechnet. Grundregel: **1 Belag-Portion deckt genau 1 Brot-Einheit (BE)**; 1 Scheibe = 1 BE, ½ Brötchen = 1 BE, ganzes Brötchen = 2 BE.
- **Belag-Intensität** (Knapp/Normal/Üppig) als globaler Schalter — je Belag-Zutat über drei Portionen ("Belag knapp/normal/üppig") definiert, mit Gramm-Default für "normal".
- **Reste-Transparenz**: Je Belag-Zutat wird eine Portion "Packung" hinterlegt. Der Wizard rechnet den Gesamtbedarf (`norm_portions` × verknüpfte Tage × Pro-Person-Menge) auf ganze Packungen hoch und zeigt Rest in Gramm und Euro.
- **Schieberegler mit Auto-Rebalance + Lock**: Sortenverteilung je Kategorie über Schieberegler; ungesperrte Sorten passen sich proportional an, gesperrte (Lock-Icon) bleiben fix; Summe immer 100%.
- **4 Schritte + Abschluss-Cockpit**: (1) Basis, (2) Belag, (3) Extras (Gemüse + warme Gerichte als Rezept), (4) Getränke (Anteile, Milch wird über alle Verwendungen zusammengerechnet). Cockpit zeigt alle Doppelchecks und eine Transparenz-Tabelle.
- **Doppelchecks**: Belag-Deckung vs. Basis-BE (warnen, erlauben), Energie Ist/Soll als Ampel, Sortenwarnung ab 3 Sorten pro Kategorie, Verteilungssumme = 100%.
- **Soll-Andockung**: Energie-Soll = Norm-Person-Tageskalorien (2335) × `day_part_factor`; nicht mehr die hart kodierten 2400 kcal im Frontend. Der Wert 2335 ist heute an drei Backend-Stellen als Magic Number kodiert und wird zu einer benannten Konstante `NORM_PERSON_DAILY_KCAL` extrahiert. "Normalisieren" skaliert Basis + Belag + Getränke (Belag-Deckung bleibt erhalten), Gemüse/Extras bleiben fix.
- **Ingredient-Items zählen mit (Voraussetzung)**: Die Nährwert-/Energie-/Kostenberechnung berücksichtigt heute nur `MealItem.recipe` und ignoriert `MealItem.ingredient` (Einzelzutaten = 0 kcal/0 €); `nutrition_aggregation.py` würde bei Ingredient-Items zudem crashen (`item.recipe.cached_nutri_class` ohne None-Guard). Da der Wizard Basis/Belag/Gemüse/Getränke als Ingredient-Items speichert, MUSS diese Lücke geschlossen werden: kcal aus `Ingredient.energy_kcal` × Menge/100g, Preis aus `price_per_kg`, Nährwerte analog. **Voraussetzung für alle Wizard-Berechnungen.**
- **Standalone-Ingredient-Vereinfachung** (gleichzeitig mit diesem Change): Das bisherige `is_standalone_food`-Signal erzeugte automatisch Dummy-Rezepte, damit roh verzehrbare Zutaten (Apfel, Müsliriegel) dem Essensplan hinzugefügt werden konnten. Da MealItem `ingredient_id` direkt unterstützt, entfällt diese Umgehungslösung. **BREAKING**: `standalone_type`-Feld wird entfernt (Migration). Das Signal `create_dummy_recipe_for_standalone_food` wird gelöscht. Bestehende Dummy-Rezepte (recipe_type='ingredient') werden per Management Command zu ingredient-MealItems konvertiert. `is_standalone_food` bleibt als Qualitätsmerkmal und Filter erhalten. Im Meal-Plan-Suchdialog erscheinen Standalone-Zutaten direkt (gemischte Liste mit Rezepten, Typ-Badge "Zutat"); ein Portionsauswahl-Dialog ermöglicht das Hinzufügen mit der gewünschten Portion.
- **Speichern am Ende**: RefMeal + MealItems werden erst beim Abschluss erstellt (`createRefMeal` + Items als `ingredient_id`/`recipe_id` + Gramm-Menge). Bei vorhandenem RefMeal öffnet ein "Frühstücksassistent"-Button den Wizard vorausgefüllt.

## Capabilities

### New Capabilities
- `breakfast-wizard`: Der geführte 4-Schritt-Prozess zur Frühstücksplanung — dynamische Basis⊗Belag-Kombination, Belag-Intensität, Schieberegler mit Auto-Rebalance/Lock, Doppelchecks, Reste-Transparenz und Abschluss-Cockpit.
- `standalone-ingredient`: Roh verzehrbare Zutaten (`is_standalone_food=True`) können direkt als MealItem (ohne Dummy-Rezept) dem Essensplan hinzugefügt werden — mit Portionsauswahl-Dialog und Typ-Badge in der Suche.

### Modified Capabilities
- `ref-meal`: Der Frühstücks-Einstiegspunkt erstellt das RefMeal künftig erst am Ende des Wizards. Zentral: Die Energie-/Kosten-/Nährwertberechnung von MealItems MUSS Ingredient-Items berücksichtigen (heute nur Rezepte). Das `ingredient_id`-Feld selbst existiert bereits (`MealItem`, `RefMealItemIn`, API) — geändert wird das Berechnungsverhalten, nicht das Datenmodell.
- `breakfast-seed-recipes`: Wird auf warme Frühstücksgerichte (Rührei, Pfannkuchen) reduziert. Brot+Belag werden nicht mehr als Kombi-Mini-Rezepte angelegt, sondern dynamisch aus Zutaten kombiniert.

## Impact

- **Frontend (`frontend-food/`)**:
  - `src/pages/planning/RefMealEditorPage.tsx` — Einstieg ändert sich (Wizard statt Baukasten für Frühstück)
  - Neue Wizard-Komponenten unter `src/pages/planning/breakfast/` (Steps + Cockpit)
  - `src/pages/planning/RecipeSearchDialog.tsx` — Standalone-Zutaten in gemischter Liste mit Typ-Badge; neuer Portionsauswahl-Dialog
  - `src/pages/planning/MealSlot.tsx` — ingredient-MealItems mit Zutat-Badge darstellen
  - Neue/erweiterte Zod-Schemas für Wizard-State, Reste-Berechnung und Portionsauswahl
  - TanStack-Query-Hooks für Basis-/Belag-Zutaten und RefMeal-Speicherung
- **Backend (`backend/`)**:
  - `planner` + `recipe` — **Energie/Kosten/Nährwerte für Ingredient-Items**: `MealOut.resolve_total_energy_kcal` (`schemas/meal_plan.py:140`), `resolve_total_cost_eur` (`:154`) und `nutrition_aggregation.py:46-88` (inkl. None-Guard-Fix bei `:86`).
  - `recipe`/`supply` — `NORM_PERSON_DAILY_KCAL = 2335` als benannte Konstante extrahieren und an den 3 Stellen (`schemas/meal_plan.py:139`, `api/meal_plan.py:669`, `nutrition_aggregation.py:43`) referenzieren.
  - `supply` — **BREAKING**: `standalone_type`-Feld entfernen (Migration `supply`); Signal `create_dummy_recipe_for_standalone_food` (`supply/signals.py:20`) entfernen; Management Command `migrate_standalone_to_ingredient_items` zur Konvertierung bestehender Dummy-Rezepte.
  - `supply` — Konvention auf bestehenden Modellen: Basis-Tag ("frühstücks-basis"), Belag-Portionen ("Belag knapp/normal/üppig"), Packungs-Portion.
  - `planner` — Suchendpunkt `/meal-plans/recipes/search/` (`meal_plan.py:1540`): `standalone_type`-Filter entfernen, `is_standalone_food=True` immer aktiv; neuer Endpunkt für Reste-Berechnung; Endpunkt Basis-/Belag-Katalog.
  - Pydantic-Schemas synchron zu den Zod-Schemas halten.
- **Daten/Seed**: Management-Command für Basis- und Belag-Zutaten inkl. Intensitäts- und Packungsportionen; `breakfast-seed-recipes` auf warme Gerichte reduzieren.
- **Einkaufsliste**: Ingredient-MealItems bereits vollständig unterstützt (`supply/services/shopping_service.py:189`) — nur Verifikation nötig, kein neuer Code.
- **Migrationen**: `supply` (standalone_type entfernen); ggf. `supply` (BE/Stück-Feld falls nötig — in design.md entschieden).
