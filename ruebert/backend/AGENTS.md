# Backend-Agent-Regeln

Für projektweite Regeln siehe [`../AGENTS.md`](../AGENTS.md). Diese Datei beschreibt nur die
Backend-Implementierung (Version 2). Vorbild ist `gruppenstunde/backend/AGENTS.md`, übertragen auf
FastAPI und – übergangsweise – DuckDB statt Django Ninja und PostgreSQL.

## Aufbau

| Paket | Inhalt | Darf importieren |
|---|---|---|
| `ruebert/api/` | Router je Bereich, Pydantic-Schemas, Fehlerbehandlung, Paginierung | `domain`, `data`, `journal`, `settings` |
| `ruebert/domain/` | Fachlogik als reine Funktionen (Ampel, Bestellmengen, Verteilung, Fälle) | nur Standardbibliothek und eigene Datentypen |
| `ruebert/data/` | Neuaufbau des abgeleiteten Stands, lesende Repositories | `domain`, `settings` |
| `ruebert/journal/` | Entscheidungs-Journal (Dateien unter `journal/`) | `settings` |
| `ruebert/settings.py` | Konfiguration aus Umgebung und `backend/.env` | – |

## Implementierung

- Python 3.13, Befehle immer mit `uv run` im Ordner `backend/` oder über `make backend-*`.
- **Keine Fachlogik in Endpunkten.** Endpunkte lesen Parameter, rufen `domain`/`data` auf und geben
  typisierte Pydantic-Modelle zurück, keine rohen Dictionaries.
- Fachfunktionen in `domain/` sind rein: keine Datenbank, keine Dateien, keine Uhrzeit. „Heute“ ist
  immer `settings.reference_date` und wird übergeben.
- Fehler mit `HTTPException` und **deutscher** `detail`-Meldung, die man Daniel zeigen kann. Unbekannte
  Fehler beantwortet `api/errors.py` mit 500 ohne interne Details und schreibt sie ins Log.
- Validierungsfehler kommen als `{"detail": "Eingabe ungültig.", "errors": [{"field", "message"}]}`.
- Listen-Endpunkte nutzen `page_params` und liefern `Page[T]`: `page=1`, `page_size=20` (max. 200),
  `{ items, total, page, page_size, total_pages }`. Eine Seite hinter dem Ende ist leer, kein Fehler.
- Statische Routen vor parametrisierten registrieren.
- Kein `print` (ruff `T20`), Logging über `logging.getLogger(__name__)`.

## Daten und Nukebarkeit

- Die v1-DuckDB (`V1_DUCKDB_PATH`) ist Stammsystem: **nur lesend** öffnen (`read_only=True`), nie schreiben.
- Alles, was die API liest, liegt im abgeleiteten Stand (`DERIVED_DB_PATH`, Vorgabe `backend/var/`);
  `make nuke && make rebuild` muss ihn identisch neu erzeugen.
- `make rebuild` baut den Stand aus der Quelle (Stichtag `REFERENCE_DATE`, Vorgabe 18.05.2026), `make nuke`
  löscht nur ihn und seinen Bericht. Der Bericht `backend/var/ruebert.report.json` enthält Prüfsummen,
  Zeilenzahlen, ausgelassene Quellzeilen, die Kalenderkorrektur und den Vergleich mit v1.
- Wochen sind immer ISO-Montage. v1 beschriftet 2026 eine Woche zu spät; `week_start` ist korrigiert,
  `v1_week_start` ist die Beschriftung der Quelle.
- Menschliche Entscheidungen gehen ins Journal (`JOURNAL_DIR`), nie in die Datenbank.
- Beispieldaten tragen `is_sample: true` bis in jede API-Antwort.

## Geheimnisse

- `GITHUB_TOKEN` und andere Zugangsdaten nur aus der Umgebung oder `backend/.env` (git-ignoriert),
  als `SecretStr`. Nie loggen, nie in Antworten, nie ins Repository. Vorlage: `backend/.env.example`.

## Tests und Prüfungen

- Jede Spec-Szenario-Zeile aus `openspec/changes/*/specs/` wird ein Test; neue oder geänderte Endpunkte
  mit Erfolgsfall und relevanten Fehlerfällen (404, 422) testen.
- Tests nutzen die Fixture `settings` (alle Pfade in `tmp_path`) und `make_client`; sie lesen nie
  `backend/.env`, nie `data/` und nie das echte `journal/`.
- Vor Abschluss ausführen:

```bash
make backend-lint backend-typecheck backend-test
```

- pyright ist für `ruebert/` strikt; `Any` aus Fremdbibliotheken an der Grenze in eigene Typen überführen.
