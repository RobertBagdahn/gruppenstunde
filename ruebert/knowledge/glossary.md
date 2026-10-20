---
type: glossary
title: "Glossar Flower-Demand"
description: "Fachbegriffe aus Geschäft, Daten und Prognose von DeineGartenwelt mit Definition und Synonymen."
tags: [glossar, begriffe]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Glossar Flower-Demand

## Kurzfassung

Dieses Glossar definiert die Begriffe, die in Gesprächen mit Daniel, in den Daten und im Code
vorkommen. Code-Bezeichner stehen in Klammern, wenn sie vom deutschen Begriff abweichen.
Bei Widersprüchen zwischen Glossar und Fachseite gilt die Fachseite mit Quelle.

## Inhalt

- [Geschäft und Sortiment](#geschäft-und-sortiment)
- [Einkauf und Lager](#einkauf-und-lager)
- [Daten](#daten)
- [Prognose und Kennzahlen](#prognose-und-kennzahlen)
- [Entwicklung](#entwicklung)

## Geschäft und Sortiment

| Begriff | Definition | Synonyme |
|---|---|---|
| DeineGartenwelt | Online-Händler für Saatgut, Sets und Anzuchtzubehör. Kunde und Betreiber des Tools. | DGW |
| Eigenmarke | Artikel der Marke „Deine Gartenwelt“, Artikelnummer beginnt mit `DGW`. Ca. 84 % des Umsatzes, langfristige Planung. | Own brand (`own_brand`) |
| Fremdmarke | Artikel anderer Hersteller (Kiepenkerl, SPERLI, Quedlinburger, …) inkl. Anzucht & Zubehör. Kurzfristige Planung. | Third-party brand |
| Seedhero | Bio-Linie, gefloppt, wird nur noch abverkauft. Für Prognose vernachlässigbar. | Bio-Linie |
| Sorte | Fachlich eine Saatgutsorte, technisch ein Basisartikel. | Artikel, SKU |
| Basisartikel | Einzeltüte einer Sorte. Bezugsgröße für Bestand, Prognose und Bestellung. | Base article |
| Tüte | Verkaufs- und Bestelleinheit für Saatgut. | Pack |
| Set | Saatgut-Set aus mehreren Basisartikeln, Zuordnung in den Stammdaten („Set-Zuordnung“). | Saatgut-Set, Stückliste |
| Bundle | 3er- oder 5er-Pack eines Basisartikels, seit 2026. Im Lager nur als −3/−5 beim Basisartikel sichtbar. | Multipack |
| Sonderartikel | Saisonale Einzelfälle: DGWADV (Adventskalender), DGW128 (Weihnachtsbaum-Samen), DGW158 (Glücksklee zu Neujahr). | Special item |
| Varianten-Listing | Seit 2023 bei Amazon mehrere Sorten als ein Listing mit Varianten (z. B. alle Kräuter). Höheres Ranking. | Parent-Child-Listing |
| Produktlayout | Neues Tütendesign seit Ende 2025, wird nach Abverkauf des alten Layouts schrittweise eingeführt. | Layout-Umstellung |
| Kanal | Vertriebsweg: Amazon, eigener Shop, eBay, Kaufland, OBI, Hornbach (Bauhaus geplant). | Channel, Marktplatz |

## Einkauf und Lager

| Begriff | Definition | Synonyme |
|---|---|---|
| Großbestellung | Bestellung der Eigenmarke beim Hersteller, Volumen in Stufen zu 60.000 Tüten. | Jahresbestellung |
| 60k-Stufe | Abnahmeintervall: 60.000, 120.000, 180.000 Tüten. | Order step (`order_step_units`) |
| Mindestmenge | Mindestens 5.000 Tüten pro Sorte in einer Eigenmarken-Bestellung. | MOQ (`min_units_per_sort`) |
| Bestellraster | Eigenmarke nur in 5.000er-Schritten (5k, 10k, 15k, …). 6.000 ist unzulässig. | Rastermenge |
| Lieferzeit | Eigenmarke ca. 12 Wochen, Fremdmarke 1–2 Wochen. | Lead time |
| Puffer | Reservebestand von 30 Tüten je Eigenmarken-Artikel. Ist der verfügbare Bestand ≤ 30, gilt der Artikel auf Marktplätzen als ausverkauft. | Reserve, Sicherheitsreserve |
| Reserve-Aufschlag | Prozentualer Aufschlag auf den Netto-Bedarf im Bestellplaner (v1 Standard 10 %). | Reserve % |
| Netto-Bedarf | Prognostizierte Nachfrage bis Zieltermin minus verfügbarer Bestand (und Zulauf). | Net need |
| Zieltermin | „Bestand soll reichen bis“ – Kalenderwoche, bis zu der die Bestellung reichen soll, z. B. KW 39/2027. | Planungshorizont |
| Reichweite | Wochen, bis der Bestand bei prognostizierter Nachfrage aufgebraucht ist (kumulativ berechnet). | Coverage |
| Ausverkauf | Verfügbarer Bestand ≤ Puffer. Schadet zusätzlich dem Amazon-Ranking. | Sold-Out, OOS |
| Überbestand | Bestand, der voraussichtlich nicht vor Ablauf des MHD verkauft wird (v1: Reichweite > 100 Wochen). | Overstock |
| MHD | Mindesthaltbarkeit: 4 Jahre ab Produktion, mind. 1 Jahr Restlaufzeit beim Kunden, also 3 Jahre nutzbar. | Best-before |
| Zulauf | Bestellte, aber noch nicht eingetroffene Ware. | Open purchase order |

## Daten

| Begriff | Definition | Synonyme |
|---|---|---|
| Warenbewegung | Eine Lagerbuchung mit Menge, Zeitpunkt, Buchungsart, Kommentar und Bestand danach. | Inventory movement |
| Buchungsart | Typ einer Warenbewegung, z. B. „Versandprozess WMS“, „Wareneingang“, „Ausbuchen aus Streckenlager“ (Kommentar). | Movement type |
| Stammdaten | Artikelliste mit Nummer, Name, Erstelldatum und Set-Zuordnung. | Artikeldaten, Master data |
| Auftragsposition | Verkaufte Position eines Auftrags. Zeigt Bundles, aber keinen Bestand. | Order line |
| Altes ERP | JTL-Wawi mit JTL-WMS (Hypothese aus Buchungsarten), bis zur Migration 2026. | Alt-ERP |
| Neues ERP | Seit Herbst 2026 im Einsatz, mit API und MCP-Server. Name offen. | Ziel-ERP |
| Nachfrageklasse | Einordnung jeder Bewegung, z. B. Endkundenverkauf, Sammelumlagerung, Retoure. | Demand class |
| Fall-Inbox | Liste unklarer Datenfälle, die Daniel mit einem Klick entscheidet. | Review-Queue |
| Expertenentscheidung | Gespeicherte Entscheidung von Daniel zu einem Datenfall, mit Begründung. | Expert decision |
| Import-Batch | Ein Datenimport mit Herkunft, Zeitpunkt und Prüfsumme. | Load, Batch |

## Prognose und Kennzahlen

| Begriff | Definition | Synonyme |
|---|---|---|
| Absatz | Tatsächlich verkaufte Menge. Bei Ausverkauf kleiner als die Nachfrage. | Sales |
| Nachfrage | Menge, die ohne Ausverkauf verkauft worden wäre. Ziel der Prognose. | Demand |
| Zensierte Nachfrage | Wochen, in denen Absatz durch Ausverkauf begrenzt war. | Censored demand |
| Hauptsaison | März–Mai (ca. KW 9–22), Hauptaussaatzeit. | Peak |
| Nebensaison | Juni–Februar, stark schwankend, prozentual größte Prognosefehler. | Off-season |
| Quantil | Wert, der mit gegebener Wahrscheinlichkeit nicht überschritten wird, z. B. P80. | Perzentil |
| Servicegrad | Gewünschte Wahrscheinlichkeit, bis zum Zieltermin nicht auszuverkaufen. | Service level |
| WAPE | Summe absoluter Fehler geteilt durch Summe der Ist-Werte. Primäre Fehlerkennzahl. | Weighted MAPE |
| Bias | Mittlerer vorzeichenbehafteter Fehler: positiv = Überprognose. | Verzerrung |
| Coverage | Anteil der Ist-Werte innerhalb des Prognoseintervalls. | Intervalltreffer |
| Prognoselauf | Ein versionierter Durchlauf aller Modelle mit Daten-Snapshot und Parametern. | Forecast run |
| Backtest | Prognose aus der Vergangenheit gegen bekannte Ist-Werte prüfen. | Cross-Validation |
| Saisonfortschritt | Anteil der Saisonmenge, der bis zu einer KW typischerweise verkauft ist. | Season curve |
| Drehklasse | Einstufung nach Absatz der letzten 52 Wochen (Dezil 1–10). | Sales decile |
| Ampel | Status je Artikel: Blau (Überbestand), Rot (dringend), Gelb (einplanen), Grün (OK). | Traffic light |

## Entwicklung

| Begriff | Definition | Synonyme |
|---|---|---|
| OpenSpec | Werkzeug für Spec-Driven Development: Proposal, Design, Specs, Tasks je Änderung. | Spec |
| AGENTS.md | Arbeitsregeln für Coding-Agents (Codex, Claude Code) je Verzeichnis. | Agent-Regeln |
| Version 1 | Streamlit-Prototyp mit DuckDB, Mai 2026. | v1, Altsystem |
| Version 2 | Neubau mit FastAPI, PostgreSQL und React/TypeScript. | v2 |

## Offene Fragen

- [Q-021: Welches ERP ist im Einsatz?](open-questions/q-021-erp-name.md)
- [Q-024: Was sind große Versandbuchungen 2020–2022?](open-questions/q-024-sammelbuchungen-versand.md)
- [Q-101: Was bedeutet „Bestand danach“?](open-questions/q-101-bestand-danach-semantik.md)

## Verwandte Seiten

- [Wiki-Startseite](index.md)
- [Einkauf Eigenmarke](business/einkauf-eigenmarke.md)
- [Buchungsarten](data/warenbewegungen-buchungsarten.md)
- [Kennzahlen](forecasting/kennzahlen-und-bewertung.md)
- [Datenklassifikation](data/datenklassifikation-und-herkunft.md)
