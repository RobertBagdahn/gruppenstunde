---
type: index
title: "Altsystem Version 1"
description: "Was der Streamlit-Prototyp von Mai 2026 konnte, wie er aufgebaut war und wie er in Version 2 weiterlebt."
tags: [v1, altsystem, streamlit, index]
status: historical
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [v1-datenbank-und-specs]
---

# Altsystem Version 1

## Kurzfassung

Version 1 entstand zwischen dem 17. und 22. Mai 2026 als Streamlit-App mit DuckDB, StatsForecast und
LightGBM, deployt auf Google Cloud Run. Sie war als „Skizze“ und „Diskussionsgrundlage“ gedacht
(Chat 19.05.2026), hat aber schon eine echte Bestellung unterstützt: Daniels Excel-Planung und der
Bestellplaner deckten sich weitgehend. In diesem Repository liegen der Code, 102 OpenSpec-Specs und
archivierte Änderungen. Version 2 übernimmt die Fachlogik, nicht die Technik.

## Inhalt

- [Seiten in diesem Bereich](#seiten-in-diesem-bereich)
- [Aufbau von Version 1](#aufbau-von-version-1)
- [Zeitleiste](#zeitleiste)

## Seiten in diesem Bereich

| Seite | Wofür sie gut ist |
|---|---|
| [Übernahme-Matrix](uebernahme-matrix.md) | welche v1-Specs übernommen, geändert oder verworfen werden |
| [Learnings](learnings.md) | was v1 fachlich und technisch gelehrt hat |

## Aufbau von Version 1

| Teil | Umsetzung |
|---|---|
| Daten | `Stammdaten.xlsx` + `Warenbewegungen.csv` → Parquet → DuckDB (Skripte, kein UI-Import) |
| Prognose | Wochenbasis, h = 52; SeasonalNaive, SeasonalNaiveDamped, MSTL, AutoTheta, Croston, IMAPA, LightGBM-LT, EnsembleMedian; Auswahl per CV-WAPE |
| Seiten | Start, Datenübersicht, Bestell-Ampel, Bestellplaner, Artikel-Analyse, Prognose-Güte, Anomalien, KPI-Erklärung, Simulator |
| Betrieb | Container mit eingebackener DuckDB, Cloud Run europe-west4, Passwortschutz |
| Code | seit 17.10.2026 unter `legacy/`: `legacy/src/` (Streamlit-Seiten, `forecast_engine.py`, `lightgbm_forecast.py`), `legacy/scripts/`, `legacy/tests/`; Start mit `make legacy-run-quick` |

## Zeitleiste

| Datum | Ereignis | Quelle |
|---|---|---|
| 17.05.2026 | Daten erhalten, erster Forecast | Chat |
| 18.05.2026 | Dashboard online | Chat |
| 19.05.2026 | Review-Call; Bug DGW097, Zieltermin-Wunsch | Chat |
| 20.05.2026 | Excel-Abgleich durch Daniel und Elena | Chat |
| 21.05.2026 | Rundung, Suche, LightGBM, Ensemble | Chat |
| 22.05.2026 | Rundungsfehler gemeldet; Bestellung abgeschickt | Chat |

Offene Änderungen in `openspec/changes/` (LightGBM-Verbesserungen, Paketumbau) werden nicht mehr
umgesetzt; ihre Ideen fließen in die [Modellstrategie](../forecasting/modellstrategie.md) ein.

## Offene Fragen

Keine offenen Fragen.

## Verwandte Seiten

- [Übernahme-Matrix](uebernahme-matrix.md)
- [Learnings](learnings.md)
- [Quelle: v1-Datenbank und Specs](../sources/v1-datenbank-und-specs.md)
- [Plan für Version 2](../plan/index.md)
- [Wiki-Startseite](../index.md)
