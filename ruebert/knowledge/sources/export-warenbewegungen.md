---
type: source
title: "Quelle: Export Warenbewegungen"
description: "CSV-Export aller Lagerbewegungen der Eigenmarke aus dem alten ERP, Februar 2019 bis Mai 2026, ausgewertet im Datenscan vom 10.10.2026."
tags: [quelle, daten, warenbewegungen, export]
status: historical
retrieved: 2026-10-10
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Quelle: Export Warenbewegungen

## Kurzfassung

Daniel hat am 17.05.2026 eine CSV „mit allen Warenbewegungen“ geliefert, gefiltert auf die Eigenmarke
(`DGW…`). Die Rohdatei liegt nicht im Repository; ausgewertet wurde die daraus erzeugte v1-Datenbank
(`data/seed_demand.duckdb.bak`, Tabelle `inventory_movements`). Der Datenscan fand am 10.10.2026 statt.

## Inhalt

- [Eckdaten](#eckdaten)
- [Was daraus übernommen wurde](#was-daraus-übernommen-wurde)
- [Geltungsgrenze](#geltungsgrenze)

## Eckdaten

| Merkmal | Wert |
|---|---|
| Zeitraum | 07.02.2019 – 16.05.2026 |
| Zeilen | ca. 2,31 Mio. |
| Artikelnummern | 217 verschiedene `DGW…` |
| Buchungsarten | 15 |
| Format | Semikolon, UTF-8 mit BOM |
| Übermittlung | SharePoint-Link, inzwischen nicht mehr öffentlich |

## Was daraus übernommen wurde

- Buchungsarten mit Mengen: [Warenbewegungen und Buchungsarten](../data/warenbewegungen-buchungsarten.md)
- [Befund: Sammelbuchungen vor 2023](../data/befund-sammelbuchungen-vor-2023.md)
- [Befund: Bestand danach ist kein Saldo](../data/befund-bestand-danach.md)
- Funde der [Anomalieerkennung](../data/anomalieerkennung.md)
- Jahressummen in [Saisonalität und Wachstum](../business/saisonalitaet-und-wachstum.md)

## Geltungsgrenze

- Nur Eigenmarke; keine Fremdmarken, keine Kanäle, keine Bundles erkennbar.
- Interpretationen der Buchungsarten sind Hypothesen, bis Daniel sie bestätigt.
- Ausgewertet wurde die v1-Datenbank, nicht die Originaldatei. Falls v1 beim Import Zeilen verändert
  hat, ist das nicht berücksichtigt.

## Offene Fragen

- [Q-022: War das alte ERP JTL-Wawi?](../open-questions/q-022-altes-erp-jtl.md)
- [Q-023: Welche Altdaten gibt es?](../open-questions/q-023-altdaten-umfang.md)

## Verwandte Seiten

- [Quellen](index.md)
- [Datenquellen und ERP](../data/datenquellen-und-erp.md)
- [Daten-Anomalieerkennung](../data/anomalieerkennung.md)
- [Quelle: v1-Datenbank und Specs](v1-datenbank-und-specs.md)
