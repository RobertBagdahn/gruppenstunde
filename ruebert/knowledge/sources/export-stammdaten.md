---
type: source
title: "Quelle: Export Stammdaten"
description: "Excel-Datei mit Artikeldaten und Set-Zuordnung der Eigenmarke, geliefert am 17.05.2026."
tags: [quelle, daten, stammdaten, sets]
status: historical
retrieved: 2026-10-10
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Quelle: Export Stammdaten

## Kurzfassung

`data/raw/Stammdaten.xlsx` enthält zwei Blätter: „Artikeldaten“ (Artikelnummer, Name, Erstelldatum)
und „Set-Zuordnung“ (Set-Nummer und leerzeichengetrennte Komponenten). Daniel hat sie am 17.05.2026
geliefert. In v1 wurde sie um Shopify-Daten angereichert. Stand der Auswertung: 10.10.2026.

## Inhalt

- [Was daraus übernommen wurde](#was-daraus-übernommen-wurde)
- [Geltungsgrenze](#geltungsgrenze)

## Was daraus übernommen wurde

- 188 Artikel mit Kategorien (nach Shopify-Anreicherung): [Unternehmen und Sortiment](../business/unternehmen-und-sortiment.md)
- 14 Sets mit 128 Komponenten-Zuordnungen: [Stammdaten, Sets und Bundles](../data/stammdaten-sets-bundles.md)
- Erstelldatum für Lebenszyklus und Kaltstart

## Geltungsgrenze

- Keine Lieferanten, keine Einkaufspreise, keine Bundles, keine Gültigkeitszeiträume für Sets.
- Komponentenmenge ist immer 1 (v1-Annahme).
- 29 Artikelnummern aus den Warenbewegungen fehlen.

## Offene Fragen

- [Q-034: Ändern sich Set-Zusammensetzungen?](../open-questions/q-034-set-historie.md)
- [Q-103: Was sind Artikelnummern ohne Stammdaten?](../open-questions/q-103-unbekannte-artikelnummern.md)

## Verwandte Seiten

- [Quellen](index.md)
- [Stammdaten, Sets und Bundles](../data/stammdaten-sets-bundles.md)
- [Artikelbeziehungen](../business/artikelbeziehungen.md)
- [Quelle: Export Warenbewegungen](export-warenbewegungen.md)
