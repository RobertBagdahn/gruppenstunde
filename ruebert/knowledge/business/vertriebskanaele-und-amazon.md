---
type: concept
title: "Vertriebskanäle und Amazon"
description: "Welche Kanäle es gibt, warum Amazon dominiert und welche Amazon-Mechaniken die Nachfrage prägen."
tags: [kanaele, amazon, ranking, ads]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel]
---

# Vertriebskanäle und Amazon

## Kurzfassung

DeineGartenwelt verkauft über Amazon, den eigenen Shop, eBay, Kaufland, OBI und Hornbach; Bauhaus
war in Planung. Amazon macht konstant 80–90 % aus. In den Warenbewegungen ist der Kanal nicht
erkennbar, Daniel kann ihn aber beliebig fein liefern (Chat 17.05.2026). Amazon prägt die
Nachfrage durch Ranking-Aufbau neuer Artikel, Varianten-Listings und den Ranking-Schaden nach
einem Ausverkauf. Werbung (Ads) soll künftig auf derselben Datenbasis gesteuert werden.

## Inhalt

- [Kanäle](#kanäle)
- [Amazon-Mechaniken](#amazon-mechaniken)
- [Bedeutung für Prognose und Bestellung](#bedeutung-für-prognose-und-bestellung)

## Kanäle

| Kanal | Status | Quelle |
|---|---|---|
| Amazon | 80–90 % des Absatzes | Chat 17.05.2026 |
| Eigener Shop (Shopify, deinegartenwelt.de) | aktiv | v1 `Project.md`, Shopify-Abgleich in v1 |
| eBay, Kaufland | aktiv | Chat 16.05.2026 |
| OBI, Hornbach | aktiv (als Marktplätze) | Chat 16.05.2026 |
| Bauhaus | „in Planung“ (Stand Mai 2026) | v1 `Project.md` |

Ob OBI und Hornbach Marktplätze oder Händler mit Sammellieferungen sind, ist offen
([Q-019](../open-questions/q-019-b2b-grosskunden.md)).

## Amazon-Mechaniken

Alle Punkte stammen aus dem Chat vom 17.05. und 19.05.2026, wenn nicht anders vermerkt.

- **Ranking-Aufbau:** Neue Artikel müssen bei Amazon erst ein Ranking aufbauen. Ihr Absatz steigt
  über Monate, unabhängig von der Marktnachfrage.
- **Varianten-Listing (2023):** Einzelne Artikel wurden zu Listings mit Varianten zusammengelegt
  (z. B. alle Kräuter in einem Listing mit Basilikum, Dill usw.). Dadurch stieg das Ranking deutlich.
- **Ausverkauf schadet dem Ranking:** Ein Sold-Out kostet nicht nur die Verkäufe der
  Ausverkaufszeit, sondern auch danach Sichtbarkeit.
- **Puffer:** Bei verfügbarem Bestand ≤ 30 ist der Artikel auf den Marktplätzen ausverkauft.
- **FBA (Hypothese):** Bis 2022 gibt es Buchungen „FBA Bestandsänderung“ und „FBA Bestand Abgleich“.
  Ein Teil des Amazon-Geschäfts lief vermutlich über Amazon-Lager. Die Endkunden-Verkäufe aus
  Amazon-Lagern stehen dann nicht in den eigenen Warenbewegungen
  ([Q-026](../open-questions/q-026-fba-bestand.md)).

## Bedeutung für Prognose und Bestellung

| Mechanik | Folge für Flower-Demand |
|---|---|
| Ranking-Aufbau | Neue Artikel brauchen eine Anlaufkurve statt Vorjahreswert ([Modellstrategie](../forecasting/modellstrategie.md)) |
| Varianten-Listing | Strukturbruch 2023 im Ereigniskalender; Artikel eines Listings teilen Ranking |
| Ranking-Schaden | Ausverkauf ist teurer als die entgangenen Verkäufe ([Zielkonflikt](zielkonflikt-ausverkauf-ueberbestand.md)) |
| Puffer 30 | Wochen mit Bestand ≤ 30 sind zensierte Nachfrage ([Nachfrage statt Absatz](../forecasting/nachfrage-vs-absatz.md)) |
| Ads | Werbeausgaben sind ein steuerbarer Treiber, zunächst optional |
| Kanal unbekannt | Bis Kanaldaten vorliegen, Gesamtnachfrage je Artikel prognostizieren |

## Offene Fragen

- [Q-016: Gibt es Preisaktionen und Deals?](../open-questions/q-016-preisaktionen.md)
- [Q-017: Wie hängen Ads und Prognose zusammen?](../open-questions/q-017-ads-steuerung.md)
- [Q-035: Kanalaufteilung pro Artikel?](../open-questions/q-035-kanal-artikelebene.md)
- [Q-068: Wie lange dauert der Ranking-Aufbau?](../open-questions/q-068-ranking-aufbau.md)
- [Q-069: Wie schnell erholt sich das Ranking?](../open-questions/q-069-ranking-nach-ausverkauf.md)
- [Q-070: Wann wurde auf Varianten umgestellt?](../open-questions/q-070-varianten-listing-daten.md)

## Verwandte Seiten

- [Saisonalität und Wachstum](saisonalitaet-und-wachstum.md)
- [Lager, Bestand und MHD](lager-bestand-mhd.md)
- [Nachfrage statt Absatz](../forecasting/nachfrage-vs-absatz.md)
- [Befund: Sammelbuchungen vor 2023](../data/befund-sammelbuchungen-vor-2023.md)
- [Geschäftsmodell](index.md)
