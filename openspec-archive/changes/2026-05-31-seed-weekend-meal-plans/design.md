## Context

Der Seed-Command (`seed_all.py`) erzeugt bereits 12 Rezepte und 2 MealPlans (7 Tage, 4 Tage). Diese sind zu lang für typische Wochenend-Aktionen. Pfadfinder-Wochenenden laufen meist Fr Abend → So Mittag (2.5 Tage). Die vorhandene Methode `create_meals_for_date_timeaware(date, is_first, is_last)` filtert Mahlzeiten basierend auf Start-/Endzeit korrekt.

## Goals / Non-Goals

**Goals:**
- 5 neue Rezepte + 3 neue Zutaten im Seed ergänzen
- 10 realistische Wochenend-MealPlans (Fr Abend → So Mittag) mit konkreten Rezepten
- Feste Start-/Endzeiten pro MealPlan
- Obstsalat als Snack in jedem Plan
- Seed lokal und auf Prod ausführbar

**Non-Goals:**
- Keine neuen API-Endpunkte
- Keine Schema-Änderungen
- Keine Frontend-Änderungen
- Keine neuen Models oder Migrations

## Decisions

### 1. Erweiterung von `_seed_planner()` statt neuer Methode

Alles in der bestehenden `_seed_planner()` Methode ergänzen. Die neuen Rezepte werden in `_seed_recipes()` ergänzt, neue Zutaten in `_seed_content()`.

**Warum:** Konsistenz mit bestehendem Pattern, keine Fragmentierung.

### 2. `create_meals_for_date_timeaware()` mit `start_datetime`/`end_datetime`

MealPlans bekommen `start_datetime`/`end_datetime` gesetzt. Pro Tag wird `create_meals_for_date_timeaware(date, is_first, is_last)` aufgerufen.

**Warum:** Existierende Methode, Freitag erzeugt nur Dinner, Sonntag nur Breakfast+Lunch.

### 3. Deployment via cloud-sql-proxy

Prod-Ausführung: `cloud-sql-proxy` starten → `DATABASE_URL` auf localhost setzen → `uv run python manage.py seed_all --only recipes && uv run python manage.py seed_all --only planner`.

**Warum:** Kein SSH nötig, direkter DB-Zugriff wie lokal.

### 4. Rezepte vor Planner seeden

Reihenfolge: erst `--only recipes` (inklusive neuer Zutaten in `_seed_content()`), dann `--only planner`. So sind alle Rezepte verfügbar wenn MealPlans erstellt werden.

## Risks / Trade-offs

- **[Idempotenz]** → Bestehende Checks (`MealPlan.objects.filter(name=...).exists()`) verhindern Duplikate. Gleiches Pattern für neue Plans.
- **[Prod-Daten]** → Seed fügt nur hinzu, ändert nichts. Keine Gefahr für bestehende User-Daten.
- **[Reihenfolge]** → `_seed_recipes()` muss vor `_seed_planner()` laufen. Ist bereits so im Code.

## Betroffene Dateien

- `backend/core/management/commands/seed_all.py` — Hauptänderung (Zutaten, Rezepte, MealPlans)
- Keine weiteren Dateien betroffen
- Keine Migrations nötig
- Keine API-Änderungen
