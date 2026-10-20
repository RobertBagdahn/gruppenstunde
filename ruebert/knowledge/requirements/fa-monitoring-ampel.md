---
type: requirements
title: "Anforderungen Monitoring und Ampel"
description: "Fachliche Anforderungen an die Live-Ampel, Reichweite, Ausverkaufsrisiko, Nachsteuer-Signale und Wochenüberblick."
tags: [anforderungen, ampel, monitoring, live]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, v1-datenbank-und-specs]
---

# Anforderungen Monitoring und Ampel

## Kurzfassung

Die Live-Ampel ist die Startseite und das, worauf sich Daniel „schon riesig“ freut (Chat 22.05.2026).
Sie zeigt täglich aktualisiert, welche Artikel bald ausverkauft sind, wo jetzt gehandelt werden
muss, wo Überbestand droht und welche Artikel besser oder schlechter laufen als geplant. Die
Logik aus v1 (kumulative Reichweite, Fehlmenge, Trend, Drehklasse) bleibt; neu sind
Wahrscheinlichkeiten, markenabhängige Schwellen und Nachsteuer-Signale.

## Inhalt

- [Ampel](#ampel)
- [Nachsteuern und Veränderungen](#nachsteuern-und-veränderungen)
- [Bedienung](#bedienung)

## Ampel

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| MON-01 | Startseite zeigt alle aktiven Artikel nach Dringlichkeit; Daten wöchentlich aus dem ERP aktualisiert, manuell auffrischbar | Muss | Chat 16.05., 22.05., [Q-041](../open-questions/q-041-api-aktualitaet.md) | bestätigt |
| MON-02 | Kumulative Reichweite: verfügbarer Bestand + Zulauf wochenweise gegen P50-Prognose bis zum Puffer abbauen | Muss | v1:`cumulative-coverage`, Chat 17.05. | übernommen, Puffer neu |
| MON-03 | Ampelfarben: Blau Überbestand, Rot dringend, Gelb einplanen, Grün OK; Schwellen je Marke relativ zur Lieferzeit konfigurierbar (v1: 13/25/100 Wochen) | Muss | v1:`stockout-alert` | offen ([Q-080](../open-questions/q-080-ampel-schwellen.md)) |
| MON-04 | Wahrscheinlichkeit, vor dem Zieltermin bzw. vor dem nächsten möglichen Wareneingang auszuverkaufen | Muss | Chat 19.05. | abgeleitet |
| MON-05 | Fehlmenge und Umsatzausfall für 3 und 12 Monate mit P10/P90 | Muss | v1:`ampel-shortage-forecast` | übernommen |
| MON-06 | Handlungsempfehlung je Artikel: „bis KW X bestellen, ca. Y Tüten“ mit Link in Bestellplaner bzw. Fremdmarken-Vorschlag | Muss | abgeleitet | abgeleitet |
| MON-07 | Trend-Indikator (Wochen 1–13 vs. 14–26) und Drehklasse als Spalten | Soll | v1:`trend-indicator`, v1:`sales-decile-score` | übernommen |

## Nachsteuern und Veränderungen

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| MON-08 | Nachsteuer-Signal, wenn die Saisonhochrechnung mehr als 20 % über der Prognose liegt und das Ausverkaufsrisiko bis zum Zieltermin über die Servicegrad-Grenze steigt (Schwellen einstellbar) | Muss | Chat (vor 16.05.) Variante 3, [Q-081](../open-questions/q-081-nachsteuern-schwelle.md) | bestätigt |
| MON-09 | Wochenüberblick: Was hat sich seit dem letzten Besuch bzw. letzter Woche geändert (Farbwechsel, neue Fälle, große Abweichungen)? | Soll | abgeleitet | offen ([Q-020](../open-questions/q-020-idealer-montag.md)) |
| MON-10 | Benachrichtigung bei Wechsel auf Rot (E-Mail oder Teams) | Kann | abgeleitet | offen ([Q-082](../open-questions/q-082-benachrichtigung.md)) |
| MON-11 | Hinweis, wenn die Ampel auf veralteten Daten beruht (Datenfrische, Blocker im Import) | Muss | Robert | abgeleitet |

## Bedienung

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| MON-12 | Filter nach Marke, Lieferant, Kategorie, Ampelfarbe, Drehklasse; Filter im URL-Zustand | Muss | v1:`order-filters`, Food-Frontend | übernommen |
| MON-13 | Artikel stummschalten mit Grund und Ablaufdatum (im Journal) | Soll | v1:`stockout-alert` („Ignorieren“) | übernommen |
| MON-14 | Einklappbare Erklärung aller Ampelfarben und Kennzahlen direkt auf der Seite | Soll | v1:`ampel-explanation` | übernommen |
| MON-15 | OOS-Monitor: automatisch erkannte Ausverkaufsphasen (historisch und aktuell) je Artikel und Woche; Daniel kann jede Phase bestätigen, verwerfen oder im Zeitraum korrigieren (Journal) | Muss | [Q-037](../open-questions/q-037-ausverkauf-historie.md) | bestätigt |

## Offene Fragen

- [Q-010: In welchem Rhythmus wird entschieden?](../open-questions/q-010-entscheidungsrhythmus.md)
- [Q-080: Passen die Ampel-Schwellen?](../open-questions/q-080-ampel-schwellen.md)
- [Q-081: Ab wann soll nachgesteuert werden?](../open-questions/q-081-nachsteuern-schwelle.md)
- [Q-082: Wie willst du benachrichtigt werden?](../open-questions/q-082-benachrichtigung.md)

## Verwandte Seiten

- [Nachsteuern in der Saison](../forecasting/nachsteuern-in-der-saison.md)
- [Kennzahlen und Bewertung](../forecasting/kennzahlen-und-bewertung.md)
- [Lager, Bestand und MHD](../business/lager-bestand-mhd.md)
- [Frontend](../plan/frontend.md)
- [Anforderungen](index.md)
