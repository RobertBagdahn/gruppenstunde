---
type: index
title: "Prognose"
description: "Methodik der Bedarfsprognose von Flower-Demand: Nachfrage statt Absatz, Modelle, Quantile, Bewertung, Erklärbarkeit und Nachsteuern."
tags: [prognose, index, forecasting]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Prognose

## Kurzfassung

Die Prognose ist Roberts Verantwortungsbereich. Sie schätzt die wöchentliche **Nachfrage** je
Basisartikel – nicht den Absatz, der bei Ausverkauf zu niedrig ist – und zwar als Verteilung
(Quantile) statt als einzelne Zahl. Daraus leitet sich die Bestellmenge über eine Kostenabwägung
ab. Jede Prognose muss für Daniel erklärbar sein und wird laufend gegen die Wirklichkeit geprüft.
In der Saison wird mit aktuellen Verkäufen nachgesteuert. Version 1 hat gezeigt, dass einfache
Vorjahresmodelle oft gewinnen und die Nebensaison am schwierigsten ist.

## Inhalt

- [Seiten in diesem Bereich](#seiten-in-diesem-bereich)
- [Prognosekette](#prognosekette)

## Seiten in diesem Bereich

| Seite | Wofür sie gut ist |
|---|---|
| [Nachfrage statt Absatz](nachfrage-vs-absatz.md) | Zensur durch Ausverkauf, Set/Bundle-Auflösung, Zielgröße |
| [Modellstrategie](modellstrategie.md) | Learnings aus v1, Modellfamilien, Hierarchie, Kaltstart |
| [Probabilistische Bestellentscheidung](probabilistische-bestellentscheidung.md) | Quantile, Servicegrad, Raster, Budget, Bestellpunkt |
| [Kennzahlen und Bewertung](kennzahlen-und-bewertung.md) | WAPE, Bias, Coverage, Pinball, Entscheidungsmetriken, Backtests |
| [Erklärbarkeit](erklaerbarkeit.md) | Warum-diese-Zahl, Zerlegung, Testfälle DGW042/DGW054 |
| [Nachsteuern in der Saison](nachsteuern-in-der-saison.md) | Saisonfortschritt, Hochrechnung, Signale für Nachbestellung |

## Prognosekette

```text
klassifizierte Bewegungen ─▶ Nachfrage je Artikel-Woche (inkl. Zensur-Korrektur)
   ─▶ Modelle (Baselines, Statistik, ML, Hierarchie) ─▶ Backtest & Auswahl/Ensemble
   ─▶ Quantile P10…P90 je Woche ─▶ Erklärung ─▶ Ampel / Bestellvorschlag / Nachsteuern
```

## Offene Fragen

- [Q-076: Welche Horizonte brauchst du?](../open-questions/q-076-prognosehorizont.md)
- [Q-077: Wie soll Unsicherheit aussehen?](../open-questions/q-077-unsicherheit-darstellung.md)
- [Q-079: Welche Erklärung brauchst du?](../open-questions/q-079-erklaer-tiefe.md)

## Verwandte Seiten

- [Anforderungen Prognose](../requirements/fa-prognose.md)
- [Daten](../data/index.md)
- [Zielkonflikt Ausverkauf vs. Überbestand](../business/zielkonflikt-ausverkauf-ueberbestand.md)
- [Learnings aus Version 1](../system-v1/learnings.md)
- [Wiki-Startseite](../index.md)
