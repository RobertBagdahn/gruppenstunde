## Context

Aktuell müssen Rezeptautoren für jede Ernährungsvariante (vegan, glutenfrei, scharf/mild) separate Rezepte anlegen. Das führt zu doppelter Pflege: Änderungen an der Basiszubereitung müssen manuell in alle Varianten übertragen werden.

Das bestehende `MealItemOverride`-Modell erlaubt bereits ad-hoc Zutaten-Ausschlüsse und Mengenänderungen — aber nur für alle Portionen gleichzeitig und ohne Portionen-Split. Es gibt keinen strukturierten Weg, "8 Portionen mit Parmesan, 2 Portionen mit Hefeflocken" abzubilden.

Die Exploration mit dem Stakeholder ergab: Das Kernproblem ist rein eine **Einkaufsmengen-Frage**, nicht eine Esser-Zuordnungs-Frage. Die Lösung braucht kein Konzept "wer isst was", sondern nur "wie viel von welcher Zutat kaufen".

**Relevante bestehende Code-Pfade (im Code verifiziert):**
- `RecipeItem` liegt in `backend/recipe/models/items.py` mit Feldern `recipe` (CASCADE), `portion` (PROTECT), `quantity` (FloatField), `sort_order`, `note`. KEINE direkten `ingredient`- oder `measuring_unit`-FKs — die Zutat kommt ausschließlich via `portion.ingredient`, die Einheit via `portion.measuring_unit`. Ein Exchange-Glied bestimmt seine Zutat also über sein eigenes `portion`-FK.
- `MealItem`, `MealItemOverride` liegen in `backend/planner/models/meal_plan.py` (eine einzelne Datei, kein Package).
- **Drei getrennte Berechnungspfade**, die alle split-aware werden müssen:
  1. **Einkaufsliste**: `backend/supply/services/shopping_service.py` → `generate_shopping_list()`, aggregiert nach `ingredient_id`, Formel `ri.quantity * portion.weight_g * mi.factor * meal_scaling / recipe_servings`.
  2. **Nährwert/Kosten pro MealItem**: `backend/planner/schemas/meal_plan.py` → `MealItemOut.resolve_energy_kcal/resolve_cost_eur`, nutzt aktuell `recipe.cached_energy_total_kcal` (NICHT Einzelzutaten).
  3. **Nährwert/Kosten-Aggregation pro Plan/Tag**: `backend/planner/api/meal_plan.py` (ab ~Zeile 811), eigene Schleife über RecipeItems.
- `meal_scaling`-Logik: bei `meal.override_portions` wird `override_portions * reserve_factor` genutzt, sonst `meal_plan.scaling_factor` (`shopping_service.py:121-124`).
- Fork-Logik: `backend/recipe/api/recipes.py` → `fork_recipe()` kopiert RecipeItems manuell (Zeile ~679), kopiert aktuell NICHT exchange_group/is_optional.

## Goals / Non-Goals

**Goals:**
- Rezeptautoren können Zutaten als optional markieren (`is_optional`)
- Rezeptautoren können Austausch-Ketten definieren (Parmesan ↔ Hefeflocken ↔ Cashew-Creme)
- Planer wählen beim Einplanen Portionen-Anteile pro Exchange-Kette und optionaler Zutat
- Einkaufsliste berechnet Mengen korrekt nach Anteilen
- Nährwerte/Kosten werden split-aware per Delta-Ansatz berechnet (Cache-Basis + Korrektur pro getauschtem Glied)
- Fork eines Rezepts kopiert Exchanges und Optionals vollständig
- Kochplan-Druck (`meal-plan-export` PDF) rendert Exchange-Splits als getrennte vollständige Zutatenblöcke

**Non-Goals:**
- Esser-Zuordnung ("Person X bekommt Variante Y") — nur Mengen zählen
- Bündelung von Exchange-Ketten zu benannten Varianten (kein `RecipeVariant`-Container)
- Caching von Split-Nährwerten (immer live berechnet)
- Änderung an `MealItemOverride` (bleibt parallel für ad-hoc Korrekturen)

