---
type: question
title: "Q-090: Welche Ressourcen hat die VM?"
description: "Wie viele CPU-Kerne, wie viel RAM und Speicher hat die Ubuntu-VM, und welche Container laufen dort bereits?"
tags: [offene-frage, block-05, prio-a]
status: stable
visibility: public
question_id: Q-090
priority: A
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-090: Welche Ressourcen hat die VM?

## Kurzfassung

**Status: beantwortet.** Wie viele CPU-Kerne, wie viel RAM und Speicher hat die Ubuntu-VM, und welche Container laufen dort bereits? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Wie viele CPU-Kerne, wie viel RAM und Speicher hat die Ubuntu-VM, und welche Container laufen dort bereits?

## Worum es geht

Prognoseläufe mit Machine Learning brauchen mehrere Kerne und einige GB RAM.

Betrifft: [Nichtfunktionale Anforderungen](../requirements/nfa.md), [Zielarchitektur](../plan/zielarchitektur.md).

## Annahme bis zur Antwort

4 Kerne, 16 GB RAM, 100 GB freier Speicher.

## Wer entscheidet

Daniel. Priorität A – im Workshop am 04.11.2026 klären. Block: ERP, Betrieb und Weiterentwicklung.

## Antwort

Wir geben Daniel eine Mindestanforderung für die VM vor: 4 CPU-Kerne, 16 GB RAM, 100 GB freier Speicher für Flower-Demand. Wird sie nicht erreicht, laufen Prognoseläufe länger, aber nachts.

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Nichtfunktionale Anforderungen](../requirements/nfa.md)
- [Zielarchitektur](../plan/zielarchitektur.md)
