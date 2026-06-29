## Context

Der Food-Bereich hat drei Code-Pfade für dieselbe Aufgabe (Gewicht einer Direktzutat bestimmen): `nutrition_summary` (korrekt, nutzt `_resolve_ingredient_weight_g`), `cost_summary` (eigene Inline-Logik, unvollständig), `shopping_service` (eigene Inline-Logik, nutzt `measuring_unit.quantity` als Gewicht statt als Konversionsfaktor). `MeasuringUnit.quantity` ist der Konversionsfaktor der Einheit (z.B. "500g Packung" hat `quantity=500`), nicht das Gewicht der MealItem-Menge. In Produktion existieren Einheiten mit `quantity > 1`, was zu systematisch falschen Einkaufsmengen und Kosten führt.

Das Breakfast-Wizard-Getränkesystem speichert Getränkeauswahl als `DrinkState` mit `mlPerPerson`, Prozentwerten je Getränkeart und hartkodierten kcal-Konstanten (`KCAL_PER_100ML_COFFEE = 2`, `KCAL_PER_100ML_COCOA = 80`). Das verletzt das Grundprinzip des Systems (kcal aus Zutaten-/Rezeptdaten) und ist inkonsistent mit warmen Gerichten, die bereits als Rezept-IDs gespeichert werden.

## Goals / Non-Goals

**Goals:**
- Einen einzigen kanonischen Berechnungspfad für Direktzutat-Gewichte in allen drei Bereichen
- Getränke im Breakfast Wizard analog zu warmen Gerichten: Rezept-IDs + factor, MealItems im Frühstücksmeal
- N+1 in `nutrition_summary` eliminieren (ingredient__portions prefetchen)
- `portions=0`-Rezepte in allen Berechnungsbereichen explizit skippen statt still durch 1 dividieren
- Vollständige Konsistenz-Tests die alle drei Berechnungsbereiche für dieselben Szenarien prüfen

**Non-Goals:**
- Umbau des gesamten Getränke-Backends (Rezepte mit `breakfast-drink`-Tag existieren bereits)
- UI-Redesign des Breakfast Wizards über StepGetraenke hinaus
- Neue DGE-Referenzwerte oder Norm-Personen-Änderungen
- Einkaufslistendisplay-Änderungen (Packungsoptionen, Formatierung)

## Decisions

### 1. Kanonischer Gewichts-Helper in allen drei Bereichen

**Entscheidung**: `_resolve_ingredient_weight_g` aus `meal_item_helpers.py` wird in `shopping_service` und `cost_summary` importiert und verwendet. Die bestehenden Inline-Implementierungen werden ersetzt.

**Rationale**: Der Helper behandelt alle drei Pfade korrekt: `g`-Einheit (→ `float(quantity)`), `ml`-Einheit mit `density` (→ `quantity × density`), Portionseinheit (→ Portion-Lookup → `quantity × weight_g`). Duplizierter Code mit leicht unterschiedlicher Semantik ist die Ursache des Bugs.

**Alternative verworfen**: Inline-Implementierungen angleichen — zu fehleranfällig, da drei getrennte Stellen synchron gehalten werden müssten.

**Besonderheit Shopping Service**: Der Shopping Service skaliert mit `meal_scaling = norm_portions × reserve_factor` (Einkauf = mehr), während `nutrition_summary` und `cost_summary` mit `effective_portions` (ohne Reserve) skalieren. `_resolve_ingredient_weight_g` gibt nur das Basisgewicht zurück — die Skalierung bleibt im jeweiligen Aufrufer.

### 2. Getränke-System: Rezept-IDs + factor

**Entscheidung**: `DrinkState` wird durch `drinkRecipeIds: number[]` + `drinkFactors: Record<number, number>` ersetzt. Getränk-Rezepte werden beim Wizard-Save als `MealItem` (recipe) im Frühstücksmeal angelegt — identisch zur Behandlung von `warmDishRecipeIds`.