## Decisions

### Entscheidung 1: Exchange-Gruppen als eigenständige Modelle, nicht als Varianten-Container

**Gewählt:** `RecipeItemExchangeGroup` als leichtes Gruppen-Modell. Alle Mitglieder (inklusive Original) sind reguläre `RecipeItem`-Einträge mit `exchange_group`-FK und `exchange_position`-Integer.

**Alternativ:** `RecipeVariant` als Container, der mehrere Exchange-Ketten bündelt (z.B. "Vegan" = Cashew + Margarine). Wurde verworfen, weil: (a) der Planer Ketten unabhängig splittet und keine Bündelung braucht, (b) das Konzept nur für die Einkaufsliste relevant ist, nicht für Esser-Zuordnung.

```
RecipeItemExchangeGroup
  id, recipe (FK), name (optional, z.B. "Käse-Ersatz"), created_at

RecipeItem
  ...bestehende Felder...
  is_optional: bool (default False)
  exchange_group: FK → RecipeItemExchangeGroup (nullable, SET_NULL)
  exchange_position: int (nullable, 0 = Default/Original)

Constraint: is_optional und exchange_group schließen sich aus (CHECK CONSTRAINT)
Constraint: exchange_position ist nur gesetzt wenn exchange_group gesetzt ist
```

### Entscheidung 2: Split als Anteil (float), nicht als absolute Portionen

**Gewählt:** `MealItemSplit.share` als float 0.0–1.0. Vorteil: Skaliert automatisch wenn `norm_portions` oder `reserve_factor` geändert werden. Keine manuelle Anpassung durch den Planer nötig.

**Alternativ:** Absolute Portionszahl (int). Einfacher in der UI ("2 Portionen vegan"), aber bricht wenn die Gesamtportionen geändert werden.

**Rundung:** Largest-Remainder-Methode. Intern float, Anzeige in ganzen Portionen. Differenz geht immer aufs Default-Glied (Position 0). Garantiert: Σ angezeigte Portionen = effective_portions.

```
MealItemSplit
  id
  meal_item: FK → MealItem (CASCADE)
  recipe_item: FK → RecipeItem (PROTECT)
  share: float  — Anteil 0.0–1.0
  created_at, updated_at

Constraint: Σ share pro (meal_item, exchange_group) = 1.0
Constraint: Σ share pro (meal_item, optional recipe_item) = 1.0
            (wobei eine Split-Row "mit" und eine "ohne" bedeutet)
Kein Split-Eintrag → 100% Default (Position 0) für Exchange; 100% "da" für Optional
```

### Entscheidung 3: Django PROTECT beim Löschen von Ketten-Gliedern und Rezepten

**Gewählt:** `MealItemSplit → RecipeItem` mit `on_delete=PROTECT`. Autor kann ein Ketten-Glied nicht löschen, solange aktive Splits existieren. Fehlermeldung im UI.

**Zusätzlich:** Auch ein ganzes Rezept ist nicht löschbar, wenn seine RecipeItems aktive Splits haben. Da `MealItem → recipe` aktuell CASCADE ist (Rezept-Löschung würde MealItems mitlöschen und damit den PROTECT umgehen), muss die Rezept-Lösch-API explizit prüfen, ob aktive `MealItemSplit` existieren, und dann HTTP 409 zurückgeben. Recipe nutzt zwar `SoftDeleteModel`, der Schutz greift dennoch vor dem Setzen von `deleted_at`.

**Änderungsschutz:** Solange aktive Splits auf ein RecipeItem zeigen, dürfen seine Split-relevanten Felder (`is_optional`, `exchange_group`, `exchange_position`) nicht geändert werden — sonst entstünden Splits auf Zutaten, die nicht mehr optional/exchange sind. `update_recipe_item` gibt in diesem Fall HTTP 409 zurück.

