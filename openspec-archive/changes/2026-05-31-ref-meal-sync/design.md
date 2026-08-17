## Context

Der MealPlan im Planner hat bereits eine Hierarchie: MealPlan → Meal → MealItem. Meals werden automatisch pro Tag erzeugt (breakfast, lunch, dinner, snack). Aktuell muss jedes Meal individuell mit MealItems (Rezepte/Zutaten) befüllt werden. Bei Pfadfinderlagern ist das Frühstück aber meist jeden Tag identisch — das erzeugt redundante Arbeit.

Das Meal-Model hat `start_datetime` als NOT NULL und eine Uniqueness-Constraint auf `(meal_plan, date, meal_type)`. RefMeals brauchen kein Datum.

## Goals / Non-Goals

**Goals:**
- Referenz-Mahlzeiten (RefMeal) als Template innerhalb eines MealPlans, die auf konkrete Meals synchronisiert werden
- Baukasten-UI zum Zusammenklicken von Mini-Rezepten (Frühstück, Snack, Getränk)
- Energie-Normalisierung: Ist vs. Soll-Anzeige mit Möglichkeit zum proportionalen Skalieren
- Seed-Daten: Katalog vordefinierter Frühstücks-Mini-Rezepte mit KI-geschätzten Mengen
- Entkopplung einzelner Meals vom RefMeal

**Non-Goals:**
- Kein neues Model für RefMeal — bestehende Meal-Tabelle wird erweitert
- Keine automatische Erkennung "ähnlicher" Meals
- Keine Echtzeit-Kollaboration (WebSocket) für den RefMeal-Editor
- Keine Änderung am Shopping-List-Export (fließt automatisch korrekt ein)

## Decisions

### 1. RefMeal = Meal mit `is_reference=True` (statt eigenes Model)

**Rationale:** Wiederverwendung der bestehenden MealItem-Infrastruktur. Kein Duplikat-Code für Items, Faktoren, Rezept-Verknüpfungen. Die Sync-Logik ist nur "kopiere Items von A nach B".

**Alternativen verworfen:**
- Eigenes `RefMeal`-Model mit `RefMealItem`: Mehr Code, doppelte Serialisierung, doppelte API-Endpunkte für im Grunde identische Daten.

**Schema-Änderung Meal-Model:**
```python
# backend/planner/models/meal_plan.py — Meal Model
is_reference = models.BooleanField(default=False)
ref_meal = models.ForeignKey("self", null=True, blank=True, on_delete=models.SET_NULL, related_name="synced_meals")
is_synced = models.BooleanField(default=False)
```

**Constraints:**
- `is_reference=True` → `start_datetime` wird nullable (NULL für RefMeals)
- `ref_meal` darf nur auf Meals mit `is_reference=True` zeigen
- Pro `(meal_plan, meal_type)` max 1 RefMeal (unique_together mit Condition)
- `is_synced=True` nur erlaubt wenn `ref_meal` gesetzt

**Migration:** `start_datetime` muss von NOT NULL auf nullable geändert werden. Bestehende Meals bleiben unverändert.

### 2. Sync-Logik: Expliziter Endpunkt statt Signals

**Rationale:** Bei Signal-basierter Sync würde jede Änderung am RefMeal sofort alle Meals updaten — potentiell unerwartet und schwer zu debuggen. Stattdessen: expliziter API-Call "sync jetzt".

**Flow:**
1. User ändert RefMeal-Items
2. Frontend ruft `POST /api/meal-plans/{plan_id}/ref-meals/{meal_id}/sync` auf
3. Backend kopiert alle MealItems des RefMeals auf alle verlinkten Meals (is_synced=True)
4. Bestehende Items der Ziel-Meals werden gelöscht und durch RefMeal-Items ersetzt

**Alternativ:** Sync bei jeder Änderung am RefMeal (über Signal). Verworfen wegen unerwarteter Seiteneffekte und Performance bei vielen Meals.

### 3. Baukasten = Gefilterter Rezept-Picker mit Kategorie-Gruppierung

**Rationale:** Die Mini-Rezepte sind echte `Recipe`-Objekte mit `recipe_type=breakfast|snack|drink`. Der Baukasten ist ein spezieller Picker, der diese Rezepte nach Typ gruppiert als Kacheln anzeigt.

**Keine neue Datenstruktur** — nur eine UI-Optimierung über bestehende Rezept-Suche.

### 4. Energie-Normalisierung im Frontend

**Rationale:** Die Nährwert-Daten sind bereits auf den Rezepten cached (`cached_energy_kj`). Das Frontend rechnet Summe pro Person, vergleicht mit `day_part_factor × Tagesbedarf`, und bietet Skalierung an.

**Kein Backend-Endpunkt nötig** — pure Frontend-Berechnung aus bereits verfügbaren Daten.

### 5. Seed-Rezepte via Management Command

**Rationale:** Konsistent mit bestehendem Pattern (`import_inspi_data`, `import_legacy_food`). KI schätzt Mengen einmalig, Ergebnis wird als JSON-Fixture committed.

**Betroffene Dateien:**
- `backend/recipe/management/commands/seed_breakfast_recipes.py`
- `backend/recipe/fixtures/breakfast_recipes.json` (oder inline im Command)

## API-Endpunkte (neu)

| Methode | Pfad | Beschreibung |
|---------|------|-------------|
| GET | `/api/meal-plans/{plan_id}/ref-meals/` | Liste aller RefMeals eines Plans |
| POST | `/api/meal-plans/{plan_id}/ref-meals/` | RefMeal erstellen (meal_type angeben) |
| GET | `/api/meal-plans/{plan_id}/ref-meals/{id}/` | RefMeal Detail mit Items |
| PUT | `/api/meal-plans/{plan_id}/ref-meals/{id}/` | RefMeal Items aktualisieren |
| DELETE | `/api/meal-plans/{plan_id}/ref-meals/{id}/` | RefMeal löschen (entkoppelt alle Meals) |
| POST | `/api/meal-plans/{plan_id}/ref-meals/{id}/sync` | Sync auf alle verlinkten Meals |
| POST | `/api/meal-plans/{plan_id}/meals/{id}/link` | Meal mit RefMeal verknüpfen |
| POST | `/api/meal-plans/{plan_id}/meals/{id}/unlink` | Meal vom RefMeal entkoppeln |

## Risks / Trade-offs

- **[Risk] `start_datetime` nullable machen** → Migration auf bestehende Daten ist sicher (nur neue RefMeals haben NULL), aber Code der `start_datetime` verwendet muss geprüft werden (ordering, `__str__`, clean-Methode).
  → Mitigation: `ordering` bleibt, NULL-RefMeals erscheinen am Anfang. `__str__` hat bereits "?" Fallback.

- **[Risk] Sync löscht bestehende Items** → Wenn ein User versehentlich synced, gehen manuelle Anpassungen verloren.
  → Mitigation: Nur Meals mit `is_synced=True` werden überschrieben. Entkoppelte Meals bleiben unberührt.

- **[Risk] Viele Mini-Rezepte** → Die Recipe-Tabelle bekommt ~30-50 Seed-Einträge für Frühstück.
  → Akzeptabel, da Rezepte filterbar nach `recipe_type` sind.

- **[Trade-off] Kein partieller Sync** → Es wird immer das komplette RefMeal synchronisiert, nicht einzelne Item-Änderungen.
  → Einfachere Implementierung, weniger Bugs. Für den Use Case (Frühstück = wenige Items) ausreichend.
