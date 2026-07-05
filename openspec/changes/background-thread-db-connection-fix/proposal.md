## Why

In Produktion sind auf der `db-f1-micro`-Cloud-SQL-Instanz (max. 25 Verbindungen) wiederholt `FATAL: remaining connection slots are reserved for non-replication superuser connections`-Fehler aufgetreten, gefolgt von kaskadierenden `AttributeError: 'SessionStore' object has no attribute '_session_cache'`-Fehlern. Ursache sind vier Fire-and-Forget-Hintergrund-Threads (`supply/signals.py`, `recipe/signals.py` x3), die bei jedem Ingredient-/Recipe-Save je eine eigene, mit `CONN_MAX_AGE=60` lang gehaltene DB-Connection öffnen — bei parallelen Saves (z.B. AI-Suggest „Alle übernehmen") reicht das aus, um den Connection-Pool zu erschöpfen. Zusätzlich wurde bei einer Code-Review der Alias-Erstellung (`supply/api/ingredients.py::create_alias`) eine Race Condition gefunden: Namens-Duplikat-Checks laufen außerhalb der `select_for_update()`-Transaktion und ohne passenden DB-Constraint, wodurch parallele Requests unbemerkt doppelte Aliase für dieselbe Zutat anlegen können (bereits in Produktionsdaten beobachtet).

## What Changes

- **Zentraler Background-Task-Helper**: Neue Funktion (z.B. `core/services/background.py::run_in_background()`), die einen Daemon-Thread startet, der eine eigene kurzlebige DB-Connection öffnet und nach Abschluss explizit über `connection.close()` schließt, statt sich auf den `CONN_MAX_AGE=60`-Timeout des Connection-Handlings zu verlassen.
- **Migration aller vier Fire-and-Forget-Stellen** auf den neuen Helper: `supply/signals.py::update_ingredient_embedding_and_score`, `recipe/signals.py::update_recipe_embedding`, `recipe/signals.py::invalidate_recipe_embedding_on_item_change`, `recipe/signals.py::update_type_stats_on_recipe_change`.
- **Alias-Race-Condition beheben** (`supply/api/ingredients.py::create_alias`): Duplikat-Checks (Name pro Zutat) wandern in die bestehende `atomic()`/`select_for_update()`-Transaktion.
- **BREAKING** (Datenmodell): Neuer `UniqueConstraint(Lower("name"), ingredient)` auf `IngredientAlias` — verhindert doppelte Alias-Namen (case-insensitive) für dieselbe Zutat auf DB-Ebene. Migration erfordert vorherige Bereinigung bestehender Duplikate in Produktionsdaten.
- **`rank`-Default entfernen**: `AliasCreateIn.rank` verliert den Default `1`; der Rank wird immer serverseitig aus den bestehenden Rängen der Zutat berechnet (vermeidet unnötigen Write+Rollback in der ersten Retry-Iteration).

## Capabilities

### New Capabilities
(keine)

### Modified Capabilities
- `ingredient-generic-aliases`: Neue Anforderung — Alias-Namen (case-insensitive) müssen innerhalb derselben Zutat eindeutig sein, durchgesetzt per DB-`UniqueConstraint` statt nur per Applikations-Check.

## Impact

- **Backend-Apps**: `core` (neuer `services/background.py`-Helper), `supply` (`signals.py`, `api/ingredients.py`, Migration für neuen `UniqueConstraint` auf `IngredientAlias`, Daten-Cleanup-Script für bestehende Duplikate), `recipe` (`signals.py`, drei Signal-Handler auf den neuen Helper umgestellt).
- **Schemas**: `AliasCreateIn` (Pydantic) verliert den `rank`-Default; entsprechendes Zod-Schema im Frontend anpassen.
- **Migrationen**: Neue Django-Migration auf `IngredientAlias` für den `UniqueConstraint`; vorgeschaltetes Daten-Cleanup (Duplikate identifizieren/mergen) vor Anwendung der Migration in Produktion.
- **Kein Job-Queue-Wechsel**: Die Fire-and-Forget-`threading.Thread`-Architektur bleibt bestehen (kein Celery/RQ), nur das Connection-Handling innerhalb der Threads ändert sich.
- **Kein Cloud-SQL-Instanz-Upgrade**: Fix ist rein code-seitig, `db-f1-micro` bleibt unverändert.
- **Tests**: Neue Concurrency-Tests (Threading-Simulation) für Connection-Handling und Alias-Race-Condition.
