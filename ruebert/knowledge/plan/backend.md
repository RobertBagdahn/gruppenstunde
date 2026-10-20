---
type: plan
title: "Backend"
description: "Aufbau des FastAPI-Backends: Pakete, Pipeline-Runner, Jobs, Entscheidungs-Journal, ERP-Adapter, API-Konventionen und Tests."
tags: [plan, backend, fastapi, pipeline, tests]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Backend

## Kurzfassung

Das Backend ist ein Python-Paket `flower_demand` mit klar getrennten Modulen für API, Pipeline,
Nachfrage, Prognose, Planung, ERP und Journal. Dieselbe Logik läuft über drei Eingänge: REST-API
(FastAPI), Worker-Jobs und die Kommandozeile `fd`. Geschäftslogik liegt in Services und reinen
Funktionen, nie in Endpunkten. Die Pipeline ist eine Folge deklarierter Schritte mit Ein- und
Ausgabetabellen. Tests prüfen Fachregeln mit Szenarien aus den Specs und den Rebuild auf festen
Testdaten. Die Regeln orientieren sich am Backend des Food-Projekts, angepasst an FastAPI.

## Inhalt

- [Pakete](#pakete)
- [Pipeline-Runner](#pipeline-runner)
- [Entscheidungs-Journal](#entscheidungs-journal)
- [ERP-Adapter](#erp-adapter)
- [API-Konventionen](#api-konventionen)
- [Tests](#tests)
- [Prototyp-Stand (Rübert-Demo)](#prototyp-stand-rübert-demo)

## Pakete

| Paket | Verantwortung |
|---|---|
| `core/` | Einstellungen, DB-Sitzung, Zeit/KW-Helfer, Formatierung, Fehler |
| `pipeline/` | Schritt-Registry, Runner, `extract`, `staging`, `core`-Aufbau, Rebuild, Verify |
| `quality/` | Prüfkatalog A-01 … A-18, Fälle, Datenqualitätsbericht |
| `demand/` | Klassifikation, Set/Bundle-Auflösung, Bestandsverlauf, Zensur, Wochenreihen |
| `forecast/` | Modelle, Ensemble, Quantile, Erklärung, Backtests, Saisonfortschritt |
| `planning/` | Ampel, Reichweite, Bestellplaner Eigenmarke, Fremdmarken-Vorschläge, Rundung |
| `erp/` | Adapter-Interface, Implementierung neues ERP, Archiv-Adapter, Aufrufprotokoll |
| `journal/` | Journal schreiben, committen, einlesen, Projektion |
| `api/` | FastAPI-Router je Bereich, Pydantic-Schemas, Auth |
| `cli.py` | Typer-Befehle `fd …` |

## Pipeline-Runner

```python
@step(name="demand.weekly", inputs=["demand.classified_movement", "core.product_relation"],
      outputs=["demand.weekly"])
def build_weekly_demand(ctx: StepContext) -> StepResult: ...
```

- Schritte deklarieren Ein- und Ausgaben; der Runner ermittelt die Reihenfolge.
- Jeder Schritt schreibt vollständig neu (`truncate + insert`) oder inkrementell mit identischem Ergebnis.
- Kontext enthält `as_of`, `pipeline_run_id`, Seed, Journal-Commit.
- `fd rebuild [--as-of DATUM] [--from SCHRITT]`, `fd nuke --yes`, `fd verify`.
- Jeder Lauf schreibt Dauer, Zeilen und Prüfsummen je Ausgabetabelle nach `ops`.

## Entscheidungs-Journal

- Ablage: eigenes Git-Repository, eine JSONL-Datei je Monat und Typ, Einträge append-only.
- Schreiben: API → `journal.append(entry)` → Datei schreiben → `git commit` → Projektion in DB.
  Fehlschlag beim Commit = Fehler für den Nutzer; nichts landet nur in der DB.
- Push zum Remote nach jedem Commit (asynchron mit Wiederholung).
- Schemas der Einträge als Pydantic-Modelle mit Versionsfeld; alte Versionen bleiben lesbar.
- Konflikte sind ausgeschlossen, weil nur der Server schreibt; manuelle Änderungen per Pull Request.

## ERP-Adapter

```python
class ErpAdapter(Protocol):
    def products(self, since: datetime | None) -> Iterable[RawRecord]: ...
    def stock(self) -> Iterable[RawRecord]: ...
    def movements(self, since: datetime) -> Iterable[RawRecord]: ...
    def order_lines(self, since: datetime) -> Iterable[RawRecord]: ...
    def purchase_orders(self, since: datetime | None) -> Iterable[RawRecord]: ...
    def create_purchase_order_draft(self, draft: PurchaseOrderDraft, idempotency_key: str) -> ErpRef: ...
```

- `LegacyArchiveAdapter` liest das Altdaten-Archiv und prüft das Manifest (A-02).
- `FakeErpAdapter` mit Testdaten für Entwicklung und CI; Schreibzugriffe nur mit Schalter.
- Jeder Aufruf wird protokolliert; Wiederholung mit Backoff bei temporären Fehlern.

## API-Konventionen

Übernommen aus dem Food-Backend und an FastAPI angepasst:

- Router je Bereich (`/api/traffic-light`, `/api/products/{sku}`, `/api/order-plans`, `/api/cases`, …).
- Typisierte Pydantic-Antworten, keine rohen Dicts; Fehler als `HTTPException` mit deutscher Meldung im Feld `detail`.
- Listen: `page=1`, `page_size=50`, Antwort `{ items, total, page, page_size, total_pages }`.
- Berechtigungen serverseitig; Ressourcen liefern `can_edit`, das Frontend rechnet keine Rechte.
- Lange Aktionen als Job: `POST` startet, Antwort `job_id`, Status über `/api/jobs/{id}`.
- OpenAPI ist der Vertrag; Änderungen am Schema erzeugen neue Frontend-Typen (`make api-types`).

## Tests

| Ebene | Inhalt |
|---|---|
| Unit | Rundung, Raster, Reichweite, Zensur, Klassifikationsregeln, Set/Bundle-Auflösung, Servicegrad |
| Szenario | Fälle aus Specs und Chat (DGW097, 20.207, DGW042/DGW054) als feste Tests |
| Pipeline | Rebuild auf Fixture-Archiv (kleiner, anonymisierter Ausschnitt), Determinismus (zweimal → gleiche Prüfsummen) |
| API | Happy Path und Fehlerfälle je Endpunkt, Auth |
| Prognose | Smoke-Test je Modell, Backtest auf Fixture, keine negativen Quantile, Quantile monoton |

Befehle: `uv run pytest`, `uv run ruff check`, `uv run mypy`, `make rebuild-test`.

## Prototyp-Stand (Rübert-Demo)

Stand 20.10.2026, Change [`ruebert-demo-prototype`](../../openspec/changes/ruebert-demo-prototype/tasks.md).
Der Prototyp läuft mit DuckDB als abgeleitetem Stand, weil PostgreSQL noch kein Proposal hat (AGENTS, „Was NICHT tun“).

| Paket | Inhalt im Prototyp |
|---|---|
| `ruebert/api/` | Router je Bereich, Pydantic-Antworten, deutsche Fehler, Paginierung `Page[T]` |
| `ruebert/domain/` | Reine Funktionen: Ampel, Rundung, Tranche, Ausreißer, Herleitung, Parameter |
| `ruebert/data/` | Neuaufbau des abgeleiteten Stands (read-only auf die v1-DuckDB), Fälle, Vergleichsbericht |
| `ruebert/journal/` | Entscheidungen als YAML-Dateien, neuester Eintrag je Subjekt gewinnt |
| `ruebert/feedback/` | GitHub-Client für Issues und Labels, Journal-Fallback, Wiederholung |

Abweichungen von der Paketliste oben: `core/`, `pipeline/`, `quality/`, `demand/` und `forecast/` gibt
es im Prototyp nicht. Die Prognose kommt aus dem v1-Lauf 25 und wird nicht neu berechnet; die
Fachlogik liegt in `domain/` als reine Funktionen, nicht in den Endpunkten.

Die Journal-Einträge liegen außerhalb der Datenbank und überleben jeden `make nuke`. Der Vergleich mit
v1 steht im Bericht des Neuaufbaus (`backend/var/ruebert.report.json`).

## Offene Fragen

- [Q-021: Welches ERP ist im Einsatz?](../open-questions/q-021-erp-name.md)
- [Q-085: Gibt es API-Doku und Testzugang?](../open-questions/q-085-erp-api-doku.md)
- [Q-087: Was soll im ERP angelegt werden?](../open-questions/q-087-erp-objekt.md)

## Verwandte Seiten

- [Zielarchitektur](zielarchitektur.md)
- [Datenmodell](datenmodell.md)
- [Anforderungen ERP-Integration](../requirements/fa-erp-integration.md)
- [Datenpipeline und Neuaufbau](../data/datenpipeline-und-neuaufbau.md)
- [Spec-Driven Development](spec-driven-development.md)
