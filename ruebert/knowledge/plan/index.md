---
type: index
title: "Plan für Version 2"
description: "Ausführlicher Plan für den Neubau von Flower-Demand: Architektur, Datenmodell, Backend, Frontend, Spec-Driven Development, Roadmap, Risiken und Workshop."
tags: [plan, index, v2]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Plan für Version 2

## Kurzfassung

Flower-Demand wird komplett neu gebaut: FastAPI-Backend, PostgreSQL, selbst gebautes React/TypeScript-
Frontend nach dem Food-Frontend, Betrieb per Docker Compose auf Daniels interner VM. Die Datenbank ist
nukebar und wird aus Stammsystemen und einem Git-versionierten Entscheidungs-Journal neu aufgebaut.
Entwickelt wird Spec-Driven mit OpenSpec, `AGENTS.md` und diesem LLM-Wiki, damit Daniel das System
später mit Codex selbst weiterentwickeln kann. Robert baut auf und verantwortet Prognose und Technik.
Der nächste Meilenstein ist der Workshop mit Daniel am 04.11.2026.

## Inhalt

- [Seiten in diesem Bereich](#seiten-in-diesem-bereich)
- [Leitentscheidungen](#leitentscheidungen)

## Seiten in diesem Bereich

| Seite | Wofür sie gut ist |
|---|---|
| [Zielarchitektur](zielarchitektur.md) | Container, Komponenten, Technologie-Stack, Datenfluss |
| [Datenmodell](datenmodell.md) | PostgreSQL-Schemas je Pipeline-Schicht, Kerntabellen |
| [Backend](backend.md) | FastAPI-Struktur, Pipeline-Runner, Jobs, ERP-Adapter, Tests |
| [Frontend](frontend.md) | Seiten, Routen, Komponenten, Design-System aus dem Food-Frontend |
| [Spec-Driven Development](spec-driven-development.md) | OpenSpec, AGENTS.md, Wiki-Skills, Prüfkette, Arbeiten mit Codex |
| [Roadmap](roadmap.md) | Phasen mit Ergebnissen und Abnahmekriterien |
| [Risiken](risiken.md) | Risiken mit Gegenmaßnahmen |
| [Workshop 04.11.2026](workshop-2026-11-04.md) | Agenda, Top-15-Fragen, was Daniel vorbereiten kann |
| [Workshop-Kostenmodell](workshop-kostenmodell.md) | Kosten von Fehl- und Überbestand beziffern |
| [Ansichten-Entscheidungen](ansichten-entscheidungen.md) | Welche Ansichten Version 2 braucht |

## Leitentscheidungen

| Nr. | Entscheidung | Begründung |
|---|---|---|
| 1 | Stammsystem führt, DB ist nukebar | Vorgabe Robert; Vertrauen, Reproduzierbarkeit, einfache Wartung |
| 2 | Entscheidungs-Journal in Git | menschliche Entscheidungen überleben jeden Rebuild und sind versioniert |
| 3 | Nachfrage statt Absatz, Quantile statt Punkt | Zensur und Risiko-Abwägung (Chat 19.05.2026) |
| 4 | FastAPI + PostgreSQL + React/TS | Vorgabe Robert; Python-Ökosystem für Prognose |
| 5 | Food-Frontend als Vorlage | erprobtes Design-System und Regeln, die Agents verstehen |
| 6 | Knowledge-Scout-Praktiken fürs Wiki | Seitenrahmen, offene Fragen statt Raten, Linter, Skills |
| 7 | Intern auf Daniels VM | Wunsch Daniel (Chat 09.10.2026) |

Alle Entscheidungen mit Alternativen: [Arbeitsentscheidungen](../sources/arbeitsentscheidungen.md).

## Offene Fragen

- [Q-002: Welcher Bereich zuerst?](../open-questions/q-002-prioritaet-bereiche.md)
- [Q-003: Wann ist die nächste Großbestellung?](../open-questions/q-003-naechste-grossbestellung.md)
- [Q-093: Wo liegt der Code?](../open-questions/q-093-git-hosting.md)

## Verwandte Seiten

- [Anforderungen](../requirements/index.md)
- [Datenpipeline und Neuaufbau](../data/datenpipeline-und-neuaufbau.md)
- [Altsystem Version 1](../system-v1/index.md)
- [Offene Fragen](../open-questions/index.md)
- [Wiki-Startseite](../index.md)
