## Context

Aktuell müssen Rezeptautoren für jede Ernährungsvariante (vegan, glutenfrei, scharf/mild) separate Rezepte anlegen. Das führt zu doppelter Pflege: Änderungen an der Basiszubereitung müssen manuell in alle Varianten übertragen werden.

Das bestehende `MealItemOverride`-Modell erlaubt bereits ad-hoc Zutaten-Ausschlüsse und Mengenänderungen — aber nur für alle Portionen gleichzeitig und ohne Portionen-Split. Es gibt keinen strukturierten Weg, "8 Portionen mit Parmesan, 2 Portionen mit Hefeflocken" abzubilden.

Die Exploration mit dem Stakeholder ergab: Das Kernproblem ist rein eine **Einkaufsmengen-Frage**, nicht eine Esser-Zuordnungs-Frage. Die Lösung braucht kein Konzept "wer isst was", sondern nur "wie viel von welcher Zutat kaufen".

## Goals / Non-Goals

**Goals:**
- Rezeptautoren können Zutaten als optional markieren (`is_optional`)
- Rezeptautoren können Austausch-Ketten definieren (Parmesan ↔ Hefeflocken ↔ Cashew-Creme)
- Planer wählen beim Einplanen Portionen-Anteile pro Exchange-Kette und optionaler Zutat
- Einkaufsliste berechnet Mengen korrekt nach Anteilen
- Nährwerte werden als gewichteter Durchschnitt live berechnet
- Fork eines Rezepts kopiert Exchanges und Optionals vollständig

**Non-Goals:**
- Esser-Zuordnung ("Person X bekommt Variante Y") — nur Mengen zählen
- Bündelung von Exchange-Ketten zu benannten Varianten (kein `RecipeVariant`-Container)
- Caching von Split-Nährwerten
- Änderung an `MealItemOverride` (bleibt parallel für ad-hoc Korrekturen)
- Kochplan-Druckversion (FEAT-019) — wird separat umgesetzt, nutzt aber die hier eingeführten Split-Daten

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
  exchange_group: FK → RecipeItemExchangeGroup (nullable, PROTECT)
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

### Entscheidung 3: Django PROTECT beim Löschen von Ketten-Gliedern

**Gewählt:** `MealItemSplit → RecipeItem` mit `on_delete=PROTECT`. Autor kann ein Ketten-Glied nicht löschen, solange aktive Splits existieren. Fehlermeldung im UI.

**Alternativ:** CASCADE (Splits werden automatisch gelöscht) oder SET_DEFAULT (Splits auf Original zurücksetzen). PROTECT wurde gewählt, weil stille Datenänderungen in Essensplänen anderer Nutzer inakzeptabel sind.

### Entscheidung 4: Nährwerte live berechnen, kein Cache

**Gewählt:** Split-Nährwerte werden bei jeder Anfrage live aus den Zutat-Nährwerten und den Anteilen berechnet. Formel: `Σ (share_i × ingredient_i.energy_kcal × weight_i)`.

**Alternativ:** Cache am MealItem. Verworfen wegen Invalidierungskomplexität (Rezept-Änderung, Split-Änderung, Zutat-Änderung invalidieren alle denselben Cache).

### Entscheidung 5: Einplanen-Dialog zeigt alles sofort

**Gewählt:** Wenn ein Rezept mind. eine Exchange-Gruppe oder optionale Zutat hat, erscheint beim Hinzufügen zum Essensplan sofort ein Konfigurations-Dialog. Defaults werden vorausgefüllt (100% Original).

**Alternativ:** Zweistufig (erst hinzufügen, dann optionaler Dialog). Verworfen — der Planer soll die Entscheidung nicht vergessen.

### Entscheidung 6: Optional und Exchange strikt getrennt

**Gewählt:** Eine Zutat ist entweder `is_optional=True` ODER Teil einer `exchange_group` — nie beides. CHECK CONSTRAINT in der DB.

**Alternativ:** Vereinheitlichung zu Exchange-Ketten mit "Leer"-Glied. Verworfen — UI und mentales Modell sind verschieden (Checkbox vs. Auswahl).

## Datenmodell-Übersicht

```
recipe App:
  RecipeItemExchangeGroup          (neu)
    id, recipe FK, name CharField (optional)

  RecipeItem                       (erweitert)
    + is_optional: BooleanField (default=False)
    + exchange_group: FK → RecipeItemExchangeGroup (nullable, PROTECT)
    + exchange_position: IntegerField (nullable)

planner App:
  MealItemSplit                    (neu)
    id
    meal_item: FK → MealItem (CASCADE)
    recipe_item: FK → RecipeItem (PROTECT)
    share: FloatField (0.0–1.0)
    created_at, updated_at
```

## API-Endpunkte

