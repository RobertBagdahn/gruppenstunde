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
- **Soll-Andockung**: Energie-Soll = `NORM_PERSON_DAILY_KCAL` (2335) × `day_part_factor`; nicht mehr die hart kodierten 2400 kcal. "Normalisieren" skaliert Basis + Belag + Getränke (Belag-Deckung bleibt erhalten), Gemüse/Extras bleiben fix.
- **Speichern am Ende**: RefMeal + MealItems werden erst beim Abschluss erstellt (`createRefMeal` + Items als `ingredient_id`/`recipe_id` + Gramm-Menge). Bei vorhandenem RefMeal öffnet ein "Frühstücksassistent"-Button den Wizard vorausgefüllt.

## Capabilities

### New Capabilities
- `breakfast-wizard`: Der geführte 4-Schritt-Prozess zur Frühstücksplanung — dynamische Basis⊗Belag-Kombination, Belag-Intensität, Schieberegler mit Auto-Rebalance/Lock, Doppelchecks, Reste-Transparenz und Abschluss-Cockpit.

### Modified Capabilities
- `ref-meal`: Der Frühstücks-Einstiegspunkt erstellt das RefMeal künftig erst am Ende des Wizards; MealItems dürfen `ingredient_id` + Gramm-Menge direkt referenzieren (nicht nur `recipe_id`).
- `breakfast-seed-recipes`: Wird auf warme Frühstücksgerichte (Rührei, Pfannkuchen) reduziert. Brot+Belag werden nicht mehr als Kombi-Mini-Rezepte angelegt, sondern dynamisch aus Zutaten kombiniert.

## Impact

- **Frontend (`frontend-food/`)**:
  - `src/pages/planning/RefMealEditorPage.tsx` — Einstieg ändert sich (Wizard statt Baukasten für Frühstück)
  - Neue Wizard-Komponenten unter `src/pages/planning/breakfast/` (Steps + Cockpit)
  - Neue/erweiterte Zod-Schemas für Wizard-State und Reste-Berechnung
  - TanStack-Query-Hooks für Basis-/Belag-Zutaten und RefMeal-Speicherung
- **Backend (`backend/`)**:
  - `supply` — Konvention auf bestehenden Modellen: Basis-Tag ("frühstücks-basis"), Belag-Portionen ("Belag knapp/normal/üppig"), Packungs-Portion. Klärung, ob BE/Stück über Portion-Konvention oder neues Ingredient-Feld abgebildet wird (ggf. Migration).
  - `planner` — RefMeal/MealItem akzeptiert `ingredient_id` + Gramm-Menge; Soll-Berechnung über `NORM_PERSON_DAILY_KCAL` × `day_part_factor`.
  - Endpunkt(e) zum Laden der Basis-/Belag-Kataloge inkl. Portionsgewichten und Packungsgrößen.
  - Pydantic-Schemas synchron zu den Zod-Schemas halten.
- **Daten/Seed**: Management-Command für Basis- und Belag-Zutaten inkl. Intensitäts- und Packungsportionen; `breakfast-seed-recipes` auf warme Gerichte reduzieren.
- **Migrationen**: Nur falls BE/Stück oder Intensität ein neues Ingredient-Feld erfordern (in design.md entschieden).
