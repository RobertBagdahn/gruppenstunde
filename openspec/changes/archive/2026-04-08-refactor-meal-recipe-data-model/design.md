## Context

Das aktuelle Datenmodell hat diese Kette: Event → MealPlan → Meal (date + time) → MealItem → Recipe → RecipeItem → Portion → Ingredient → Price. Nährwert- und Preisberechnungen traversieren diese gesamte Kette bei jedem Request. `MealPlan` ist ein separates Konzept, das optional an ein Event gebunden ist, aber eigentlich immer zu einem Event gehört. Das `Price`-Model hängt an `Portion`, nicht an `Ingredient`, was zu unnötiger Indirektion führt.

**Aktueller Stand:**
- `MealPlan` (planner app): name, slug, description, norm_portions, activity_factor, reserve_factor, event FK (nullable)
- `Meal`: meal_plan FK, date, meal_type, time_start, time_end, day_part_factor
- `MealItem`: meal FK, recipe FK, factor
- `Recipe` (recipe app, erbt Content): recipe_type, servings, nutritional_tags M2M
- `RecipeItem`: recipe FK, portion FK (nullable), ingredient FK (nullable), quantity, measuring_unit FK, sort_order, note, quantity_type
- `Ingredient` (supply app): 30+ Felder inkl. Nährwerte, Scores, price_per_kg
- `Portion`: name, measuring_unit FK, ingredient FK, quantity, weight_g
- `Price`: portion FK, price_eur, quantity, name, retailer, quality
- `RecipeHint`: regelbasierte Tipps mit Schwellenwerten

**Constraints:**
- Keine Rückwärtskompatibilität nötig
- PostgreSQL 15, Django 5.1, Django Ninja, Pydantic v2
- Alle Python-Befehle über `uv run`
- Pydantic ↔ Zod Schema-Sync erforderlich

## Goals / Non-Goals

**Goals:**
- Flacheres Datenmodell: Price entfernen, MealPlan → MealEvent umbenennen, Meal mit Start/End-Datetime
- Denormalisierte Nährwert-Cache-Felder auf Recipe für schnelle Listenansichten
- Cockpit-Dashboard mit Ampel-Indikatoren auf allen Ebenen (MealEvent, Tag, Meal, Recipe, Ingredient)
- Konfigurierbare HealthRule-Einträge in DB für Schwellenwerte
- Erweiterte Normportion-Graphen mit Ist vs. Soll Vergleich
- Automatische Tipps nach festen Regeln

**Non-Goals:**
- Keine User-Authentifizierung-Änderungen
- Kein neues Frontend-Framework oder UI-Library
- Keine Änderung der Content-Basis-Architektur
- Keine Änderung der Event-Kernfunktionalität (Registrierung, Teilnehmer, Zahlungen)
- Keine AI-Feature-Änderungen
- Kein Portion-Model entfernen (bleibt als Umrechnungshilfe)

## Decisions

### D1: Price-Model entfernen → nur price_per_kg auf Ingredient

**Entscheidung:** Das `Price`-Model wird komplett entfernt. `Ingredient.price_per_kg` (bereits vorhanden) wird zum einzigen Preisfeld.

**Rationale:** Der User will nur einen Preis pro Zutat. Das aktuelle System mit Price → Portion → Ingredient ist eine Dreifach-Indirektion für eine einzige Zahl. Die Preiskaskade (`price_service.py`) wählt ohnehin den günstigsten Preis und schreibt ihn in `price_per_kg`.

**Alternative verworfen:** Price an Ingredient statt Portion hängen — immer noch unnötige Komplexität für "einen Preis pro Zutat".

**Betroffene Dateien:**
- `backend/supply/models/ingredient.py` — Price-Klasse entfernen
- `backend/supply/services/price_service.py` — Vereinfachen (kein Kaskaden-Lookup mehr)
- `backend/supply/schemas/` — PriceSchema entfernen
- `backend/supply/api/` — Price-Endpunkte entfernen
- `frontend/src/schemas/supply.ts` — Price-Zod-Schema entfernen
- `frontend/src/api/supplies.ts` — Price-API-Calls entfernen

**Migration:** `price_per_kg` existiert bereits auf Ingredient. Bestehende Price-Einträge werden ignoriert (Daten waren ohnehin schon in price_per_kg konsolidiert). Price-Tabelle wird per Migration gedroppt.

### D2: MealPlan → MealEvent umbenennen

**Entscheidung:** `MealPlan` wird zu `MealEvent`. Das Model bleibt in der `planner`-App, bekommt aber den neuen Namen, um die direkte Event-Zugehörigkeit deutlicher zu machen.

