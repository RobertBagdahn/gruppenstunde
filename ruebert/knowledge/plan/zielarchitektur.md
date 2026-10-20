---
type: plan
title: "Zielarchitektur"
description: "Container, Komponenten, Technologie-Stack und Datenfluss von Flower-Demand Version 2 auf Daniels interner VM."
tags: [plan, architektur, fastapi, postgresql, docker]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [arbeitsentscheidungen, chat-daniel]
---

# Zielarchitektur

## Kurzfassung

Flower-Demand Version 2 besteht aus vier Containern auf Daniels Ubuntu-VM: PostgreSQL, eine FastAPI-API,
ein Worker für Pipeline- und Prognose-Jobs und ein Webserver für das React-Frontend. Daten fließen
aus dem neuen ERP (API), dem eingefrorenen Altdaten-Archiv und dem Shop durch eine Pipeline in
Schichten. Menschliche Entscheidungen liegen in einem eigenen Git-Repository (Entscheidungs-Journal).
Bestellentwürfe gehen nach Freigabe per API zurück ins ERP. Alles außer Journal und Archiv ist
abgeleitet und jederzeit neu aufbaubar.

## Inhalt

- [Systemüberblick](#systemüberblick)
- [Container](#container)
- [Technologie-Stack](#technologie-stack)
- [Repository-Struktur](#repository-struktur)
- [Datenfluss einer Woche](#datenfluss-einer-woche)

## Systemüberblick

```text
 Stammsysteme                       Ubuntu-VM (Docker Compose)                      Nutzer
┌──────────────┐   API    ┌──────────────────────────────────────────────┐
│ neues ERP    │◀────────▶│ worker  ── Pipeline: extract→raw→…→planning   │
│ (+ MCP)      │ Entwürfe │   │        Prüfungen, Prognose, Backtests     │
├──────────────┤          │   ▼                                           │
│ Altdaten-    │──read───▶│ postgres  (Schemas raw … planning, ops, auth) │
│ Archiv (ro)  │          │   ▲                                           │      Browser
├──────────────┤          │ api (FastAPI) ── REST /api, OpenAPI           │◀──── web (nginx +
│ Shopify      │──read───▶│   │                                           │      React/TS)
└──────────────┘          │   └─ schreibt Entscheidungen ──▶ journal/ ────┼──▶ Git-Remote
                          └──────────────────────────────────────────────┘
```

## Container

| Container | Inhalt | Volumes |
|---|---|---|
| `db` | PostgreSQL 17 | `pgdata` (nukebar) |
| `api` | FastAPI mit Uvicorn, Session-Auth, REST-Endpunkte, OpenAPI | `journal` (rw), `archive` (ro) |
| `worker` | gleiches Image wie `api`; Job-Queue in PostgreSQL, Zeitplan für Nachtlauf, Pipeline, Prognose | `journal` (ro), `archive` (ro) |
| `web` | nginx mit gebautem Frontend, Proxy `/api` → `api` | – |

Keine weiteren Dienste (kein Redis, kein Airflow, kein separates ML-System). Wenige Teile erleichtern
die agentische Wartung.

## Technologie-Stack

| Bereich | Wahl | Begründung |
|---|---|---|
| Backend | Python 3.12, FastAPI, Pydantic v2 | Vorgabe; gleiches Ökosystem wie Prognose |
| DB-Zugriff | SQLAlchemy 2 (Core für Pipeline, ORM für App-Tabellen), psycopg 3, Alembic | etabliert, gut für Agents |
| Datenverarbeitung | Polars + SQL in PostgreSQL | schnell, v1 nutzte bereits Polars |
| Prognose | statsforecast, lightgbm, scikit-learn, shap | aus v1 bewährt |
| Jobs | PostgreSQL-basierte Queue (z. B. Procrastinate) + Zeitplan im Worker | keine Zusatzdienste |
| CLI | Typer: `fd extract`, `fd rebuild`, `fd forecast` … | gleiche Befehle lokal, im Job, in CI |
| Frontend | React 18, TypeScript strict, Vite, Tailwind, shadcn/ui, TanStack Query, Zod, React Router, Recharts | wie Food-Frontend |
| API-Vertrag | OpenAPI aus FastAPI → generierte TS-Typen und Zod-Schemas | kein Auseinanderlaufen |
| Qualität | ruff, mypy, pytest, ESLint, Vitest, Playwright, Wiki-Linter | Prüfkette für Agents |
| Werkzeuge | uv, npm, make, Docker Compose | einfache Befehle |

Begründungen und Alternativen: [Arbeitsentscheidungen](../sources/arbeitsentscheidungen.md).

## Repository-Struktur

```text
flower-demand/                 # Haupt-Repository (Code + Wiki + Specs)
├── AGENTS.md                  # Projektregeln für Codex/Claude
├── Makefile                   # install, dev, test, lint, nuke, rebuild, verify, wiki-lint
├── docker-compose.yml
├── backend/
│   ├── AGENTS.md
│   ├── pyproject.toml
│   ├── src/flower_demand/      # api/, pipeline/, demand/, forecast/, planning/, erp/, journal/, core/
│   ├── migrations/            # Alembic
│   └── tests/                 # unit/, pipeline/, api/, fixtures/
├── frontend/
│   ├── AGENTS.md
│   └── src/                   # api/, schemas/, components/, pages/, hooks/, lib/
├── knowledge/                 # dieses LLM-Wiki
├── openspec/                  # specs/, changes/
├── scripts/                   # wiki_lint.py, dev-Helfer
└── .opencode/skills/ + .claude/skills/   # openspec-* und wiki-* Skills

flower-demand-journal/         # eigenes Git-Repository: Entscheidungen (JSONL), Regeln, Ereignisse
archive/ (Netzlaufwerk, ro)    # Altdaten-Export + manifest.json mit Prüfsummen
```

## Datenfluss einer Woche

Ein Abruf pro Woche reicht ([Q-041](../open-questions/q-041-api-aktualitaet.md)); ein Knopf startet ihn bei Bedarf sofort.

1. Sonntagnacht Worker: `extract` neue ERP-Daten seit letztem Stand → `raw`.
2. `staging` → `core` → `demand`, Prüfungen A-01 … A-18, neue Fälle in die Fall-Inbox.
3. Prognoselauf, danach Ampel, Reichweite und OOS-Monitor neu berechnen.
4. Schatten-Rebuild mit Prüfsummenvergleich; nachts automatische Updates nach grüner CI.
5. Montag: Daniel öffnet die Startseite – Ampel, Änderungen, offene Fälle, Vorschläge zur Freigabe.
6. Freigabe → Journal-Eintrag → Bestellentwurf im ERP → ERP-Nummer zurück.

## Offene Fragen

- [Q-090: Welche Ressourcen hat die VM?](../open-questions/q-090-vm-ressourcen.md)
- [Q-092: Wie wird auf das Tool zugegriffen?](../open-questions/q-092-netzwerkzugriff.md)
- [Q-093: Wo liegt der Code?](../open-questions/q-093-git-hosting.md)
- [Q-094: Wie werden Backups gemacht?](../open-questions/q-094-backups.md)

## Verwandte Seiten

- [Datenmodell](datenmodell.md)
- [Backend](backend.md)
- [Frontend](frontend.md)
- [Datenpipeline und Neuaufbau](../data/datenpipeline-und-neuaufbau.md)
- [Plan für Version 2](index.md)
