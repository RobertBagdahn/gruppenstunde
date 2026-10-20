---
type: plan
title: "Datenmodell"
description: "PostgreSQL-Schemas je Pipeline-Schicht und die wichtigsten Tabellen von Flower-Demand Version 2."
tags: [plan, datenmodell, postgresql, schema]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Datenmodell

## Kurzfassung

Jede Pipeline-Schicht ist ein eigenes PostgreSQL-Schema: `raw`, `staging`, `core`, `demand`,
`forecast`, `planning`. Dazu kommen `journal` (Projektion des Entscheidungs-Journals), `ops`
(Importe, Jobs, Anomalien) und `auth` (Nutzer und Sitzungen). Alle Schemas außer `auth` werden
beim Nuke gelöscht und beim Rebuild neu befüllt. Schlüssel sind fachlich (Artikelnummer, ISO-Woche),
Herkunft ist an jeder Zeile gespeichert. Das Modell ist ein Startpunkt und wird per OpenSpec verfeinert.

## Inhalt

- [Schemas](#schemas)
- [Kerntabellen](#kerntabellen)
- [Konventionen](#konventionen)

## Schemas

| Schema | Inhalt | Nuke? | Quelle beim Rebuild |
|---|---|---|---|
| `raw` | Originalzeilen je Quelle mit Herkunft | ja | Archiv, ERP-API, Shop |
| `staging` | typisiert, normalisiert, Duplikate markiert | ja | `raw` |
| `core` | Artikel, Beziehungen, Bewegungen, Aufträge, Bestand, Lieferanten, Einkauf | ja | `staging` + `journal` |
| `demand` | klassifizierte Bewegungen, Nachfrage je Artikel-Woche, Zensur, Anomalie-Flags | ja | `core` + Regeln |
| `forecast` | Läufe, Prognosen mit Quantilen, Erklärungen, Backtests, Metriken | ja | `demand` + Code + Seed |
| `planning` | Ampel, Reichweite, Bestellvorschläge, Szenarien, Freigaben (Projektion) | ja | `forecast` + `core` + `journal` |
| `journal` | Projektion des Git-Journals (Entscheidungen, Regeln, Ereignisse, Einstellungen) | ja | Journal-Repository |
| `ops` | Import-Batches, Job-Läufe, Anomalien, Datenqualitätsberichte, ERP-Aufrufprotokoll | ja (Protokoll zusätzlich als Log-Datei) | Pipeline |
| `auth` | Nutzer, Sitzungen | nein | Nutzerdatei auf dem Server |

## Kerntabellen

| Tabelle | Wichtige Spalten |
|---|---|
| `raw.erp_inventory_movement` | `source_key`, `batch_id`, `row_hash`, `payload jsonb`, `ingested_at` |
| `ops.import_batch` | `id`, `source_system`, `source_object`, `file_or_endpoint`, `checksum`, `rows`, `status`, `started_at` |
| `core.product` | `sku` PK, `name`, `brand`, `is_own_brand`, `category`, `subcategory`, `supplier_id`, `status`, `created_at`, `purchase_price`, `sales_price`, `pack_unit`, `sowing_months`, `scope` |
| `core.product_relation` | `parent_sku`, `child_sku`, `kind` (set, bundle, layout_successor), `factor`, `valid_from`, `valid_to` |
| `core.inventory_movement` | `id`, `sku`, `booked_at`, `quantity`, `movement_type`, `comment`, `available_after`, Herkunftsspalten |
| `core.order_line` | `id`, `order_id`, `sku`, `quantity`, `channel`, `ordered_at`, Herkunftsspalten |
| `core.stock_daily` | `sku`, `day`, `available_eod`, `physical_eod`, `source` (erp, reconstructed) |
| `core.purchase_order_line` | `po_id`, `sku`, `quantity`, `expected_at`, `status`, `erp_ref` |
| `demand.classified_movement` | `movement_id`, `demand_class`, `rule_id`, `rule_version`, `decision_id` |
| `demand.weekly` | `sku`, `week_start`, `sales_direct`, `from_sets`, `from_bundles`, `b2b`, `censored`, `demand_estimate`, `excluded`, `event_ids` |
| `ops.anomaly` | `id`, `check_id` (A-01 …), `severity`, `sku`, `period`, `row_refs`, `measured`, `threshold`, `explanation`, `case_id` |
| `planning.case` | `id`, `kind`, `status`, `suggested_class`, `decision_id` (Fall-Inbox) |
| `forecast.run` | `id`, `as_of`, `data_watermark`, `journal_commit`, `code_version`, `params jsonb`, `seed`, `status`, Dauer |
| `forecast.prediction` | `run_id`, `sku`, `week_start`, `model`, `p10`, `p25`, `p50`, `p75`, `p90`, `capped`, `is_selected` |
| `forecast.explanation` | `run_id`, `sku`, `horizon`, `component`, `value`, `detail jsonb` |
| `forecast.backtest_metric` | `run_id`, `cutoff`, `segment`, `model`, `wape`, `bias`, `coverage`, `pinball`, `stockout_weeks`, `leftover` |
| `planning.traffic_light` | `sku`, `as_of`, `color`, `coverage_weeks`, `p_stockout`, `shortfall_3m`, `shortfall_12m`, `trend`, `decile`, `reason` |
| `planning.order_scenario` / `planning.order_line` | `scenario_id`, `sku`, `suggested_qty`, `final_qty`, `p_stockout`, `leftover_2_5y`, `reason`, `forecast_run_id` |
| `journal.entry` | `id`, `type`, `payload jsonb`, `author`, `created_at`, `commit_sha` |

## Konventionen

- Tabellen und Spalten englisch, `snake_case`; fachliche Begriffe stehen im [Glossar](../glossary.md).
- Zeit: `timestamptz` in UTC, Anzeige Europe/Berlin; Wochen als `week_start date` (Montag, ISO).
- Mengen als `integer` (Tüten), Geld als `numeric(12,2)`.
- Jede abgeleitete Tabelle hat `pipeline_run_id`, damit sichtbar ist, aus welchem Lauf sie stammt.
- Alembic-Migrationen nur für `auth` und die Struktur; Inhalte entstehen nur durch die Pipeline.
- Keine Fremdschlüssel von `core` auf `journal` erzwingen, damit beide unabhängig neu geladen werden können.

## Offene Fragen

- [Q-031: Welche Lagerorte gibt es?](../open-questions/q-031-lagerorte.md)
- [Q-038: Welche Stammdaten pflegt das neue ERP?](../open-questions/q-038-stammdaten-felder.md)
- [Q-042: Gemeinsame Datenbasis für Ads?](../open-questions/q-042-gemeinsame-datenbasis.md)
- [Q-101: Was bedeutet „Bestand danach“?](../open-questions/q-101-bestand-danach-semantik.md)

## Verwandte Seiten

- [Datenpipeline und Neuaufbau](../data/datenpipeline-und-neuaufbau.md)
- [Datenklassifikation und Herkunft](../data/datenklassifikation-und-herkunft.md)
- [Backend](backend.md)
- [Zielarchitektur](zielarchitektur.md)
- [Plan für Version 2](index.md)