**Rationale:** "MealEvent" kommuniziert besser, dass es um einen Essensplan für ein Event geht. Der FK zu Event bleibt nullable für standalone-Nutzung (z.B. Wochenplanung ohne Event).

**Alternative verworfen:** MealPlan in die event-App verschieben — würde zirkuläre Dependencies erzeugen (event ↔ recipe).

**Betroffene Dateien:**
- `backend/planner/models/meal_plan.py` — Klasse umbenennen, db_table setzen
- `backend/planner/schemas/` — Schema umbenennen
- `backend/planner/api/` — Endpunkte umbenennen
- `frontend/src/schemas/mealPlan.ts` → `mealEvent.ts`
- `frontend/src/api/mealPlans.ts` → `mealEvents.ts`
- `frontend/src/pages/planning/` — Page-Komponenten umbenennen

### D3: Meal mit start_datetime/end_datetime statt date + time_start/time_end

**Entscheidung:** `Meal` bekommt `start_datetime` (DateTimeField) und `end_datetime` (DateTimeField) statt separate `date`, `time_start`, `time_end` Felder. Tagesgruppierung wird per `start_datetime__date` in Queries berechnet.

**Rationale:** Vereinfacht die Datenstruktur und eliminiert die Notwendigkeit für ein MealDay-Modell. Ein einzelnes datetime-Feld ist natürlicher als date + time separat. Tagesgruppierungen können effizient per `TruncDate` oder `__date` Lookup berechnet werden.

**DB-Index:** `start_datetime` bekommt einen Index für effiziente Tages-Queries.

**Unique Constraint:** `(meal_event, start_datetime__date, meal_type)` — technisch als functional unique constraint oder per Validierung im save().

**Betroffene Dateien:**
- `backend/planner/models/meal_plan.py` — Meal-Felder ändern
- `backend/planner/schemas/` — MealSchema anpassen
- `backend/planner/api/` — Queries anpassen für Tagesgruppierung

### D4: Denormalisierte Nährwerte auf Recipe

**Entscheidung:** Recipe bekommt Cache-Felder für aggregierte Nährwerte je Normportion:
- `cached_energy_kj`, `cached_protein_g`, `cached_fat_g`, `cached_carbohydrate_g`, `cached_sugar_g`, `cached_fibre_g`, `cached_salt_g` (alle FloatField, nullable)
- `cached_nutri_class` (IntegerField 1-5, nullable)
- `cached_price_total` (DecimalField, nullable)
- `cached_at` (DateTimeField, nullable)

**Invalidierung:** Django post_save Signal auf RecipeItem und Ingredient. Bei Änderung wird `cached_at = None` gesetzt → ein Management-Command oder Celery-Task berechnet die Werte neu. Alternativ: synchrone Neuberechnung im save()-Pfad (akzeptabel bei <50 RecipeItems).

**Rationale:** Listenansichten müssen Nutri-Score-Badges und Preise zeigen, ohne 4 Joins pro Rezept zu machen. Die Berechnung läuft einmal und wird gecacht.

**Betroffene Dateien:**
- `backend/recipe/models/recipe.py` — Cache-Felder hinzufügen
- `backend/recipe/signals.py` — Neu, Invalidierung
- `backend/recipe/services/recipe_checks.py` — Cache-Update-Logik
- `backend/recipe/schemas/` — Cache-Felder in Response-Schema

### D5: HealthRule-Model für konfigurierbare Ampel-Schwellenwerte

**Entscheidung:** Neues Model `HealthRule` in der `recipe`-App (da es eng mit RecipeHint verwandt ist):

```python
class HealthRule(models.Model):
    name = CharField(max_length=100)
    description = TextField(blank=True)
    parameter = CharField(max_length=50)  # z.B. "energy_kj", "sugar_g", "price_total"
    scope = CharField(choices=["meal_event", "day", "meal", "recipe", "ingredient"])
    threshold_green = FloatField()  # bis hierher grün
    threshold_yellow = FloatField()  # bis hierher gelb, darüber rot
    unit = CharField(max_length=20)  # z.B. "g", "kJ", "EUR"
    tip_text = TextField(blank=True)  # Empfehlung bei Rot/Gelb
    is_active = BooleanField(default=True)
    sort_order = IntegerField(default=0)
```

**Rationale:** User will konfigurierbare Regeln. Das RecipeHint-Model ist ähnlich, aber HealthRule ist allgemeiner (gilt auf allen Ebenen, nicht nur Recipe). RecipeHint bleibt für rezeptspezifische Tipps.