**Rationale**: Konsistenz mit dem bestehenden Muster für warme Gerichte. Rezepte haben bereits `cached_energy_kcal` — kcal-Berechnung im Cockpit nutzt dasselbe Schema wie für alle anderen Rezept-MealItems. Kein separater kcal-Berechnungspfad nötig.

**Getränk-Katalog**: Endpoint `GET /api/supply/breakfast-catalog/drinks/` filtert Rezepte mit `breakfast-drink`-Tag — bleibt unverändert.

**Milch-Handling**: Das bisherige `coffeeMilkMlPerPerson`/`cocoaMilkMlPerPerson` entfällt. Milch ist in den Getränke-Rezepten als Zutat enthalten — damit korrekt durch den Rezept-Nährwertcache abgebildet.

**Alternative verworfen**: Getränke als Direktzutat-MealItems (ingredient) — Getränke sind oft komplexe Mischungen (Kakao = Milch + Kakao), Rezepte bilden das besser ab.

### 3. portions=0 → skippen, nicht normieren

**Entscheidung**: In allen drei Berechnungsbereichen wird ein Rezept mit `portions=0` oder `portions=None` geskippt (kein Beitrag zu Nährwerten, Kosten, Einkaufsmenge) und ein `logger.warning` ausgegeben.

**Rationale**: Division durch 1 als stilles Fallback verschleiert Datenfehler. Ein Rezept ohne Portionsangabe ist ein Datenfehler — es soll sichtbar werden, nicht stumm falsch gerechnet werden.

**Migration**: Bestehende Rezepte mit `portions=0` oder `None` müssen vor dem Deploy geprüft werden. Management Command `validate_recipe_data` kann das aufdecken.

### 4. N+1 Fix: ingredient__portions prefetchen

**Entscheidung**: In `nutrition_summary` wird `"ingredient__portions"` zum Prefetch-Chain hinzugefügt. `_resolve_ingredient_weight_g` greift dann auf gecachte Portionen zu statt DB-Queries zu machen.

**Rationale**: Bei Breakfast-Wizard-Mahlzeiten mit 5-15 Direktzutaten entstehen ohne Prefetch 10-30 extra Queries pro API-Call.

## Risks / Trade-offs

- **BREAKING DrinkState-Schema**: Frontend und Backend müssen synchron deployed werden. RefMeals die `DrinkState`-JSON gespeichert haben, werden nach dem Umbau keine Getränkedaten mehr zeigen — ein einmaliger Datenverlust der im Wizard durch erneutes Ausfüllen behoben wird. Akzeptabel da keine Rückwärtskompatibilität gefordert.

- **portions=0-Skip ist Breaking**: Bisher berechneten portions=0-Rezepte mit 1× Skalierung (implizit). Nach dem Fix werden sie aus der Berechnung ausgeschlossen. Falls Prod-Daten solche Rezepte enthalten, können Einkaufslisten und Nährwerte sich verändern.

- **_resolve_ingredient_weight_g macht Portion-Lookup via DB**: Im Shopping Service werden Portionen bereits separat gebatcht geladen (`portion_lookup`). Der Helper macht einen zusätzlichen Lookup — das muss geprüft werden um keine neuen N+1s einzuführen. Lösung: Helper erhält optionalen `portion_cache`-Parameter oder Shopping Service übergibt bereits geladene Portion direkt.

## Migration Plan

1. Backend-Changes deployen (shopping_service, cost_summary, nutrition_summary, portions=0)
2. Frontend-Changes deployen (DrinkState-Umbau, StepGetraenke)
3. Bestehende RefMeals verlieren DrinkState-Daten — kein DB-Cleanup nötig, da WizardState im RefMeal-JSON-Feld liegt und beim nächsten Wizard-Aufruf neu befüllt wird
4. Rollback: Git revert, kein DB-Rollback nötig

## Open Questions

- Hat der Shopping Service ein Problem wenn `_resolve_ingredient_weight_g` intern `portions.filter()` aufruft, obwohl der Service Portionen bereits per `portion_lookup`-Dict vorlädt? → Im Implementierungs-Task klären ob Helper einen `portion_cache`-Parameter bekommt oder ob der Shopping-Service-Lookup ausreicht.
