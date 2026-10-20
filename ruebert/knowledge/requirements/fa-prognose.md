---
type: requirements
title: "Anforderungen Prognose"
description: "Fachliche Anforderungen an die Bedarfsprognose: Zielgröße, Horizonte, Quantile, Modelle, Backtests, Erklärung und Korrekturen."
tags: [anforderungen, prognose]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, v1-datenbank-und-specs]
---

# Anforderungen Prognose

## Kurzfassung

Die Prognose schätzt die wöchentliche Nachfrage je Basisartikel als Verteilung, mit Horizonten
passend zu Eigenmarke (bis 2,5 Jahre) und Fremdmarke (wenige Wochen). Sie ist reproduzierbar
versioniert, wird laufend gegen Ist-Daten und die Excel-Methode geprüft, erklärt sich selbst und
kann von Daniel begründet korrigiert werden. Robert ist für diesen Bereich verantwortlich.

## Inhalt

- [Zielgröße und Horizont](#zielgröße-und-horizont)
- [Modelle und Auswahl](#modelle-und-auswahl)
- [Bewertung, Erklärung, Korrektur](#bewertung-erklärung-korrektur)
- [Betrieb](#betrieb)

## Zielgröße und Horizont

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| PRG-01 | Wöchentliche Prognose (ISO-Woche, Montag) je Basisartikel über alle Kanäle | Muss | v1:`weekly-forecast-engine` | übernommen |
| PRG-02 | Horizont für Eigen- und Fremdmarke jeweils zwei Jahre (104 Wochen); Überbestandsprüfung über 2,5 Jahre mit Fortschreibung | Muss | Chat 19.05., [Q-076](../open-questions/q-076-prognosehorizont.md) | bestätigt |
| PRG-03 | Zielgröße ist die Nachfrage (bereinigt, Sets/Bundles aufgelöst, Zensur korrigiert), nicht der Absatz; beide werden gespeichert | Muss | Chat 17.05., Robert | abgeleitet |
| PRG-04 | Quantile P10, P25, P50, P75, P90 je Woche und Simulationspfade für Summen über Zeiträume | Muss | Chat 19.05. („Risiken und Quantilen“) | bestätigt |
| PRG-05 | Treiber und Ereignisse aus dem Ereigniskalender fließen ein (Listing, Layout, Bundles, Corona, Ostern) | Muss | Chat 17.05. | abgeleitet |
| PRG-06 | Kaltstart für neue Artikel über Analogien und Ranking-Anlaufkurve | Soll | Chat 17.05. | abgeleitet |
| PRG-07 | Sonderartikel mit eigener Saison; ignorierte Artikel ohne Prognose | Soll | Chat 17.05. | offen ([Q-014](../open-questions/q-014-sonderartikel-planung.md)) |

## Modelle und Auswahl

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| PRG-08 | Referenzmodelle laufen immer mit: Excel-Methode (Ø 12 Monate) und SeasonalNaive | Muss | Chat 20.05., v1:`naive-baselines` | abgeleitet |
| PRG-09 | Mehrere Modellfamilien (Vorjahr mit gedämpftem Trend, Statistik, globales ML, Croston-Familie) und Ensemble; Auswahl/Gewichtung je Segment per Backtest | Muss | v1:`ensemble-median`, v1:`lightgbm-model` | übernommen, erweitert |
| PRG-13 | Plausibilitätsgrenzen (Clamp, Cap) als eigener, gespeicherter und sichtbarer Schritt | Muss | v1:`forecast-plausibility-cap`, v1:`cap-visualization` | übernommen |
| PRG-15 | Hierarchische Konsistenz: Summe der Artikel passt zu Kategorie und Gesamt | Soll | Robert | abgeleitet |
| PRG-16 | Modelle und Parameter in zentraler Konfiguration, Fabrik für Modellobjekte | Muss | v1:`model-configuration` | übernommen |

## Bewertung, Erklärung, Korrektur

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| PRG-10 | Erklärung je Artikel: Wasserfall, Vergleich Vorjahr/Excel/Modelle, Datenqualität, Ereignisse, Treffsicherheit | Muss | Chat (vor 16.05.), 20.05. | bestätigt |
| PRG-11 | Manuelle Korrektur als Faktor oder Wert mit Begründung und Ablaufdatum, markiert, im Journal | Muss | v1 `Project.md`, [Q-078](../open-questions/q-078-prognose-korrektur.md) | bestätigt |
| PRG-12 | In der Saison Hochrechnung über Saisonfortschritt und Aktualisierung der Prognose | Muss | Chat (vor 16.05.) Variante 3 | abgeleitet ([Q-091](../open-questions/q-091-varianten-3-und-4-vollstaendig.md)) |
| PRG-17 | Backtests auf Stichtagen mit `rebuild AS_OF`, statistisch (WAPE, Bias, Coverage, Pinball) und entscheidungsorientiert (Ausverkaufswochen, Rest, Kosten) | Muss | v1:`forecast-evaluation`, v1:`decision-simulation` | erweitert |
| PRG-18 | Live-Bewertung: Prognose vergangener Läufe gegen eingetroffene Ist-Daten | Muss | v1:`prognose-benchmark` | übernommen |
| PRG-19 | Ehrliche Kennzahlen: keine Fake-Metriken für Fallback-Modelle; fehlende Bewertung wird erklärt | Muss | v1:`honest-fallback-metrics` | übernommen |

## Betrieb

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| PRG-14 | Prognoselauf wöchentlich automatisch nach dem Import und per Knopf; Status und Fortschritt sichtbar | Muss | v1:`forecast-cli`, [Q-083](../open-questions/q-083-rechenrhythmus.md) | bestätigt |
| PRG-20 | Jeder Lauf ist versioniert (Daten-Stand, Journal-Stand, Code-Version, Parameter, Seed) und reproduzierbar | Muss | v1:`forecast-run-tracking`, Robert | erweitert |
| PRG-21 | Läufe vergleichbar: Was hat sich je Artikel gegenüber dem letzten Lauf geändert und warum? | Soll | v1:`forecast-run-history` | erweitert |
| PRG-22 | Wetterdaten als Treiber prüfen | Kann | abgeleitet | offen ([Q-074](../open-questions/q-074-wetter-saisonstart.md)) |

Methodik: [Prognose](../forecasting/index.md).

## Offene Fragen

- [Q-067: Welche externen Faktoren meintest du?](../open-questions/q-067-externe-faktoren.md)
- [Q-076: Welche Horizonte brauchst du?](../open-questions/q-076-prognosehorizont.md)
- [Q-078: Willst du Prognosen korrigieren?](../open-questions/q-078-prognose-korrektur.md)
- [Q-079: Welche Erklärung brauchst du?](../open-questions/q-079-erklaer-tiefe.md)
- [Q-083: Wie oft soll neu gerechnet werden?](../open-questions/q-083-rechenrhythmus.md)

## Verwandte Seiten

- [Modellstrategie](../forecasting/modellstrategie.md)
- [Kennzahlen und Bewertung](../forecasting/kennzahlen-und-bewertung.md)
- [Erklärbarkeit](../forecasting/erklaerbarkeit.md)
- [Anforderungen Monitoring und Ampel](fa-monitoring-ampel.md)
- [Anforderungen](index.md)
