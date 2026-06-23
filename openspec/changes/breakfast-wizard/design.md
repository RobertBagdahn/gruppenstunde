## Context

Frühstück wird heute über `RefMealEditorPage` (`frontend-food/src/pages/planning/RefMealEditorPage.tsx`) als Rezept-Baukasten geplant: Der Nutzer sucht Rezepte und fügt sie mit einem Faktor zum RefMeal hinzu. Das passt nicht zum tatsächlichen Frühstücks-Workflow im Lager, wo Basis (Brot/Brötchen) und Belag frei kombiniert werden und das Hauptproblem die Resteverwertung ist.

Vorhandene, wiederverwendbare Infrastruktur:
- `Portion` (`backend/supply/models/ingredient.py`) mit `weight_g`, `is_default`, `priority`, `measuring_unit` — ideal für Belag-Portionen und Packungsgrößen, **ohne Migration**.
- `Ingredient.standard_recipe_weight_g` — Scheibengewicht der Basis.
- `RefMeal`/`Meal`/`MealItem` (`planner`) inkl. `is_reference`, `ref_meal` FK, `day_part_factor`, `factor`. MealItems können bereits `recipe_id` ODER `ingredient_id` referenzieren.
- `NORM_PERSON_DAILY_KCAL = 2335` (PAL 1.75) als einziger Tagesbedarfs-Bezug (siehe `meal-plan-soll-ist-band` Spec). `MealPlan.norm_portions` + verknüpfte Tage liefern die Hochrechnung für den Einkauf.
- `SollIstBar`-Komponente (Frontend) für Ist/Soll-Darstellung.

Stakeholder-Kontext: `knowledge/food/stakeholder-gespraech-2026-06-23/fruehstuecksplanung.md`.

## Goals / Non-Goals

**Goals:**
- Basis und Belag dynamisch kombinieren statt N×M Kombi-Rezepte zu pflegen.
- Klare, nachvollziehbare Mengen-Rechnung mit vielen sichtbaren Zahlen und mehreren Doppelchecks.
- Reste pro Belag in Gramm und Euro transparent machen (Packungsrundung).
- Sauber an `NORM_PERSON_DAILY_KCAL × day_part_factor` und `norm_portions` andocken.
- RefMeal erst beim Wizard-Abschluss erstellen; bestehende RefMeals erneut bearbeitbar.

**Non-Goals:**
- Wizard für andere Mahlzeiten als Frühstück (nur breakfast).
- Pro-Tag-unterschiedliche Frühstücke (RefMeal gilt für alle verknüpften Tage identisch).
- Alters-/Stufen-Gewichtung der Esser (läuft bereits über die Norm-Person).
- Tippel-/Abreisetag-Spezialmodi (separat, später).
- Brötchen-vom-Bäcker als eigener Bestellprozess (offene Frage, hier nicht gelöst).

## Decisions

### D1: Brot-Einheit (BE) als zentrale Recheneinheit
1 BE = 1 belegbare Fläche. 1 Scheibe = 1 BE, ½ Brötchen = 1 BE, ganzes Brötchen = 2 BE. **1 Belag-Portion deckt genau 1 BE.** Damit werden Basis und Belag über eine gemeinsame, intuitive Einheit verrechenbar.
*Alternative:* Belag pro 100g Basis-Gewicht — verworfen, weil zu abstrakt für die UI.

### D2: Basis-Sorten als Ingredients mit Tag
Basis-Sorten (Bauernbrot, Toastbrot, Stuten, Körnerbrot, Brötchen, ½ Brötchen) sind `Ingredient`s mit einem Tag/Kategorie "frühstücks-basis" und `standard_recipe_weight_g` als Scheibengewicht. BE/Stück: Brötchen=2, alles andere=1.
*Offen (siehe Open Questions):* BE/Stück als Konvention (ganze Brötchen separat als eigene Zutat mit 2 BE) ODER als neues Ingredient-Feld `breakfast_units_per_piece` (Migration). Default-Annahme: Konvention ohne Migration, ganze Brötchen werden als BE=2-Variante modelliert.

### D3: Belag-Intensität über drei Portionen je Belag-Zutat
Jede Belag-Zutat erhält drei `Portion`s: "Belag knapp", "Belag normal" (Default), "Belag üppig" mit jeweils `weight_g`. Der Wizard hat **einen globalen** Intensitäts-Schalter, der pro Zutat die passende Portion wählt. 1 Portion deckt unabhängig von der Intensität weiterhin 1 BE — nur das Gewicht (kcal + Reste) ändert sich.
*Alternative:* Intensität pro Zutat — verworfen für v1 (mehr UI, geringer Mehrwert).

### D4: Reste über Packungs-Portion
Jede Belag-Zutat erhält eine `Portion` "Packung" mit `weight_g` (z.B. Nutella-Glas 450g). Bedarf = `Σ(Belag-Portionen) × Portionsgewicht × norm_portions × verknüpfte Tage`. Packungen = `ceil(Bedarf / Packung)`. Rest in g und in € über `Ingredient.price_per_kg`.
Dies macht das Stakeholder-Argument "lieber 2 als 4 Sorten" quantitativ (Rest-Euro pro Extra-Sorte).