```
# Exchange-Gruppen (recipe App)
POST   /api/recipes/{recipe_id}/exchanges/              Gruppe anlegen
GET    /api/recipes/{recipe_id}/exchanges/              Alle Gruppen eines Rezepts
DELETE /api/recipes/{recipe_id}/exchanges/{group_id}/   Gruppe löschen (nur wenn keine aktiven Splits)

# RecipeItem Exchange/Optional setzen (recipe App)
PATCH  /api/recipe-items/{item_id}/                     is_optional, exchange_group, exchange_position

# MealItemSplits (planner App)
GET    /api/meal-items/{meal_item_id}/splits/            Alle Splits eines MealItems
PUT    /api/meal-items/{meal_item_id}/splits/            Splits setzen (ersetzt alle, Constraint geprüft)
DELETE /api/meal-items/{meal_item_id}/splits/            Alle Splits löschen (→ zurück auf Default)

# Bestehende Endpunkte werden erweitert:
GET    /api/meal-plans/{id}/shopping-list/              + Split-aware Mengenberechnung
GET    /api/meal-items/{id}/nutrition/                  + gewichteter Durchschnitt bei Splits
```

## Berechnungs-Pipeline (Einkaufsliste)

```
Für jedes MealItem:
  1. Lade alle RecipeItems des Rezepts
  2. Lade MealItemSplits für dieses MealItem
  3. Für jede Zutat:
     a. Hat sie einen Split? → Menge × share × effective_portions × reserve_factor
     b. Ist sie is_optional ohne Split? → eingeschlossen (Default: da)
     c. Ist sie exchange_position=0 ohne Split? → Menge × 1.0 × effective_portions × reserve_factor
     d. Ist sie exchange_position>0 ohne Split? → nicht eingeschlossen
  4. Largest-Remainder-Rundung auf ganze Portionen
  5. Additiv aggregieren über alle MealItems
```

## Fork-Verhalten

Beim Fork (`Recipe.forked_from`) werden alle `RecipeItemExchangeGroup`-Instanzen und zugehörigen `RecipeItem`-Flags (`is_optional`, `exchange_group`, `exchange_position`) vollständig als neue Objekte kopiert. Der Fork ist danach unabhängig vom Original.

## Risks / Trade-offs

**[Komplexität im Einplanen-Dialog]** → Bei vielen Exchange-Ketten und optionalen Zutaten wird der Dialog unübersichtlich. Mitigation: UI gruppiert Exchanges kompakt, zeigt Defaults vorausgefüllt, nur bei Bedarf aufgeklappt.

**[PROTECT kann Frustration erzeugen]** → Autor will ein Ketten-Glied löschen, aber aktive Pläne blockieren es. Mitigation: Fehlermeldung zeigt, in welchen Plänen das Glied verwendet wird.

**[Live-Nährwert kann langsam sein]** → Bei großen Essensplänen mit vielen Splits viele DB-Abfragen. Mitigation: Eager-Loading der RecipeItems + Ingredients in einem Query; bei Performance-Problemen später nachrüsten.

**[Largest-Remainder ist nicht intuitiv]** → Planer sieht "2 Portionen", intern sind es 22,2% gespeichert. Bei Portionsänderung ändert sich die angezeigte Zahl. Mitigation: UI zeigt immer gerechnete Portionen, erklärt Proportionalität kurz.

**[MealItemSplit und MealItemOverride können sich überlappen]** → Planer könnte sowohl einen Split setzen als auch einen Override auf dasselbe RecipeItem. Verhalten: Beide werden addiert; Override hat Vorrang auf die Menge, Split bestimmt die Portionen. Mitigation: UI warnt wenn beides gesetzt ist.

## Migration Plan

1. `RecipeItemExchangeGroup`-Tabelle anlegen (kein Datenmigration nötig)
2. `RecipeItem` um `is_optional`, `exchange_group`, `exchange_position` erweitern (nullable, default False/NULL)
3. `MealItemSplit`-Tabelle anlegen
4. Bestehende Daten: keine Migration nötig — alle bestehenden RecipeItems haben `is_optional=False` und `exchange_group=NULL`
5. Rollback: Alle drei Migrationen rückgängig machen (keine Datenverluste)

## Open Questions

- Soll `RecipeItemExchangeGroup.name` Pflicht sein (z.B. "Käse-Ersatz") oder optional? Aktuell optional — der Name erscheint nur im Editor, nicht in der Einkaufsliste.
- Wie soll die Duplikat-Warnung im Suggestions-Tab mit Splits umgehen? (Entschieden: Warnung auf Rezept-Ebene, Splits ignoriert — aber UI-Text ist noch offen.)
- Kochplan-Druckversion (FEAT-019): Die vollständigen zwei Blöcke pro Exchange-Split brauchen einen eigenen Rendering-Endpunkt — das gehört in den FEAT-019-Change, nicht hierher.
