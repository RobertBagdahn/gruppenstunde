---
type: question
title: "Q-081: Ab wann soll nachgesteuert werden?"
description: "Ab welcher Abweichung („Artikel läuft X % besser als prognostiziert“) möchtest du einen Hinweis bekommen?"
tags: [offene-frage, block-04, prio-b]
status: stable
visibility: public
question_id: Q-081
priority: B
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-081: Ab wann soll nachgesteuert werden?

## Kurzfassung

**Status: beantwortet.** Ab welcher Abweichung („Artikel läuft X % besser als prognostiziert“) möchtest du einen Hinweis bekommen? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Ab welcher Abweichung („Artikel läuft X % besser als prognostiziert“) möchtest du einen Hinweis bekommen?

## Worum es geht

Das ist der Kern von Variante 3: kurzfristig nachsteuern, wenn Artikel besser laufen.

Betrifft: [Nachsteuern in der Saison](../forecasting/nachsteuern-in-der-saison.md), [Anforderungen Monitoring und Ampel](../requirements/fa-monitoring-ampel.md).

## Annahme bis zur Antwort

Hinweis, wenn die Hochrechnung der Saison um mehr als 20 % über der Prognose liegt und der Bestand dadurch vor dem Zieltermin ausgeht.

## Wer entscheidet

Daniel. Priorität B – vor Umsetzung des betroffenen Bereichs klären. Block: Prognose und Monitoring.

## Antwort

Nachsteuer-Hinweis, wenn die Saisonhochrechnung mehr als 20 % über der Prognose liegt und dadurch das Ausverkaufsrisiko bis zum Zieltermin über die Servicegrad-Grenze steigt. Beide Schwellen sind Einstellungen.

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Nachsteuern in der Saison](../forecasting/nachsteuern-in-der-saison.md)
- [Anforderungen Monitoring und Ampel](../requirements/fa-monitoring-ampel.md)
