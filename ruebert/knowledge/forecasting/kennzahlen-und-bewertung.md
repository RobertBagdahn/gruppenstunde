---
type: concept
title: "Kennzahlen und Bewertung"
description: "Wie Prognosen und Bestellentscheidungen bewertet werden: Fehlermaße, Intervallgüte, entscheidungsorientierte Backtests und Ampel-Reichweite."
tags: [prognose, kennzahlen, wape, backtest, bewertung]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [v1-datenbank-und-specs]
---

# Kennzahlen und Bewertung

## Kurzfassung

Eine Prognose ist so gut wie die Entscheidungen, die man mit ihr trifft. Flower-Demand bewertet
deshalb auf zwei Ebenen: statistisch (WAPE, Bias, Coverage, Pinball-Loss) und entscheidungsorientiert
(wie viele Ausverkaufswochen und wie viel Rest hätte eine Bestellung mit dieser Prognose erzeugt).
Bewertet wird mit ehrlichen Backtests auf historischen Stichtagen, getrennt nach Saisonphase und
Drehklasse. Die Kennzahlen aus v1 bleiben, damit Ergebnisse vergleichbar sind.

## Inhalt

- [Statistische Kennzahlen](#statistische-kennzahlen)
- [Entscheidungsorientierte Kennzahlen](#entscheidungsorientierte-kennzahlen)
- [Backtest-Protokoll](#backtest-protokoll)
- [Betriebskennzahlen](#betriebskennzahlen)

## Statistische Kennzahlen

| Kennzahl | Formel | Lesart | v1-Schwellen |
|---|---|---|---|
| WAPE | Σ\|Prognose − Ist\| / Σ Ist | primärer Fehler | gut < 30 %, mittel 30–60 %, schlecht ≥ 60 % |
| Bias | Σ(Prognose − Ist) / Σ Ist | + = Überprognose | – |
| Coverage 80 % | Anteil Ist in [P10, P90] | soll ≈ 80 % sein | – |
| Pinball-Loss | Quantilverlust je Quantil | Güte der Quantile | neu |
| Saisonsummen-Fehler | Fehler der Summe über die Hauptsaison | relevant für Jahresbestellung | neu |

WAPE wird je Backtest-Fenster berechnet und dann gemittelt (v1-Spec `forecast-evaluation`).
Prozentwerte werden ganzzahlig angezeigt.

## Entscheidungsorientierte Kennzahlen

Mit dem Bestellsimulator aus v1 (Stichtag, Bestand am Stichtag, simulierte Bestellung, echte Verkäufe
danach) werden Prognosen danach bewertet, was sie bewirkt hätten:

| Kennzahl | Bedeutung |
|---|---|
| Ausverkaufswochen | Wochen mit simuliertem Bestand ≤ Puffer, gewichtet nach Saisonphase |
| Entgangener Umsatz | Fehlmenge × Preis |
| Rest nach 24 bzw. 30 Monaten | Überbestand, MHD-Risiko |
| Kosten | Cu × Fehlmenge + Co × Rest |
| Abweichung zur Excel-Methode | Gewinnt das Modell gegen den Status quo? |

Ein neues Modell wird nur übernommen, wenn es auf den Entscheidungskennzahlen nicht schlechter ist.

## Backtest-Protokoll

- **Stichtage:** typische Bestellzeitpunkte (z. B. Ende Mai 2024, Ende Mai 2025) plus rollierend
  alle vier Wochen. Der Stand jedes Stichtags wird mit `rebuild AS_OF=…` erzeugt
  ([Datenpipeline](../data/datenpipeline-und-neuaufbau.md)), damit kein Wissen aus der Zukunft einfließt.
- **Horizonte:** 4, 13, 26, 52, 70 Wochen (KW 39 des Folgejahres).
- **Segmente:** Hauptsaison/Nebensaison, Drehklasse, Lebensalter, Kategorie.
- **Testfälle:** DGW042 und DGW054 aus dem Excel-Abgleich ([Erklärbarkeit](erklaerbarkeit.md)).
- **Ergebnisse** werden je Prognoselauf gespeichert und sind über Läufe vergleichbar.

## Betriebskennzahlen

| Kennzahl | Verwendung |
|---|---|
| Kumulative Reichweite | Wochen, bis Bestand bei P50-Prognose ≤ Puffer fällt (v1: ohne Puffer) |
| P(Ausverkauf vor Termin X) | Ampel, Nachsteuern |
| Fehlmenge 3 und 12 Monate mit P10/P90 | Ampel (aus v1) |
| Trend-Indikator | Prognose Wochen 1–13 vs. 14–26 (aus v1) |
| Drehklasse | Dezil 1–10 nach Absatz der letzten 52 Wochen (aus v1) |
| Tracking-Signal | kumulierte Abweichung Ist vs. Prognose seit Saisonstart |

Ampel-Schwellen aus v1: Rot < 13 Wochen, Gelb 13–25, Grün bis 100, Blau > 100 Wochen. In v2 werden
sie relativ zur Lieferzeit der Marke gesetzt ([Q-080](../open-questions/q-080-ampel-schwellen.md)).

## Offene Fragen

- [Q-001: Woran messen wir Erfolg?](../open-questions/q-001-erfolg-messen.md)
- [Q-037: Welche Artikel waren wann ausverkauft?](../open-questions/q-037-ausverkauf-historie.md)
- [Q-080: Passen die Ampel-Schwellen?](../open-questions/q-080-ampel-schwellen.md)
- [Q-084: Soll die Excel-Methode mitlaufen?](../open-questions/q-084-excel-vergleich.md)

## Verwandte Seiten

- [Modellstrategie](modellstrategie.md)
- [Probabilistische Bestellentscheidung](probabilistische-bestellentscheidung.md)
- [Anforderungen Prognose](../requirements/fa-prognose.md)
- [Anforderungen Monitoring und Ampel](../requirements/fa-monitoring-ampel.md)
- [Prognose](index.md)
