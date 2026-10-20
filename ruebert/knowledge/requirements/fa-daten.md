---
type: requirements
title: "Anforderungen Daten"
description: "Fachliche Anforderungen an Import, Herkunft, Klassifikation, Fall-Inbox, nukebaren Neuaufbau und Anomalieerkennung."
tags: [anforderungen, daten, pipeline, anomalien]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, arbeitsentscheidungen, v1-datenbank-und-specs]
---

# Anforderungen Daten

## Kurzfassung

Die Datenanforderungen sorgen dafür, dass jede Zahl auf einer sauberen, rückverfolgbaren Basis
steht. Kernpunkte: Originaldaten bleiben im Stammsystem. Die Datenbank ist jederzeit löschbar und
neu aufbaubar. Jede Zeile ist mit Herkunft identifiziert und klassifiziert. Auffälligkeiten werden
automatisch gefunden und Daniel zur Entscheidung vorgelegt. Seine Entscheidungen liegen versioniert
im Entscheidungs-Journal.

## Inhalt

- [Import und Quellen](#import-und-quellen)
- [Identität, Herkunft, Klassifikation](#identität-herkunft-klassifikation)
- [Stammsystem-Prinzip und Neuaufbau](#stammsystem-prinzip-und-neuaufbau)
- [Anomalieerkennung und Datenqualität](#anomalieerkennung-und-datenqualität)

## Import und Quellen

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| DAT-01 | Altdaten des alten ERP (Warenbewegungen, Auftragspositionen, Stammdaten, Sets, Einkauf) einmalig importieren und als schreibgeschütztes Archiv mit Prüfsummen-Manifest ablegen | Muss | Chat 09.10. | bestätigt, Umfang offen ([Q-023](../open-questions/q-023-altdaten-umfang.md)) |
| DAT-02 | Laufende Daten wöchentlich inkrementell per API aus dem neuen ERP abrufen; manueller Abruf per Knopf | Muss | Chat 29.05., 09.10., [Q-041](../open-questions/q-041-api-aktualitaet.md) | bestätigt |
| DAT-03 | CSV-/Excel-Upload als Übergangs- und Notfallweg, gleiche Pipeline wie API | Soll | Chat 16.05., 29.05. | abgeleitet |
| DAT-04 | Eigen- und Fremdmarken importieren; Scope (`DGW*`, Ausschlüsse wie DGWADV, DGW-GC2; Seedhero komplett ignoriert) als versionierte Konfiguration | Muss | Chat 17.05., 09.10. | bestätigt |
| DAT-05 | Auftragspositionen ohne personenbezogene Daten importieren (Bundles, Kanal) | Muss | Chat 17.05. | offen ([Q-032](../open-questions/q-032-auftragspositionen.md)) |
| DAT-06 | Artikelstamm mit Marke, Kategorie, Lieferant, EK, VK, Status, Erstelldatum, Verpackungseinheit, Saisonmerkmalen aus dem Shop | Muss | v1:`product-schema-alignment`, Chat 17.05. | abgeleitet |
| DAT-08 | Set-Zuordnung mit Gültigkeitszeitraum und Merkmal je Set: beim Versand gepackt oder vorkonfektioniert (eigener Set-Bestand); Auflösung auf Komponenten entsprechend | Muss | Chat 17.05., v1:`weekly-set-decomposition`, [Q-033](../open-questions/q-033-sets-physisch.md) | bestätigt |
| DAT-09 | Bundle-Mapping (3er/5er) mit Faktor und Gültigkeit; Bundle-Nachfrage getrennt ausweisbar | Muss | Chat 17.05. | bestätigt |
| DAT-10 | Bestandsverlauf je Artikel und Tag rekonstruieren: verfügbarer und physischer Bestand getrennt; Zensur bei verfügbar ≤ Puffer | Muss | Chat 17.05., Scan | Semantik offen ([Q-101](../open-questions/q-101-bestand-danach-semantik.md)) |
| DAT-12 | Kanal je Auftragsposition, wenn verfügbar | Soll | Chat 17.05. | offen ([Q-035](../open-questions/q-035-kanal-artikelebene.md)) |
| DAT-13 | Vollständige Eventliste im Journal: Eintritte in Baumärkte/Marktplätze, Amazon-Eintritte und Listings, Aktionen, Preisänderungen, Listing-Probleme, Lieferengpässe, neue Kanäle – mit Datum und Artikeln, damit Modelle Ausreißer zuordnen können; Daniel liefert und pflegt sie | Muss | Chat 17.05., Robert 10.10. | bestätigt, Lieferung offen ([Q-075](../open-questions/q-075-ereignisliste.md)) |
| DAT-16 | Artikel-Mapping alt → neu über die ERP-Migration | Muss | abgeleitet | offen ([Q-039](../open-questions/q-039-artikelnummern-migration.md)) |
| DAT-17 | Werbedaten (Amazon Ads) als optionale Quelle | Kann | Chat 09.10. | offen ([Q-017](../open-questions/q-017-ads-steuerung.md)) |
| DAT-18 | Kerntabellen sind die gemeinsame Datenbasis für ein späteres Ads-Modul | Muss | Chat 09.10., [Q-042](../open-questions/q-042-gemeinsame-datenbasis.md) | bestätigt |

## Identität, Herkunft, Klassifikation

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| DAT-11 | Jede Zeile trägt `source_system`, `source_object`, `source_key`, `batch_id`, `row_hash`, `ingested_at` | Muss | Robert | bestätigt |
| DAT-14 | Importe sind idempotent: erneuter Import erzeugt keine Duplikate; geänderte Zeilen werden versioniert | Muss | Robert | bestätigt |
| DAT-31 | Jede Bewegung erhält eine Nachfrageklasse über versionierte Regeln; `rule_id` und `rule_version` werden gespeichert | Muss | Robert, Scan | bestätigt |
| DAT-07 | Fall-Inbox: unklare Zeilen, Anomalien und Zensur-Wochen werden Daniel als Fallkarte mit Kontext, Vorschlag und Ein-Klick-Entscheidung vorgelegt; ähnliche Fälle gebündelt | Muss | Robert | bestätigt |
| DAT-15 | Keine Zeile wird gelöscht; Ausschlüsse sind Klassen mit Begründung | Muss | Robert, v1:`sales-exclusions` | bestätigt |
| DAT-19 | Jede Kennzahl ist per Klick bis zur Originalzeile rückverfolgbar | Muss | Robert | bestätigt |

## Stammsystem-Prinzip und Neuaufbau

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| DAT-20 | Originaldaten liegen ausschließlich im Stammsystem (neues ERP, Altdaten-Archiv, Shop). Flower-Demand verändert sie nie, außer Bestellentwürfe nach Freigabe | Muss | Robert 10.10. | bestätigt |
| DAT-21 | Die Datenbank ist vollständig abgeleitet: `make nuke && make rebuild` baut alles aus Stammsystemen und Entscheidungs-Journal neu auf | Muss | Robert 10.10. | bestätigt |
| DAT-22 | Rebuild ist deterministisch und idempotent; wöchentlicher Schatten-Rebuild vergleicht Prüfsummen | Muss | Robert 10.10. | bestätigt |
| DAT-23 | Rebuild zu einem Stichtag (`AS_OF`) für Backtests und Simulation | Muss | Robert | abgeleitet |
| DAT-25 | Alle menschlichen Entscheidungen (Fälle, Regeln, Ereignisse, Einstellungen, Korrekturen, Szenarien) werden als Append-only-Journal in Git versioniert, bevor sie in die DB geschrieben werden | Muss | Robert 10.10. | bestätigt |

## Anomalieerkennung und Datenqualität

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| DAT-24 | Automatische Daten-Anomalieerkennung mit Prüfkatalog A-01 bis A-18 bei jedem Import und Rebuild; Schweregrade Blocker, Fall, Hinweis | Muss | Robert 10.10. | bestätigt |
| DAT-26 | Blocker stoppen den Import; die Oberfläche zeigt weiter den letzten guten Stand mit Warnhinweis | Muss | Robert | abgeleitet |
| DAT-27 | Datenqualitätsbericht je Import: Zeilen, neue Fälle, Funde je Prüfung, Trend | Muss | v1:`duckdb-import` | abgeleitet |
| DAT-28 | Datenfrische sichtbar: letzte Buchung, letzter Import, letzter Prognoselauf | Muss | v1:`data-freshness-indicator` | übernommen |
| DAT-29 | Schwellwerte der Prüfungen als Einstellungen im Journal, nicht im Code | Soll | Robert | abgeleitet |
| DAT-30 | Aus wiederkehrenden Entscheidungen schlägt das System neue Klassifikationsregeln vor | Soll | Robert | abgeleitet |

Details: [Anomalieerkennung](../data/anomalieerkennung.md), [Datenpipeline](../data/datenpipeline-und-neuaufbau.md),
[Datenklassifikation](../data/datenklassifikation-und-herkunft.md).

## Offene Fragen

- [Q-023: Welche Altdaten gibt es?](../open-questions/q-023-altdaten-umfang.md)
- [Q-032: Gibt es Auftragspositionen?](../open-questions/q-032-auftragspositionen.md)
- [Q-038: Welche Stammdaten pflegt das neue ERP?](../open-questions/q-038-stammdaten-felder.md)
- [Q-039: Sind Artikelnummern migriert?](../open-questions/q-039-artikelnummern-migration.md)
- [Q-098: Enthalten Auftragsdaten Kundendaten?](../open-questions/q-098-datenschutz-auftraege.md)
- [Q-101: Was bedeutet „Bestand danach“?](../open-questions/q-101-bestand-danach-semantik.md)

## Verwandte Seiten

- [Datenpipeline und Neuaufbau](../data/datenpipeline-und-neuaufbau.md)
- [Daten-Anomalieerkennung](../data/anomalieerkennung.md)
- [Datenmodell](../plan/datenmodell.md)
- [Anforderungen ERP-Integration](fa-erp-integration.md)
- [Anforderungen](index.md)