### D5: Schieberegler mit Auto-Rebalance + Lock
Sortenverteilung je Kategorie summiert immer auf 100%. Ändert der Nutzer einen Regler, verteilt sich die Differenz **proportional** auf die ungesperrten Sorten. Gesperrte Sorten (Lock-Icon) bleiben fix. Rein Frontend-State, keine Persistenz der Lock-Zustände nötig.

### D6: Soll-/Normalisieren-Logik
Energie-Soll je Frühstück = `NORM_PERSON_DAILY_KCAL (2335) × day_part_factor` (RefMeal). Die bislang hart kodierten 2400 kcal in `RefMealEditorPage` entfallen. "Normalisieren" multipliziert Basis-BE, Belag-Portionen und Getränke mit `Soll/Ist`; die Belag-Deckung bleibt erhalten, weil Basis und Belag identisch skalieren. Gemüse/Extras (inkl. warme Rezepte) bleiben fix.

### D7: Speichern als MealItems beim Abschluss
Erst beim Wizard-Abschluss wird `createRefMeal({meal_type: 'breakfast'})` aufgerufen und das Ergebnis als MealItems gespeichert:
- Basis/Belag/Gemüse/Getränke → `ingredient_id` + Gramm/ml-Menge.
- Warme Gerichte → `recipe_id` + `factor`.
Wiederöffnen eines RefMeals rekonstruiert den Wizard-State aus den MealItems (verlustarm; Verteilungs-/Lock-UI-State wird neu aus den Mengen abgeleitet).

### D8: Hybrid Rezept/Zutat
Brot+Belag dynamisch aus Zutaten; warme Gerichte (Rührei, Pfannkuchen) bleiben Rezepte und erscheinen in Schritt 3 (Extras). `breakfast-seed-recipes` wird auf warme Gerichte reduziert.

### Betroffene Dateien
- Frontend: `frontend-food/src/pages/planning/RefMealEditorPage.tsx` (Einstieg), neue `frontend-food/src/pages/planning/breakfast/` (Steps + Cockpit + State-Hook), Zod-Schemas + Query-Hooks.
- Backend: `backend/supply/` (Katalog-Endpunkt für Basis/Belag inkl. Portionen + Packung), `backend/planner/` (Soll-Berechnung über Norm-Person, MealItem mit ingredient_id), Seed-Command für Basis/Belag.

### API-Änderungen (Entwurf)
- `GET /api/supply/breakfast-catalog/` → Basis-Zutaten (mit Scheibengewicht, BE/Stück) + Belag-Zutaten (mit Intensitäts-Portionen + Packung + price_per_kg), gruppiert nach Kategorie.
- Bestehende RefMeal-Endpunkte (`create`, `update`) werden für ingredient-basierte MealItems genutzt; Response liefert `day_part_factor` für die Soll-Rechnung.

## Risks / Trade-offs

- [Wiederöffnen verliert UI-Feinheiten (exakte Reglerwerte, Lock-Zustände)] → State wird aus Mengen rekonstruiert; Lock ist reiner Editier-Komfort, kein Datenverlust an Mengen.
- [Belag-Intensität global trifft Spezialfälle nicht (z.B. Nutella üppig, Käse knapp)] → bewusst für v1 akzeptiert; pro-Zutat-Override als spätere Erweiterung.
- [Datenqualität: viele Zutaten ohne Belag-/Packungs-Portion] → Seed-Command liefert Defaults; Wizard zeigt Hinweis bei fehlenden Portionsdaten.
- [BE-Modellierung ohne neues Feld kann unsauber wirken (ganzes Brötchen als eigene Zutat)] → in Open Questions; Migration als Fallback offen gehalten.
- [Auto-Rebalance kann bei vielen Locks blockieren (alle gesperrt außer einer)] → letzte ungesperrte Sorte fängt die Differenz; UI verhindert "alle gesperrt".

## Migration Plan

1. Seed-Command für Basis-Zutaten (Tag + Scheibengewicht) und Belag-Zutaten (Intensitäts-Portionen + Packung) erstellen/erweitern; idempotent.
2. Falls D2 ein Ingredient-Feld erfordert: Migration in `supply` (`makemigrations supply`).
3. `breakfast-seed-recipes` auf warme Gerichte reduzieren.
4. Backend-Katalog-Endpunkt + Soll-Berechnung.
5. Frontend-Wizard hinter dem bestehenden Route-Einstieg; alter Baukasten für Frühstück entfällt.
Rollback: Einstieg in `RefMealEditorPage` auf den alten `createRefMeal`-Button zurücksetzen; Seed-Daten bleiben unschädlich.

## Open Questions

- BE/Stück: Konvention (ganze Brötchen als eigene Zutat) oder neues Feld `breakfast_units_per_piece`?
- Butter/Margarine: immer zusätzlicher Basisbelag (außerhalb der Belag-Σ) oder eigene Verteilungskategorie?
- Brötchen vom Bäcker: tägliche Bestellung vs. Supermarkt-Packung — gehört das in die Reste-Logik?
- Resteverwertung Folgetag ("vom Vortag noch X übrig, heute weniger kaufen") — späteres Feature?
- Allergien/Unverträglichkeiten (z.B. Hafermilch statt Kuhmilch) im Wizard — späteres Feature?
