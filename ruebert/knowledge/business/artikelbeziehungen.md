---
type: concept
title: "Artikelbeziehungen"
description: "Wie Sets, Bundles, Varianten-Listings, Produktlayouts und Bio-Sorten miteinander und mit dem Basisartikel zusammenhängen."
tags: [sets, bundles, varianten, layout, beziehungen]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, export-stammdaten]
---

# Artikelbeziehungen

## Kurzfassung

Nachfrage nach einer Sorte entsteht nicht nur über die Einzeltüte. Sets enthalten mehrere Sorten,
Bundles (3er/5er) mehrere Tüten derselben Sorte, Varianten-Listings bündeln Sorten bei Amazon.
Für Bestand und Bestellung zählt immer der **Basisartikel** (die Einzeltüte). Jede Beziehung muss
deshalb mit Gültigkeitszeitraum gespeichert und bei der Nachfrageberechnung aufgelöst werden.
Nachfolgeartikel gibt es laut Daniel nicht.

## Inhalt

- [Beziehungsarten](#beziehungsarten)
- [Sets](#sets)
- [Bundles](#bundles)
- [Weitere Beziehungen](#weitere-beziehungen)

## Beziehungsarten

| Beziehung | Beispiel | Verbraucht Basisartikel? | Sichtbar in | Quelle |
|---|---|---|---|---|
| Set → Komponenten | Kräuter-Set → Basilikum, Dill, … | ja, je Komponente | Stammdaten „Set-Zuordnung“ | Chat 17.05.2026 |
| Bundle → Basisartikel | 3er-Pack Basilikum → 3 × Basilikum | ja, 3 bzw. 5 Tüten | nur Auftragspositionen | Chat 17.05.2026 |
| Varianten-Listing | Kräuter-Listing mit Varianten | nein, teilt Ranking | Amazon, nicht in Daten | Chat 17.05.2026 |
| Altes/neues Layout | gleiche Sorte, neue Tüte | ja | offen | Chat 17.05.2026 |
| Bio-Sorte | „BIO Basilikum“ (Seedhero) | nein, eigene Sorte | Stammdaten | Chat 17.05.2026 |
| Nachfolgeartikel | – | – | gibt es nicht | Chat 17.05.2026 |

## Sets

- 14 Sets mit 128 Komponenten-Zuordnungen (Stammdaten-Export Mai 2026).
- v1 löst Set-Verkäufe wöchentlich auf die Komponenten auf (`quantity_from_sets`) und blendet
  Set-Artikel in Listen aus.
- Set-Absatz wurde nur ab Erstelldatum des Sets aufgelöst, weil Set-Nummern für andere
  Zusammensetzungen wiederverwendet wurden (v1-Spec `weekly-set-decomposition`).
- In der v1-Datenbank ist `is_set` für alle Artikel falsch, obwohl 14 Sets zugeordnet sind –
  ein Synchronisationsfehler, siehe [Anomalieerkennung](../data/anomalieerkennung.md).

Offen: Sind Sets vorkonfektioniert oder werden sie beim Versand gepackt
([Q-033](../open-questions/q-033-sets-physisch.md))? Ändern sich Zusammensetzungen
([Q-034](../open-questions/q-034-set-historie.md))?

## Bundles

- Seit 2026 gibt es 3er- und 5er-Bundles von fast allen Artikeln (Chat 17.05.2026).
- In den Lagerbewegungen erscheinen sie nur als −3 bzw. −5 beim Basisartikel. Eine Buchung −3
  ist also nicht von drei einzelnen Käufen oder einem Kauf von drei Tüten zu unterscheiden.
- Unterscheidbar sind sie nur in den **Auftragspositionen**, die aber keinen Bestand zeigen.
  v2 braucht deshalb beide Quellen ([Q-032](../open-questions/q-032-auftragspositionen.md)).
- Für die Prognose ist offen, ob Bundles zusätzliche Nachfrage erzeugen oder Einzelkäufe
  ersetzen ([Q-072](../open-questions/q-072-bundle-effekt.md)).

## Weitere Beziehungen

- **Produktionsbuchungen** seit August 2025 („Entnahme Produktion“, „Einlagerung Produktion“)
  deuten auf eigenes Konfektionieren hin, etwa für Bundles oder Sets
  ([Q-028](../open-questions/q-028-produktion-buchungen.md)).
- **Layoutwechsel:** Ob die Artikelnummer gleich bleibt, ist offen
  ([Q-040](../open-questions/q-040-layout-artikelnummer.md)).
- **Bio:** keine relevante Kannibalisierung, da andere Sorten und kaum Absatz.

## Offene Fragen

- [Q-028: Was bedeuten Produktionsbuchungen?](../open-questions/q-028-produktion-buchungen.md)
- [Q-032: Gibt es Auftragspositionen?](../open-questions/q-032-auftragspositionen.md)
- [Q-033: Sind Sets vorkonfektioniert?](../open-questions/q-033-sets-physisch.md)
- [Q-034: Ändern sich Set-Zusammensetzungen?](../open-questions/q-034-set-historie.md)
- [Q-040: Neues Layout, neue Artikelnummer?](../open-questions/q-040-layout-artikelnummer.md)
- [Q-072: Verdrängen Bundles Einzeltüten?](../open-questions/q-072-bundle-effekt.md)

## Verwandte Seiten

- [Stammdaten, Sets und Bundles](../data/stammdaten-sets-bundles.md)
- [Unternehmen und Sortiment](unternehmen-und-sortiment.md)
- [Nachfrage statt Absatz](../forecasting/nachfrage-vs-absatz.md)
- [Vertriebskanäle und Amazon](vertriebskanaele-und-amazon.md)
- [Geschäftsmodell](index.md)