**Alternativ:** CASCADE (Splits werden automatisch gelöscht) oder SET_DEFAULT (Splits auf Original zurücksetzen). PROTECT wurde gewählt, weil stille Datenänderungen in Essensplänen anderer Nutzer inakzeptabel sind.

### Entscheidung 4: Nährwerte split-aware berechnen

**Wichtige Einschränkung (verifiziert):** Der aktuelle Code berechnet MealItem-Nährwerte NICHT aus Einzelzutaten, sondern über den denormalisierten `recipe.cached_energy_total_kcal` (`MealItemOut.resolve_energy_kcal`). Eine split-aware Berechnung braucht deshalb einen neuen Pfad, der pro Glied die Differenz zum Default-Rezept einrechnet.

**Gewählt (Delta-Ansatz):** Wenn ein MealItem Splits hat, wird der Nährwert live berechnet: Basiswert des Rezepts (aus Cache) plus Delta pro Exchange-Glied (Differenz Glied-Zutat ↔ Default-Zutat, gewichtet mit `share`). Optionale Zutaten mit `share<1.0` reduzieren den Beitrag ihrer Zutat anteilig. Ohne Splits bleibt der bestehende Cache-Pfad unverändert.

**Delta-Formel pro getauschtem Glied:**
`delta = share × (glied_zutat_kcal_pro_portion − default_glied_kcal_pro_portion)`
wobei `kcal_pro_portion = portion.weight_g × ri.quantity × ingredient.energy_kcal / 100 / recipe_servings`.
Analog für Kosten (via `price_per_kg`) und alle weiteren Nährwertfelder. Das Default-Glied (exchange_position=0) liefert den im Cache enthaltenen Beitrag; nur die Differenz der tatsächlich gewählten Glieder wird auf-/abgerechnet.

**Alternativ A:** Vollständige Neuberechnung aus allen Einzelzutaten (ignoriert Cache). Verworfen — würde den bestehenden, performanten Cache-Pfad ersetzen und alle MealItem-Berechnungen verlangsamen.

**Alternativ B:** Cache am MealItem. Verworfen wegen Invalidierungskomplexität (Rezept-, Split-, Zutat-Änderung invalidieren denselben Cache).

**Konsequenz:** Dies ist ein größerer Eingriff als ein simpler "live statt cache"-Switch. Betrifft alle drei Berechnungspfade (siehe Context). Tasks bilden das explizit ab.

### Entscheidung 5: Einplanen-Dialog zeigt alles sofort

**Gewählt:** Wenn ein Rezept mind. eine Exchange-Gruppe oder optionale Zutat hat, erscheint beim Hinzufügen zum Essensplan sofort ein Konfigurations-Dialog. Defaults werden vorausgefüllt (100% Original).

**Alternativ:** Zweistufig (erst hinzufügen, dann optionaler Dialog). Verworfen — der Planer soll die Entscheidung nicht vergessen.

### Entscheidung 6: Optional und Exchange strikt getrennt

**Gewählt:** Eine Zutat ist entweder `is_optional=True` ODER Teil einer `exchange_group` — nie beides. CHECK CONSTRAINT in der DB.

**Alternativ:** Vereinheitlichung zu Exchange-Ketten mit "Leer"-Glied. Verworfen — UI und mentales Modell sind verschieden (Checkbox vs. Auswahl).

## Datenmodell-Übersicht