**API-Endpunkte:**
- `GET /api/health-rules/` — Alle aktiven Regeln (öffentlich, gecacht)
- `GET /api/meal-events/{id}/cockpit/` — Aggregierte Ampel-Daten für das gesamte MealEvent
- `GET /api/meal-events/{id}/cockpit/day/?date=YYYY-MM-DD` — Ampel-Daten für einen Tag
- `GET /api/meals/{id}/cockpit/` — Ampel-Daten für eine Mahlzeit

### D6: Normportion-Graphen mit DGE-Referenzwerten als statische Daten

**Entscheidung:** DGE-Referenzwerte (Kalorien, Protein, Fett, KH, Ballaststoffe nach Alter × Geschlecht × Aktivität) werden als Python-Dict in `backend/supply/data/dge_reference.py` gespeichert. Der bestehende `norm_person_service.py` wird erweitert.

**Rationale:** DGE-Werte ändern sich selten (<1x pro Jahr). Statische Daten sind schneller als DB-Lookups und brauchen keine Migrationen bei Updates.

**Neue API-Endpunkte:**
- `GET /api/norm-person/dge-reference/` — Alle DGE-Referenzwerte (für Graph-Rendering)
- Bestehende Endpunkte `/api/norm-person/calculate` und `/api/norm-person/curves` bleiben

**Betroffene Dateien:**
- `backend/supply/data/dge_reference.py` — Neu, statische Daten
- `backend/supply/services/norm_person_service.py` — DGE-Daten integrieren
- `backend/supply/api/norm_person.py` — Neuer Endpunkt
- `frontend/src/pages/tools/NormPortionSimulatorPage.tsx` — Erweiterte Graphen

## Risks / Trade-offs

**[Denormalisierung wird stale]** → Cache-Invalidierung per Django Signals. `cached_at` Feld zeigt, wann zuletzt berechnet. Management-Command `recalculate_recipe_caches` für Bulk-Updates. Im schlimmsten Fall zeigt die UI leicht veraltete Werte für wenige Sekunden.

**[MealPlan → MealEvent Rename bricht alle URLs]** → Keine Rückwärtskompatibilität nötig. Frontend und Backend werden gleichzeitig deployed. API-Pfade ändern sich von `/api/meal-plans/` zu `/api/meal-events/`.

**[Price-Model entfernen verliert historische Preisdaten]** → Akzeptabel. `price_per_kg` auf Ingredient enthält den aktuellen Preis. Historische Preisvergleiche sind kein Requirement.

**[HealthRule-Regeln können widersprüchlich sein]** → Validierung im Admin: Schwellenwerte müssen `threshold_green < threshold_yellow` sein. Scope-Konflikte werden per Sortierung gelöst (niedrigere sort_order gewinnt bei Duplikaten).

**[Unique Constraint auf Meal mit date-Extraktion]** → PostgreSQL unterstützt functional unique constraints nicht direkt in Django ORM. Alternative: Validierung in `clean()`/`save()` + DB-Level partial index. Oder: `date` als separates Feld behalten (redundant aber simpel für den Constraint).

## Migration Plan

### Phase 1: Backend-Datenmodell (destruktive Migrationen)
1. Recipe Cache-Felder hinzufügen (additive, safe)
2. HealthRule-Model erstellen (additive, safe)
3. Meal-Felder ändern: date+time_start+time_end → start_datetime+end_datetime (Datenmigration)
4. MealPlan → MealEvent umbenennen (db_table + Klassennamen)
5. Price-Model entfernen (drop table)
6. Signals für Cache-Invalidierung einrichten

### Phase 2: Backend-Services & APIs
1. price_service.py vereinfachen
2. recipe_checks.py auf Cache umstellen
3. Neuer cockpit_service.py
4. API-Endpunkte umbenennen und erweitern
5. Pydantic-Schemas aktualisieren

### Phase 3: Frontend
1. Zod-Schemas synchronisieren
2. API-Hooks aktualisieren
3. Pages umbenennen und Cockpit-Tab hinzufügen
4. Ampel-Komponenten erstellen
5. Normportion-Graphen erweitern

### Rollback-Strategie
Kein Rollback nötig — aktive Entwicklung ohne Produktionsdaten. Bei Problemen: Git revert.

## Open Questions

1. **Meal date als separates Feld behalten?** Für den Unique Constraint `(meal_event, date, meal_type)` wäre ein separates `date` Feld einfacher als eine Extraktion aus `start_datetime`. Trade-off: Redundanz vs. Einfachheit. Empfehlung: `date` als computed/redundantes Feld behalten, per Signal aus `start_datetime` abgeleitet.

2. **HealthRule-Scope "day"**: Da kein MealDay-Model existiert, werden Tages-Aggregationen per Query berechnet. Ist die Performance akzeptabel für Events mit 14+ Tagen und je 3 Mahlzeiten? Vermutlich ja — max ~50 Meals pro MealEvent.
