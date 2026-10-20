---
type: decision
title: "Arbeitsentscheidungen"
description: "Architektur- und Arbeitsentscheidungen (ADRs) für Flower-Demand Version 2 mit Kontext, Entscheidung, Alternativen und Folgen."
tags: [entscheidungen, adr, architektur]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Arbeitsentscheidungen

## Kurzfassung

Hier stehen die Entscheidungen, die Robert als technisch Verantwortlicher getroffen oder vorgeschlagen
hat. Vorgaben von Robert sind mit „vorgegeben“ markiert; Vorschläge gelten erst nach dem Workshop als
entschieden. Jede Entscheidung nennt Alternativen und Folgen, damit ein Agent später versteht, warum
etwas so gebaut ist.

## Inhalt

- [ADR-01 Neubau statt Migration](#adr-01-neubau-statt-migration)
- [ADR-02 Stammsystem führt, Datenbank ist nukebar](#adr-02-stammsystem-führt-datenbank-ist-nukebar)
- [ADR-03 Entscheidungs-Journal in Git](#adr-03-entscheidungs-journal-in-git)
- [ADR-04 FastAPI, PostgreSQL, React/TypeScript](#adr-04-fastapi-postgresql-reacttypescript)
- [ADR-05 API-Typen aus OpenAPI generieren](#adr-05-api-typen-aus-openapi-generieren)
- [ADR-06 Jobs in PostgreSQL statt Zusatzdienst](#adr-06-jobs-in-postgresql-statt-zusatzdienst)
- [ADR-07 Schichten als PostgreSQL-Schemas](#adr-07-schichten-als-postgresql-schemas)
- [ADR-08 Wiki nach Knowledge-Scout](#adr-08-wiki-nach-knowledge-scout)
- [ADR-09 Layout D „Triage Nacht“](#adr-09-layout-d-triage-nacht)
- [ADR-10 Prototyp als Keimzelle, v1 in legacy](#adr-10-prototyp-als-keimzelle-v1-in-legacy)
- [ADR-11 Feedback über GitHub-Issues](#adr-11-feedback-über-github-issues)

## ADR-01 Neubau statt Migration

Vorgegeben (Robert, 10.10.2026). v1 war eine Skizze in Streamlit/DuckDB. Alternative „v1 in neue
Infrastruktur migrieren“ (Chat 09.10.) verworfen: Streamlit trägt die Anforderungen (Freigaben,
Fall-Inbox, Rollen, ERP-Schreiben) nicht gut. Folge: Fachlogik wird über die
[Übernahme-Matrix](../system-v1/uebernahme-matrix.md) neu umgesetzt.

## ADR-02 Stammsystem führt, Datenbank ist nukebar

Vorgegeben (Robert, 10.10.2026): „Das Tool muss nukebar sein. Es muss sich jederzeit aus den echten
Daten komplett wieder aufbauen lassen. Die Originaldaten liegen immer im Stammsystem.“ Folgen:
deterministische Pipeline, Altdaten-Archiv mit Manifest, Schatten-Rebuild, kein Zustand nur in der DB.
Details: [Datenpipeline und Neuaufbau](../data/datenpipeline-und-neuaufbau.md).

## ADR-03 Entscheidungs-Journal in Git

Vorschlag. Kontext: Daniels Entscheidungen stehen in keinem Stammsystem, müssen aber jeden Nuke
überleben. Entscheidung: Append-only-JSONL in eigenem Git-Repository, Server schreibt und committet.
Alternativen: geschützte DB-Tabelle mit Backup (bricht „nukebar“), Rückschreiben ins ERP (nicht für
alle Typen möglich). Folge: Entscheidungen sind versioniert, reviewbar und per Pull Request änderbar.

## ADR-04 FastAPI, PostgreSQL, React/TypeScript

Vorgegeben (Robert). FastAPI hält Prognose und API in einem Python-Ökosystem. PostgreSQL ersetzt
DuckDB wegen gleichzeitiger Zugriffe, Transaktionen und Schemas. Frontend nach Food-Frontend.

## ADR-05 API-Typen aus OpenAPI generieren

Vorschlag. Food hält Zod-Schemas von Hand synchron. Für agentische Weiterentwicklung ist Generierung
aus der FastAPI-OpenAPI sicherer (`make api-types`). Alternative: Handpflege mit Vertragstests.

## ADR-06 Jobs in PostgreSQL statt Zusatzdienst

Vorschlag. Job-Queue und Zeitplan im Worker auf Basis von PostgreSQL. Alternativen: Redis + Celery,
Airflow, Dagster – mehr Betriebsaufwand auf der VM, mehr für Agents zu verstehen.

## ADR-07 Schichten als PostgreSQL-Schemas

Vorschlag. `raw`, `staging`, `core`, `demand`, `forecast`, `planning`, `journal`, `ops`, `auth`.
Alternative dbt: bekannt, aber zusätzliches Werkzeug; kann später ergänzt werden, weil die Schichten passen.

## ADR-08 Wiki nach Knowledge-Scout

Vorgegeben (Robert, 10.10.2026). OKF-Seitenrahmen, offene Fragen als Dateien, Skills, Linter.
Details: [Quelle: Knowledge-Scout](knowledge-scout.md).

## ADR-09 Layout D „Triage Nacht“

Vorgegeben (Robert, 12.10.2026). Aus sechs Entwürfen (A–F) im Claude-Design-Canvas gewählt; Daniel
hatte die Triage-Richtung vor dem Kontrollraum bevorzugt. Dunkle App-Shell mit Sidebar (Navigation,
Seitenfilter, Ansicht), Kopfzeile mit Datenfluss und Triage-Muster „Liste + Detail mit Vorschlag von
Rübert“. Vorgabe in `frontend/Design.md`, Tokens in `frontend/src/styles/tokens.css`, Spec
`openspec/specs/frontend-layout`, archivierter Change `openspec/changes/archive/2026-10-17-frontend-layout-d`.
Schriften werden lokal mitgeliefert (`@fontsource`), weil Rübert im internen Netz läuft. Alternativen: Kopfnavigation mit Filtern im Inhalt (A), helles
Triage-Layout mit Lagebild (E), Monitor mit Detail-Drawer (F). Folge: ersetzt den Look „Frisch & offen“
aus dem Food-Frontend (UI-09); ein helles Theme ist später reine Token-Arbeit.

## ADR-10 Prototyp als Keimzelle, v1 in legacy

Vorschlag, mit Robert abzustimmen. Der klickbare Rübert-Prototyp auf den v1-Daten ist die Keimzelle von
Version 2; er dient dem Workshop mit Daniel und Elena. v1 bleibt unverändert unter `legacy/` und wird nur
noch für Fehlerbehebungen angefasst. Die Datenbank ist abgeleitet und nukebar (ADR-02); Beispieldaten
für Fremdmarke, Kanäle und Ereignisse tragen überall `is_sample`. Folge: Die Prognose stammt aus dem
v1-Lauf 25 und wird im Prototyp nicht neu berechnet. Offen bleibt, ob der Prototyp nach dem Workshop
weitergeführt oder neu aufgesetzt wird (Proposal ruebert-demo-prototype).

## ADR-11 Feedback über GitHub-Issues

Vorschlag. Fragen, Bugs und Wünsche aus jeder Seite landen als Issue im privaten Repository, mit Typ-Label,
Kontext der Seite und Erwähnung des Empfängers. Das Token liegt nur auf dem Server (Umgebung oder
`backend/.env`, git-ignoriert) und erscheint nie in Antworten, im Journal oder im Frontend. Ist GitHub
nicht erreichbar oder fehlt das Token, wird die Rückmeldung als `pending` ins Journal geschrieben und mit
`make feedback-retry` nachgesendet. Alternativen: E-Mail (keine Nachverfolgung), eigenes Ticketsystem
(zusätzlicher Dienst, AGENTS „Was NICHT tun“). Die Prüfung gegen den echten Dienst steht noch aus, sobald
ein Token eingetragen ist.

## Offene Fragen

- [Q-090: Welche Ressourcen hat die VM?](../open-questions/q-090-vm-ressourcen.md)
- [Q-093: Wo liegt der Code?](../open-questions/q-093-git-hosting.md)

## Verwandte Seiten

- [Zielarchitektur](../plan/zielarchitektur.md)
- [Datenpipeline und Neuaufbau](../data/datenpipeline-und-neuaufbau.md)
- [Backend](../plan/backend.md)
- [Quellen](index.md)