```
recipe App (backend/recipe/models/items.py):
  RecipeItemExchangeGroup          (neu)
    id, recipe FK (CASCADE), name CharField (optional)

  RecipeItem                       (erweitert)
    + is_optional: BooleanField (default=False)
    + exchange_group: FK → RecipeItemExchangeGroup (nullable, SET_NULL)
    + exchange_position: IntegerField (nullable)

planner App (backend/planner/models/meal_plan.py):
  MealItemSplit                    (neu)
    id
    meal_item: FK → MealItem (CASCADE)
    recipe_item: FK → RecipeItem (PROTECT)
    share: FloatField (0.0–1.0)
    created_at, updated_at

Hinweis: exchange_group nutzt SET_NULL als DB-Fallback. Das reguläre Löschen einer
Gruppe ist explizite API-Logik (`delete_exchange_group`): (1) prüfen ob aktive
MealItemSplits auf Glieder zeigen → HTTP 409; (2) sonst Nicht-Default-Glieder
(exchange_position > 0) löschen und das Original (position 0) auf exchange_group=NULL
zurücksetzen. SET_NULL verhindert nur Datenmüll bei unerwarteten Direkt-Löschungen.
RecipeItem selbst behält on_delete=CASCADE vom recipe FK — der Schutz aktiver Splits
läuft über die MealItemSplit-PROTECT-Beziehung.
```

## API-Endpunkte

Bestehendes Routing (verifiziert): Recipe-Endpunkte hängen am `recipe`-Router
(Prefix vermutlich `/api/recipes`), RecipeItem-Endpunkte liegen bereits in
`recipe/api/items.py` unter `/{recipe_id}/recipe-items/`. Meal-Item-Endpunkte
liegen unter `/{meal_plan_id}/meal-items/{item_id}/...` (siehe `set_meal_item_overrides`).
Neue Endpunkte folgen diesen bestehenden Mustern.

```
# Exchange-Gruppen (recipe/api/items.py oder neue Datei, am recipe-Router)
POST   /{recipe_id}/exchanges/                          Gruppe anlegen
GET    /{recipe_id}/exchanges/                          Alle Gruppen eines Rezepts
DELETE /{recipe_id}/exchanges/{group_id}/               Gruppe löschen (nur wenn keine aktiven Splits)

# RecipeItem Exchange/Optional setzen — KEIN neuer Endpunkt:
# bestehendes PATCH /{recipe_id}/recipe-items/{item_id}/ (update_recipe_item)
# wird genutzt; RecipeItemUpdateIn um is_optional, exchange_group_id, exchange_position erweitern.
# bestehendes DELETE /{recipe_id}/recipe-items/{item_id}/ um Split-Löschschutz erweitern.

# MealItemSplits (planner/api/meal_plan.py, gleiches Muster wie overrides)
GET    /{meal_plan_id}/meal-items/{item_id}/splits/      Alle Splits eines MealItems
PUT    /{meal_plan_id}/meal-items/{item_id}/splits/      Splits setzen (ersetzt alle, Constraint geprüft)
DELETE /{meal_plan_id}/meal-items/{item_id}/splits/      Alle Splits löschen (→ zurück auf Default)

# Bestehende Berechnungspfade werden erweitert (kein neuer Endpunkt, interne Logik):
#   - supply/services/shopping_service.py  → generate_shopping_list (Mengen split-aware)
#   - planner/schemas/meal_plan.py         → MealItemOut.resolve_energy_kcal/cost_eur
#   - planner/api/meal_plan.py             → Plan-/Tag-Aggregation (~Zeile 811+)
#   - planner/api/meal_plan.py             → set_meal_item_overrides: Override auf
#                                            Split-/Optional-Zutaten verbieten (HTTP 400)
```

## Berechnungs-Pipeline (Einkaufsliste, basiert auf shopping_service.py)

Die bestehende Formel pro RecipeItem ist:
`weight_g = ri.quantity × ri.portion.weight_g × mi.factor × meal_scaling / recipe_servings`
wobei `meal_scaling = override_portions × reserve_factor` (falls override) sonst `meal_plan.scaling_factor`.

Split-aware Erweiterung — pro RecipeItem zusätzlicher Faktor `included_fraction`:

