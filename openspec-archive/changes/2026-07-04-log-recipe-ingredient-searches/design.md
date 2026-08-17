## Context

Rezept- und Zutaten-Suchanfragen werden aktuell nicht geloggt. Nur die unified search (`/api/content/search/`) ruft `log_search()` auf. Für Analysen (Suchtrends, häufige Suchbegriffe, erfolglose Suchen) fehlen diese Daten. Die `SearchLog`-Tabelle und `log_search()`-Funktion existieren bereits und können wiederverwendet werden. Zusätzlich sollen strukturierte JSON-Logs auf stdout geschrieben werden, damit sie in Cloud Logging (Google Cloud) landen.

## Goals / Non-Goals

**Goals:**

- Rezept-Suchen (`GET /api/recipes/?q=...`) in `SearchLog` + stdout JSON loggen
- Zutaten-Suchen (`GET /api/ingredients/?name=...`) in `SearchLog` + stdout JSON loggen
- Wiederverwendung der existierenden `SearchLog`-Tabelle und `log_search()`-Funktion
- Strukturierte JSON-Logs (event, query, results_count, user_id, timestamp, source) für Cloud Logging

**Non-Goals:**

- Keine neuen Datenbank-Modelle oder Migrationen
- Keine Änderungen an der unified search (`/api/content/search/`)
- Kein Frontend-Code (keine Zod-Schemas, keine React-Komponenten)
- Keine Analytics-Dashboards oder Reports — nur Rohdaten erfassen
- Keine Änderung der API-Responses (kein Breaking Change)
- Keine Such-Logs für Autocomplete-Endpunkte

## Decisions

### 1. Wiederverwendung von `log_search()` statt eigenem Service

- **Entscheidung**: Die bestehende `log_search()`-Funktion in `content/services/search_service.py` wird in beiden Endpunkten aufgerufen.
- **Begründung**: `SearchLog`-Modell und `log_search()` sind genau für diesen Zweck konzipiert. Ein eigener Service würde nur duplizieren.
- **Alternative**: Direktes `SearchLog.objects.create(...)` in den API-Endpunkten — abgelehnt, weil Konsistenz mit unified search erhalten bleiben soll.

### 2. Separater `log_search_structured()`-Helper für JSON-Logs

- **Entscheidung**: Eine neue Funktion `log_search_structured()` wird in `search_service.py` ergänzt, die ein strukturiertes JSON-Dikt via `logging.getLogger(__name__).info()` ausgibt.
- **Begründung**: JSON-Logs sind in Cloud Logging filter- und analysierbar (via Log Explorer / BigQuery). Ein separater Helper hält die Log-Formatierung zentral.
- **Kein `structlog`**: Das Projekt verwendet kein `structlog`. Ein simpler `json.dumps()`-Aufruf mit `logging.info()` ist ausreichend und vermeidet eine neue Dependency.

### 3. `source`-Feld zur Unterscheidung der Herkunft

- **Entscheidung**: Die bestehende `SearchLog`-Tabelle bekommt kein `source`-Feld (keine Migration nötig). Die Unterscheidung erfolgt ausschließlich über den `query`-Kontext und das JSON-Log-`source`-Feld.
- **Begründung**: Für die Analyse in Cloud Logging reicht das `source`-Feld im JSON-Log. Für DB-Analysen kann später eine Migration ergänzt werden.
- **Risiko**: In `SearchLog` (DB) ist nicht unterscheidbar, ob ein Query von unified search, recipe list oder ingredient list stammt. Akzeptiert — aktuell nicht benötigt.

### 4. Ergebnisanzahl (`results_count`) nach DB-Query

- **Entscheidung**: `results_count` wird aus der bereits vorhandenen `total`-Variable der Paginierung übernommen — kein zusätzlicher DB-Query nötig.
- **Begründung**: Die Paginierung berechnet `total` bereits. Diese Zahl wird direkt an `log_search()` übergeben.

## Risks / Trade-offs

- **Datenvolumen**: `SearchLog` hat keine Uniqueness-Constraints. Jeder Seitenaufruf mit Query erzeugt einen neuen Eintrag. Bei hohem Traffic kann die Tabelle schnell wachsen. → Bereits existierende `cleanup_analytics`-Management-Command löscht Einträge älter als 12 Monate.
- **Performance**: Ein zusätzlicher DB-Insert pro Suchanfrage. Bei einer Suchfrequenz von <100 req/s vernachlässigbar. → Bei Bedarf asynchron via Hintergrund-Task (derzeit nicht nötig).
- **Log-Menge**: Zusätzliche stdout-Logs. Cloud Logging kostet nach Datenvolumen. → JSON-Logs sind kompakt (~150 Bytes pro Eintrag) und verursachen bei realistischer Suchfrequenz keine signifikanten Kosten.
