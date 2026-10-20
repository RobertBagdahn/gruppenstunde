---
type: decision
title: "Übernahme-Matrix der v1-Specs"
description: "Für alle 102 OpenSpec-Specs von Version 1 gruppiert: übernehmen, ändern oder verwerfen – mit Ziel-Anforderung in Version 2."
tags: [v1, migration, specs, entscheidung]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [v1-datenbank-und-specs]
---

# Übernahme-Matrix der v1-Specs

## Kurzfassung

Version 1 hat 102 Specs unter `openspec/specs/`. Sie sind wertvoll, weil sie Daniels Feedback und
gelöste Fachfragen festhalten. Diese Matrix ordnet sie in Gruppen und legt fest, was in Version 2
übernommen, geändert oder verworfen wird. Technikspezifisches (Streamlit, DuckDB, Cloud Run) wird
verworfen, Fachlogik übernommen. Die Ziel-IDs verweisen auf die [Anforderungen](../requirements/index.md).

## Inhalt

- [Fachlogik](#fachlogik)
- [Prognose](#prognose)
- [Oberfläche](#oberfläche)
- [Technik](#technik)

## Fachlogik

| v1-Specs | Entscheidung | Ziel |
|---|---|---|
| `order-demand-calculation`, `planning-horizon`, `weekly-order-planning` | ändern: Zieltermin bis 30 Monate, Quantil statt Punkt, Zulauf | BEM-01, BEM-02, BEM-07 |
| `smart-rounding` | ändern: Schwelle auf angebrochenen Schritt | BEM-04 |
| `configurable-minimums`, `flexible-volume` | übernehmen als Raster-/Mindestmengen-Einstellung | BEM-03, BEM-11 |
| `order-optimization`, `order-strategies`, `order-filters` | übernehmen, Strategien als Servicegrad | BEM-12, BEM-14, BEM-08 |
| `order-overstock-warning`, `forecast-cap` | übernehmen | BEM-10 |
| `peak-season-weighting` | auf Prüfung (Kann) | BEM-13 |
| `stockout-alert`, `cumulative-coverage`, `ampel-shortage-forecast`, `trend-indicator`, `sales-decile-score`, `ampel-explanation` | übernehmen, Puffer und Wahrscheinlichkeit neu | MON-02 … MON-07, MON-14 |
| `set-decomposition`, `weekly-set-decomposition`, `set-flag-sync`, `set-contribution-chart` | übernehmen, Gültigkeit statt Erstelldatum-Trick | DAT-08, UI-02 |
| `sku-lifecycle-filter` | übernehmen | DAT-06 |
| `sales-exclusions`, `anomaly-detection`, `anomaly-date-cutoff`, `extreme-outlier-filter`, `anomaly-flat-list`, `anomaly-dashboard` | ändern: Teil des Prüfkatalogs (A-11), Entscheidungen ins Journal | DAT-07, DAT-24 |
| `corona-cleanup`, `training-date-cutoff` | ändern: Ereigniskalender + Klassifikation statt Jahresausschluss | DAT-13, PRG-05 |
| `mhd-monitoring` | nachrangig, über Überbestand | BEM-10 |
| `decision-simulation`, `sim-*` (5 Specs) | übernehmen als Bestellsimulator und Backtest-Basis | UI-15, PRG-17 |

## Prognose

| v1-Specs | Entscheidung | Ziel |
|---|---|---|
| `demand-forecast`, `weekly-forecast-engine`, `weekly-db-schema`, `weekly-charts` | übernehmen (Wochenbasis), Horizont länger | PRG-01, PRG-02 |
| `naive-baselines`, `seasonal-naive-damped`, `asymmetric-drift-damping` | übernehmen als Referenz-/Basismodelle | PRG-08, PRG-09 |
| `ensemble-median`, `lightgbm-model`, `forecast-features`, `model-configuration` | übernehmen, mit Quantilen und Segment-Auswahl | PRG-09, PRG-16 |
| `forecast-clamp`, `forecast-plausibility-cap`, `cap-visualization` | übernehmen als sichtbarer Schritt | PRG-13, UI-05 |
| `forecast-evaluation`, `seasonal-cv-config`, `prognose-benchmark`, `metrics-deduplication`, `wape-persistence`, `honest-fallback-metrics`, `consistent-best-model` | übernehmen, erweitert um Pinball und Entscheidungskennzahlen | PRG-17 … PRG-19 |
| `forecast-run-tracking`, `forecast-run-history`, `all-model-persistence`, `forecast-cli` | übernehmen, Lauf voll reproduzierbar | PRG-14, PRG-20, PRG-21 |
| `forecast-confidence`, `error-analysis`, `category-dashboard`, `executive-summary` | übernehmen in Prognosegüte | UI-03 |

## Oberfläche

| v1-Specs | Entscheidung | Ziel |
|---|---|---|
| `artikel-analyse-dashboard`, `product-deep-link`, `table-link-navigation` | übernehmen | UI-02, UI-06 |
| `dashboard-overview`, `category-analytics`, `trend-dynamics`, `forecast-outlook`, `yearly-forecast-overview`, `trend-forecast-stacked`, `data-freshness-indicator` | übernehmen in Übersicht | UI-10, DAT-28 |
| `chart-event-markers` | übernehmen | UI-04 |
| `german-number-format`, `integer-display`, `german-locale-setup`, `data-overview-translation` | übernehmen | UI-07, NFA-06 |
| `kpi-explanation-page` | übernehmen, erweitert um Erklärungen je Zahl | UI-08 |
| `navigation-sidebar`, `page-link-navigation`, `material-icon-pages` | verwerfen (Streamlit); Navigation nach Food-Frontend | UI-01, UI-09 |
| `read-only-mode`, `password-auth` | ändern: Rollen und Session-Auth | UI-16, NFA-08 |

## Technik

| v1-Specs | Entscheidung | Grund |
|---|---|---|
| `duckdb-import`, `duckdb-write-layer`, `native-duckdb-reads`, `database-persistence`, `parquet-export` | verwerfen | PostgreSQL und Pipeline-Schichten |
| `multi-channel-import` | ändern: ERP-API, CSV nur als Fallback | DAT-02, DAT-03 |
| `script-only-data-pipeline` | Idee übernehmen: Daten nur über Pipeline | DAT-21 |
| `shopify-sync`, `product-enrichment-fallback`, `description-parsing`, `product-schema-alignment` | ändern: Shop als Zusatzquelle zum ERP | DAT-06 |
| `cloud-deploy` | verwerfen | interner Betrieb (NFA-01) |
| `uv-toolchain`, `developer-makefile` | übernehmen | NFA-12 |

## Offene Fragen

Keine offenen Fragen.

## Verwandte Seiten

- [Altsystem Version 1](index.md)
- [Learnings](learnings.md)
- [Anforderungen](../requirements/index.md)
- [Modellstrategie](../forecasting/modellstrategie.md)
- [Quelle: v1-Datenbank und Specs](../sources/v1-datenbank-und-specs.md)