```
Für jedes MealItem:
  1. Lade RecipeItems (bereits prefetched) + MealItemSplits für dieses MealItem
  2. Berechne pro Exchange-Gruppe bzw. optionaler Zutat den gerundeten Portionen-Split
     (Largest-Remainder auf effective_portions = norm/override_portions, OHNE reserve_factor)
  3. Pro RecipeItem included_fraction bestimmen:
     a. Split vorhanden für dieses RecipeItem? → gerundete_portionen / effective_portions
     b. is_optional ohne Split?               → 1.0 (Default: eingeschlossen)
     c. exchange_position=0 ohne Split?        → 1.0 (Default-Glied)
     d. exchange_position>0 ohne Split?        → 0.0 (nicht eingeschlossen)
     e. weder optional noch exchange?          → 1.0 (unverändert)
  4. weight_g = bestehende_Formel × included_fraction
  5. Additiv nach ingredient_id aggregieren (wie bisher)
```

Wichtig: `reserve_factor` ist bereits in `meal_scaling` enthalten — er darf NICHT
ein zweites Mal auf den Split angewendet werden. Der Split arbeitet auf
`effective_portions` (Normebene), die Skalierung auf Reserve macht weiterhin `meal_scaling`.

## Fork-Verhalten

Beim Fork (`fork_recipe` in `recipe/api/recipes.py`) muss die bestehende
RecipeItem-Kopierschleife erweitert werden: `is_optional` mitkopieren, und für jede
`RecipeItemExchangeGroup` des Originals eine neue Gruppe im Fork anlegen, dann die
kopierten RecipeItems via `exchange_group`/`exchange_position` neu verknüpfen.
Der Fork ist danach unabhängig vom Original.

## Risks / Trade-offs

**[Komplexität im Einplanen-Dialog]** → Bei vielen Exchange-Ketten und optionalen Zutaten wird der Dialog unübersichtlich. Mitigation: UI gruppiert Exchanges kompakt, zeigt Defaults vorausgefüllt, nur bei Bedarf aufgeklappt.

**[PROTECT kann Frustration erzeugen]** → Autor will ein Ketten-Glied löschen, aber aktive Pläne blockieren es. Mitigation: Fehlermeldung zeigt, in welchen Plänen das Glied verwendet wird.

**[Live-Nährwert kann langsam sein]** → Bei großen Essensplänen mit vielen Splits viele DB-Abfragen. Mitigation: Eager-Loading der RecipeItems + Ingredients in einem Query; bei Performance-Problemen später nachrüsten.

**[Largest-Remainder ist nicht intuitiv]** → Planer sieht "2 Portionen", intern sind es 22,2% gespeichert. Bei Portionsänderung ändert sich die angezeigte Zahl. Mitigation: UI zeigt immer gerechnete Portionen, erklärt Proportionalität kurz.

**[MealItemSplit und MealItemOverride dürfen sich nicht überlappen]** → Entschieden: Ein `MealItemOverride` ist NICHT erlaubt auf einem RecipeItem, das `is_optional=True` ist oder zu einer `exchange_group` gehört. Die bestehende `set_meal_item_overrides`-Logik (`PUT /{meal_plan_id}/meal-items/{item_id}/overrides/`) prüft das und gibt HTTP 400 zurück. Damit gibt es keine Doppelberechnung. Mitigation: UI blendet den Override-Button für Split-Zutaten aus.

## Migration Plan

1. `RecipeItemExchangeGroup`-Tabelle anlegen (kein Datenmigration nötig)
2. `RecipeItem` um `is_optional`, `exchange_group`, `exchange_position` erweitern (nullable, default False/NULL)
3. `MealItemSplit`-Tabelle anlegen
4. Bestehende Daten: keine Migration nötig — alle bestehenden RecipeItems haben `is_optional=False` und `exchange_group=NULL`
5. Rollback: Alle drei Migrationen rückgängig machen (keine Datenverluste)

## Open Questions

- Soll `RecipeItemExchangeGroup.name` Pflicht sein (z.B. "Käse-Ersatz") oder optional? Aktuell optional — der Name erscheint nur im Editor, nicht in der Einkaufsliste.
- Wie soll die Duplikat-Warnung im Suggestions-Tab mit Splits umgehen? (Entschieden: Warnung auf Rezept-Ebene, Splits ignoriert — aber UI-Text ist noch offen.)
