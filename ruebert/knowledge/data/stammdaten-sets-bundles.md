---
type: concept
title: "Stammdaten, Sets und Bundles"
description: "Welche Artikelfelder es gibt, woher sie kommen und wie Sets und Bundles technisch auf Basisartikel aufgelöst werden."
tags: [daten, stammdaten, sets, bundles, shopify]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [export-stammdaten, v1-datenbank-und-specs]
---

# Stammdaten, Sets und Bundles

## Kurzfassung

Der Artikelstamm kommt in v1 aus zwei Quellen: dem Stammdaten-Export (Nummer, Name, Erstelldatum,
Set-Zuordnung) und dem öffentlichen Shopify-Katalog (Kategorie, Marke, Preis, Aussaat- und
Erntezeiten aus dem Produkttext). In v2 ist das neue ERP die Quelle für den Artikelstamm, ergänzt
um Shop-Daten. Sets und Bundles werden mit Gültigkeitszeitraum gespeichert und bei jeder
Nachfrageberechnung auf Basisartikel aufgelöst.

## Inhalt

- [Artikelfelder](#artikelfelder)
- [Set-Auflösung](#set-auflösung)
- [Bundle-Auflösung](#bundle-auflösung)
- [Bekannte Probleme aus v1](#bekannte-probleme-aus-v1)

## Artikelfelder

| Feld | v1-Quelle | v2-Quelle (Ziel) | Verwendung |
|---|---|---|---|
| Artikelnummer | Stammdaten | ERP | Schlüssel |
| Name | Stammdaten / Shopify | ERP | Anzeige „Name (SKU)“ |
| Erstelldatum | Stammdaten „Erstelldatum“ | ERP | Lebenszyklus, Kaltstart |
| Kategorie, Unterkategorie | Shopify-Tags, Fallback über Titel-Stichworte | ERP oder Shop | Gruppierung, Analogien |
| Marke | Shopify `vendor` | ERP | Eigen-/Fremdmarke |
| Verkaufspreis | Shopify | ERP | Umsatzausfall |
| Einkaufspreis | – | ERP ([Q-054](../open-questions/q-054-ek-preise.md)) | Budget, Kosten |
| Lieferant | – | ERP ([Q-038](../open-questions/q-038-stammdaten-felder.md)) | Fremdmarke |
| Status (aktiv, auslaufend, ignoriert) | v1-Flag `ignored` | ERP + Konfiguration | Scope |
| Aussaat-, Erntemonate, Keimung | Shopify-Produkttext (`**Aussaat:**` …) | Shop | Saisonmerkmale für Modelle |
| Drehklasse (Dezil 1–10) | berechnet | berechnet | Filter, Priorisierung |

## Set-Auflösung

```text
für jede Woche w und jedes Set s, das in w verkauft wurde (und w ≥ Erstelldatum von s):
    für jede Komponente k von s mit Menge m:
        nachfrage_aus_sets[k, w] += verkauf[s, w] × m
nachfrage_gesamt[k, w] = direkt[k, w] + nachfrage_aus_sets[k, w]
```

In v1 als Tabelle `weekly_sales_effective` mit `quantity_direct`, `quantity_from_sets`,
`quantity_total`. Set-Artikel selbst werden aus Listen und Bestellungen ausgeblendet.

Es gibt beide Set-Arten ([Q-033](../open-questions/q-033-sets-physisch.md)), deshalb trägt jedes Set
das Merkmal `assembly`:

| `assembly` | Wann werden Komponenten verbraucht? | Nachfrage der Komponente |
|---|---|---|
| `on_shipment` (Standard) | beim Versand des Sets | aus Set-Verkäufen (Formel oben) |
| `prebuilt` | bei der Konfektion („Entnahme Produktion“) | aus Set-Nachfrage über den Set-Bestand; das Set selbst braucht eine eigene Reichweite |

## Bundle-Auflösung

- Bundles sind in den Warenbewegungen nicht erkennbar (−3/−5 am Basisartikel).
- In den Auftragspositionen tragen sie eine eigene Artikelnummer. v2 braucht deshalb ein
  Bundle-Mapping `bundle_sku → (basis_sku, faktor)` mit Gültigkeit.
- Bundle-Nachfrage wird wie Set-Nachfrage zur Gesamtnachfrage addiert, bleibt aber als eigene
  Spalte sichtbar, damit der Bundle-Effekt messbar ist ([Q-072](../open-questions/q-072-bundle-effekt.md)).

## Bekannte Probleme aus v1

| Problem | Folge | Nachweis |
|---|---|---|
| `is_set` ist für alle Artikel falsch, obwohl 14 Sets zugeordnet sind | Set-Artikel erscheinen in Listen | Datenscan 10.10.2026 |
| 29 `DGW`-Nummern ohne Stammdaten, u. a. `DGWADV`, `DGW-GC2`, `…-VP`, `DGW-QB…` | fehlen in Prognose oder verzerren sie | Datenscan, [Q-103](../open-questions/q-103-unbekannte-artikelnummern.md) |
| Kategorie über Titel-Stichworte geraten, wenn Shopify keinen Treffer hat | falsche Gruppen möglich | v1-Spec `product-enrichment-fallback` |
| Set-Nummern wurden für andere Zusammensetzungen wiederverwendet | Historie falsch zugeordnet | v1-Spec `weekly-set-decomposition` |

## Offene Fragen

- [Q-032: Gibt es Auftragspositionen?](../open-questions/q-032-auftragspositionen.md)
- [Q-033: Sind Sets vorkonfektioniert?](../open-questions/q-033-sets-physisch.md)
- [Q-034: Ändern sich Set-Zusammensetzungen?](../open-questions/q-034-set-historie.md)
- [Q-038: Welche Stammdaten pflegt das neue ERP?](../open-questions/q-038-stammdaten-felder.md)
- [Q-103: Was sind Artikelnummern ohne Stammdaten?](../open-questions/q-103-unbekannte-artikelnummern.md)

## Verwandte Seiten

- [Artikelbeziehungen](../business/artikelbeziehungen.md)
- [Datenklassifikation und Herkunft](datenklassifikation-und-herkunft.md)
- [Datenmodell](../plan/datenmodell.md)
- [Quelle: Export Stammdaten](../sources/export-stammdaten.md)
- [Daten](index.md)
