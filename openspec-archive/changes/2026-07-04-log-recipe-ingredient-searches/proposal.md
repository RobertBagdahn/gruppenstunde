## Why

Rezept- und Zutaten-Suchen werden aktuell nicht geloggt — nur die unified search (`/api/content/search/`) schreibt in `SearchLog`. Für Analysen (welche Rezepte/Zutaten werden gesucht, wie oft, mit welchem Ergebnis) fehlen diese Daten vollständig.

## What Changes

- **SearchLog-Logging in `recipe/api/recipes.py`** — bei `GET /api/recipes/` mit `q`-Parameter wird ein `SearchLog`-Eintrag erstellt
- **SearchLog-Logging in `supply/api/ingredients.py`** — bei `GET /api/ingredients/` mit `name`-Parameter wird ein `SearchLog`-Eintrag erstellt
- **Strukturierte Logs nach stdout** — zusätzlich JSON-Logs für Cloud Logging, damit Analysen über Google Cloud Logging / BigQuery möglich sind
- Kein Breaking Change, keine neuen Modelle oder Schemas

## Capabilities

### New Capabilities

- `recipe-search-logging`: Logging von Rezept-Suchanfragen (query, results_count, user) in SearchLog + als strukturiertes JSON-Log
- `ingredient-search-logging`: Logging von Zutaten-Suchanfragen (query, results_count, user) in SearchLog + als strukturiertes JSON-Log

### Modified Capabilities

- `search`: Die Anforderung "Search Logging" wird um Rezept- und Zutaten-Queries erweitert

## Impact

- **Backend**: `backend/recipe/api/recipes.py`, `backend/supply/api/ingredients.py` — ca. 3-5 Zeilen Logging-Aufruf pro Datei
- **Backend**: `backend/content/services/search_service.py` — ggf. Erweiterung von `log_search()` um `session_key`/`ip_hash`
- **Logging**: Zusätzliche JSON-Logs auf stdout (Cloud Logging), zusätzliche SearchLog-DB-Einträge
- **Datenvolumen**: Abhängig von Suchfrequenz, aber `SearchLog` hat keine uniqueness-Constraints — jeder Aufruf erzeugt einen neuen Eintrag
- **Performance**: Minimaler Overhead (ein DB-Insert pro Suchanfrage)
