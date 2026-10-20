---
type: question
title: "Q-083: Wie oft soll neu gerechnet werden?"
description: "Wie oft soll die Prognose neu gerechnet werden, und darf sie sich zwischen zwei Bestellentscheidungen ändern?"
tags: [offene-frage, block-04, prio-b]
status: stable
visibility: public
question_id: Q-083
priority: B
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-083: Wie oft soll neu gerechnet werden?

## Kurzfassung

**Status: beantwortet.** Wie oft soll die Prognose neu gerechnet werden, und darf sie sich zwischen zwei Bestellentscheidungen ändern? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Wie oft soll die Prognose neu gerechnet werden, und darf sie sich zwischen zwei Bestellentscheidungen ändern?

## Worum es geht

Häufiges Neurechnen ist aktueller, aber unruhiger.

Betrifft: [Anforderungen Prognose](../requirements/fa-prognose.md), [Anforderungen Monitoring und Ampel](../requirements/fa-monitoring-ampel.md).

## Annahme bis zur Antwort

Wöchentlich sonntags nachts; Bestellszenarien frieren ihren Prognosestand ein.

## Wer entscheidet

Daniel. Priorität B – vor Umsetzung des betroffenen Bereichs klären. Block: Prognose und Monitoring.

## Antwort

Die Prognose wird wöchentlich nach dem Wochenimport neu gerechnet. Gespeicherte Bestellszenarien frieren ihren Prognosestand ein und zeigen einen Hinweis, wenn eine neuere Prognose stark abweicht.

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Anforderungen Prognose](../requirements/fa-prognose.md)
- [Anforderungen Monitoring und Ampel](../requirements/fa-monitoring-ampel.md)
