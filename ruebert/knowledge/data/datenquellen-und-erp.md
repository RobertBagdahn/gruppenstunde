---
type: concept
title: "Datenquellen und ERP"
description: "Welche Systeme und Exporte Daten liefern, was davon Stammsystem ist und wie Daten zu Flower-Demand kommen."
tags: [daten, erp, quellen, api, mcp]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, export-warenbewegungen, export-stammdaten]
---

# Datenquellen und ERP

## Kurzfassung

Bis zur Migration 2026 lief DeineGartenwelt auf einem alten ERP – nach den Buchungsarten
vermutlich JTL-Wawi mit JTL-WMS. Seit Herbst 2026 läuft ein neues ERP mit API und MCP-Server; alle
laufenden Daten können dort abgerufen und Bestellungen angelegt werden, nur die Altdaten vor der
Migration nicht (Chat 09.10.2026). Daniel kann eine saubere Datenbasis inklusive Historie liefern,
die er auch für die Steuerung von Werbung braucht. Für Flower-Demand gibt es damit zwei
Stammsysteme: das neue ERP (live) und den eingefrorenen Altdaten-Export (Historie).

## Inhalt

- [Systeme](#systeme)
- [Bisher gelieferte Dateien](#bisher-gelieferte-dateien)
- [Benötigte Daten für Version 2](#benötigte-daten-für-version-2)
- [Lieferwege und Sicherheit](#lieferwege-und-sicherheit)

## Systeme

| System | Rolle für Flower-Demand | Zugriff | Quelle |
|---|---|---|---|
| Altes ERP (vermutlich JTL-Wawi + JTL-WMS) | Stammsystem der Historie bis zur Migration | einmaliger Export, danach eingefroren | Buchungsarten „JTL-Ameise Import“, „Packtisch+“, „EazyShipping“; [Q-022](../open-questions/q-022-altes-erp-jtl.md) |
| Neues ERP (Name offen) | Stammsystem für Artikel, Bestand, Aufträge, Lieferanten, Bestellungen ab Migration | REST-API, MCP-Server | Chat 09.10.2026; [Q-021](../open-questions/q-021-erp-name.md) |
| Shopify-Shop | Kategorien, Preise, Produkttexte (Aussaat, Ernte) | öffentliche `products.json` | v1-Spec `shopify-sync` |
| Amazon (Seller Central, Ads) | Kanal- und Werbedaten | offen | Chat 09.10.2026 |
| Excel-Bedarfsplanung | Vergleichsreferenz | Datei von Daniel | Chat 20.05.2026; [Q-009](../open-questions/q-009-excel-prozess.md) |

Migrationszeitpunkt: geplant 01.07. oder 01.08.2026 (Chat 29.05.2026), abgeschlossen vor dem
07.10.2026. Bis zur Migration war CSV geplant, danach API.

## Bisher gelieferte Dateien

| Datei | Inhalt | Stand | Details |
|---|---|---|---|
| `Warenbewegungen.csv` | alle Lagerbewegungen, gefiltert auf `DGW` | 07.02.2019 – 16.05.2026, ca. 2,3 Mio. Zeilen | [Quelle](../sources/export-warenbewegungen.md), [Buchungsarten](warenbewegungen-buchungsarten.md) |
| `Stammdaten.xlsx` | Blatt „Artikeldaten“ (Nummer, Name, Erstelldatum), Blatt „Set-Zuordnung“ | Mai 2026 | [Quelle](../sources/export-stammdaten.md), [Stammdaten](stammdaten-sets-bundles.md) |

Daniel bot zusätzlich an: Artikelliste mit Namen, Datum der Sortimentsaufnahme, Kanalaufteilung
„so granular wie es hilft“, Auftragspositionen statt Lagerbewegungen (Chat 17.05.2026).

## Benötigte Daten für Version 2

Laufende Daten werden wöchentlich abgerufen ([Q-041](../open-questions/q-041-api-aktualitaet.md)).
„Täglich“ in der Tabelle heißt: Das ERP liefert tagesgenaue Daten.

| Datensatz | Historie (Altexport) | Laufend (neues ERP) | Wofür |
|---|---|---|---|
| Warenbewegungen inkl. Fremdmarken | ab 2019 | täglich | Absatz, Bestand, Klassifikation |
| Auftragspositionen ohne Kundendaten | so weit wie möglich | täglich | Bundles, Kanäle, Sets |
| Artikelstamm mit Lieferant, EK, Status, Verpackungseinheit | Stand Migration | täglich | Bestellung, Budget |
| Set- und Bundle-Zuordnung mit Gültigkeit | ja | bei Änderung | Auflösung auf Basisartikel |
| Lagerbestand je Lagerort | Stand Migration | täglich | Ampel, Reichweite |
| Einkaufsbestellungen und Wareneingänge | ab 2019 | täglich | Zulauf, Lieferzeiten |
| Lieferanten und Konditionen | – | bei Änderung | Fremdmarken |
| Artikel-Mapping alt → neu | einmalig | – | durchgehende Zeitreihen ([Q-039](../open-questions/q-039-artikelnummern-migration.md)) |

## Lieferwege und Sicherheit

- Robert bat darum, die SharePoint-Freigaben wieder zu schließen: „sind ja interne
  Unternehmensdaten“ (Chat 17.05.2026). Regel: **keine öffentlichen Links auf Unternehmensdaten.**
- Altdaten-Exporte werden einmal geliefert, mit Prüfsumme in einem Manifest versehen und danach
  nie verändert ([Datenpipeline](datenpipeline-und-neuaufbau.md)).
- Zugangsdaten für die ERP-API liegen nur in der Umgebung des Servers, nie im Repository.
- Personenbezogene Daten werden nicht benötigt und beim Import verworfen
  ([Q-098](../open-questions/q-098-datenschutz-auftraege.md)).

## Offene Fragen

- [Q-021: Welches ERP ist im Einsatz?](../open-questions/q-021-erp-name.md)
- [Q-023: Welche Altdaten gibt es?](../open-questions/q-023-altdaten-umfang.md)
- [Q-039: Sind Artikelnummern migriert?](../open-questions/q-039-artikelnummern-migration.md)
- [Q-041: Wie aktuell sind API-Daten?](../open-questions/q-041-api-aktualitaet.md)
- [Q-042: Gemeinsame Datenbasis für Ads?](../open-questions/q-042-gemeinsame-datenbasis.md)
- [Q-085: Gibt es API-Doku und Testzugang?](../open-questions/q-085-erp-api-doku.md)

## Verwandte Seiten

- [Datenpipeline und Neuaufbau](datenpipeline-und-neuaufbau.md)
- [Anforderungen ERP-Integration](../requirements/fa-erp-integration.md)
- [Warenbewegungen und Buchungsarten](warenbewegungen-buchungsarten.md)
- [Stammdaten, Sets und Bundles](stammdaten-sets-bundles.md)
- [Daten](index.md)
