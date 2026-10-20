---
type: index
title: "Fragenrunde 3 – 20 Fragen aus dem Graph-Audit"
description: "Fragen aus den Lücken im Wissensgraphen (Oktober 2026)."
tags: [offene-fragen, daniel, graph]
status: draft
visibility: public
retrieved: 2026-10-10
---

# Fragenrunde 3 – 20 Fragen aus dem Graph-Audit

## Kurzfassung

Zwanzig A/B/C-Fragen aus dem Graph-Audit. Viele sind durch die zwölf Geschäftsregel-Antworten erledigt; Datenfragen klären sich nach Prüfung der PostgreSQL-Datenbasis.

## Inhalt

- [Nachfrage und Sales-Daten](#nachfrage-und-sales-daten)
- [Datenmodell und Beschaffung](#datenmodell-und-beschaffung)
- [Saison, Aktionen und Bestellfreigabe](#saison-aktionen-und-bestellfreigabe)

Diese Fragen leiten sich aus Lücken im Wissensgraph und den noch nicht belegten Geschäfts-/Datenregeln ab. Bereits beantwortete Punkte werden nicht erneut gestellt: Rübert priorisiert Verfügbarkeit, nutzt den Bestandswert aus dem externen System, verteilt Set-Bedarf anhand der Stückliste, rechnet 3er-/5er-Bundles als Basisartikel-Abgänge und stellt Kannibalisierungsanalyse sowie Ads-Optimierung zunächst zurück.

**Hinweis:** Einige Fragen hängen davon ab, dass Daniel die PostgreSQL-Datenbasis später prüft. Wenn die Antwort direkt aus Schema/Felddefinitionen hervorgeht, bitte nur Quelle und Feld dokumentieren statt Daniel zusätzlich zu belasten.

## Nachfrage und Sales-Daten

### 1. Welche Kosten sollen bei Überbestand angesetzt werden?
- **A.** Vorläufig nur gebundenes Einkaufskapital.
- **B.** Einkaufskapital plus Lager-, MHD-, Abschreibungs- und Entsorgungskosten.
- **C.** AI soll nur belegbare Kosten berücksichtigen und für fehlende Größen Szenarien zeigen.

### 2. Welche Sales-Menge ist die maßgebliche Nachfrage?
- **A.** Bestellte Menge zum Bestellzeitpunkt.
- **B.** Versandte Menge, bereinigt um Stornos und Retouren.
- **C.** Netto-Sales nach Retouren/Stornos; Brutto, Stornos und Retouren separat ausweisen.

### 3. Wie mit Fremdmarkenbedarf unter 100 € je Lieferant umgehen?
- **A.** Warten/bündeln bis Mindestwert oder nächstem Bestelltermin.
- **B.** Trotzdem bestellen, wenn sonst ein relevantes Fehlbestandsrisiko entsteht.
- **C.** Wartekosten und Fehlbestandsrisiko vergleichen und Daniel je Fall entscheiden lassen.

Zählt der Mindestbestellwert netto oder brutto, und zählen Versandkosten mit?

### 4. Ist die Eigenmarken-Tranche von 60.000 Stück eine feste Gesamtmenge?
- **A.** Ja, genau 60.000 je Tranche; mindestens 5.000 pro ausgewählter Sorte.
- **B.** 60.000 ist nur eine Bestell-/Preisstaffel; bedarfsbasierte Mengen können abweichen.
- **C.** 60.000 ist das Ziel, mit einer zulässigen Über-/Unterschreitung.

### 5. Was bedeutet der Bestandswert aus dem externen System fachlich?
- **A.** Physischer Lagerbestand.
- **B.** Verkaufbarer Bestand nach Reservierungen/Sperrungen.
- **C.** Verfügbarer Bestand einschließlich bestätigter Zugänge; Zugänge zusätzlich mit Termin liefern.

### 6. Können historische Nullverkäufe von Nichtverfügbarkeit unterschieden werden?
- **A.** Ja, Bestand/Listing-Status liegt historisch pro Artikel und Zeitraum vor.
- **B.** Teilweise, nur für bestimmte Zeiträume oder Kanäle.
- **C.** Nein; Null-Sales als unsicher behandeln und nicht automatisch als Nullnachfrage interpretieren.

### 7. Wie passt „direkte Sales als Fehlbestandskosten“ zu den früher genannten Kombi-Sales und Ranking-Verlusten?
- **A.** Für den Start nur direkte entgangene Sales der betroffenen SKU berücksichtigen.
- **B.** Direkte Sales als messbare Basis; Kombi-Sales und Ranking-Effekt nur separat als Szenario/Warnung zeigen.
- **C.** Alle drei Effekte einbeziehen, sobald belastbare Daten/Schätzer vorliegen.

### 8. Wie sollen Aktionen/Rabatte in historischen Sales behandelt werden?
- **A.** Unverändert als beobachtete Nachfrage verwenden.
- **B.** Aktionen markieren, damit Spitzen nicht als normale Grundnachfrage fortgeschrieben werden.
- **C.** Basis-Forecast und vergleichbares Promotionsszenario getrennt darstellen.

### 9. Wie sollen neue Artikel ohne eigene Historie prognostiziert werden?
- **A.** Keine automatische Prognose bis ausreichend eigene Sales vorliegen.
- **B.** Bestätigte Vergleichsartikel/Produktfamilien als Startwert nutzen.
- **C.** AI schlägt Vergleichsartikel samt Unsicherheit vor; Daniel bestätigt kritische Fälle.

### 10. Welche drei Kennzahlen sollen nach 6–12 Monaten Erfolg zeigen?
- **A.** Stockout-Tage/verlorene Sales, Forecast-Güte und eingesparte Planungszeit.
- **B.** Deckungsbeitrag, Überbestand/Kapitalbindung und Fehlbestand.
- **C.** Ausgangswerte zuerst messen, danach gemeinsam Zielwerte für Verfügbarkeit, Profitabilität und Arbeitszeit festlegen.

## Datenmodell und Beschaffung

### 11. Welche zeitliche Granularität hat die Sales-Datenbasis?
- **A.** Tagesgenaue Sales je SKU/Kanal.
- **B.** Wöchentliche Aggregation.
- **C.** Gemischt; Quelldatum/Zeitzone und Aggregationsregeln unterscheiden sich je Quelle.

### 12. Wie ist der historische Abdeckungszeitraum genau?
- **A.** Kuratierte PostgreSQL-Datenbank enthält durchgehend die letzten zwei Jahre plus aktuelles Jahr.
- **B.** Sie enthält den Zeitraum, aber mit Lücken/wechselnder Abdeckung je Kanal/SKU.
- **C.** Die alte „ca. acht Jahre“-Historie ist noch separat verfügbar und soll nach Prüfung ergänzend genutzt werden.

### 13. Sind offene Bestellungen mit bestätigten Lieferterminen verfügbar?
- **A.** Ja, pro Lieferant/Artikel mit bestätigter Menge und ETA.
- **B.** Teilweise; Liefertermine sind nicht immer verbindlich.
- **C.** Nein; zunächst nur den extern gemeldeten aktuellen Bestand verwenden.

### 14. Wie soll die Lieferzeit je Fremdmarke bestimmt werden?
- **A.** Festwert aus Vario/Lieferantenstamm.
- **B.** Tatsächliche Lieferzeit-Historie verwenden und Schwankung/Puffer berechnen.
- **C.** Früh/typisch/spät als Band darstellen und nach gewähltem Risiko planen.

### 15. Wie unterscheiden sich sichtbare Marke und tatsächlicher Bestelllieferant in den Stammdaten?
- **A.** Jeder Artikel hat genau einen Lieferanten; Vario-Feld ist maßgeblich.
- **B.** Marke und Einkaufs-Lieferant können abweichen oder es gibt mehrere Bezugsquellen.
- **C.** AI prüft die Stammdaten und meldet nur mehrdeutige Artikel zur Klärung.

### 16. Werden Set-Stücklisten historisch versioniert?
- **A.** Zusammensetzung bleibt stabil; aktuelle BOM gilt für den ganzen Zeitraum.
- **B.** Änderungen haben Gültigkeitsdatum und müssen je Verkaufszeitraum angewendet werden.
- **C.** Unklar; AI soll BOM-Änderungen aus ERP-/Artikelhistorie erkennen und zur Bestätigung markieren.

### 17. Wie werden ausgelistete, pausierte oder nicht verfügbare Artikel im Forecast behandelt?
- **A.** Ab Auslaufdatum nicht mehr prognostizieren/bestellen.
- **B.** Bis zum definierten Abverkaufsende weiterplanen, danach ausschließen.
- **C.** Status und Datumsfelder in Vario sind maßgeblich; bei fehlenden Angaben Warnung statt stiller Annahme.

### 18. Welche wirtschaftlichen Felder sind für die Kostenabwägung verfügbar?
- **A.** Einkaufspreis und Verkaufspreis je Artikel.
- **B.** Zusätzlich variable Gebühren, Kanalprovisionen, Werbe- und Lagerkosten.
- **C.** Deckungsbeitrag/Marge ist bereits berechnet und kann je SKU/Kanal verwendet werden.

## Saison, Aktionen und Bestellfreigabe

### 19. Welche externen/kommerziellen Ereignisse soll der Forecast berücksichtigen?
- **A.** Nur im System erfasste Aktionen, Preisänderungen und Sortimentsänderungen.
- **B.** Zusätzlich Kalender-/Saisonereignisse und geplante Werbekampagnen.
- **C.** AI soll Nutzen von Wetter-, Kampagnen- und sonstigen Signalen per Backtest prüfen; nur messbar hilfreiche Felder verwenden.

### 20. Welche Bestell-Guardrails müssen für jeden Vorschlag gelten?
- **A.** Lieferanten-MOQ/Mindestwert, vorhandener Bestand und bestätigte Zugänge.
- **B.** Zusätzlich Budget-/Kapitalgrenzen sowie Eigenmarken-60k-/5k-Regeln.
- **C.** Alles aus B plus Mindest-Servicelevel je Artikelklasse; Rübert zeigt Vorschlag und Auswirkungen, Daniel gibt die Bestellung frei.

## Offene Fragen

Siehe Fragen unten.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Fragenrunde 2](fragenrunde-2.md)
- [Wissensgraph](../graph/seed-demand.json)
