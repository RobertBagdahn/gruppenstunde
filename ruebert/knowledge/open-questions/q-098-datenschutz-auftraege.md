---
type: question
title: "Q-098: Enthalten Auftragsdaten Kundendaten?"
description: "Dürfen Auftragsdaten Kundendaten enthalten, oder müssen sie vor dem Import entfernt werden?"
tags: [offene-frage, block-05, prio-b]
status: stable
visibility: public
question_id: Q-098
priority: B
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-098: Enthalten Auftragsdaten Kundendaten?

## Kurzfassung

**Status: beantwortet.** Dürfen Auftragsdaten Kundendaten enthalten, oder müssen sie vor dem Import entfernt werden? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Dürfen Auftragsdaten Kundendaten enthalten, oder müssen sie vor dem Import entfernt werden?

## Worum es geht

Für die Prognose werden keine personenbezogenen Daten gebraucht.

Betrifft: [Nichtfunktionale Anforderungen](../requirements/nfa.md), [Anforderungen Daten](../requirements/fa-daten.md).

## Annahme bis zur Antwort

Es werden keine personenbezogenen Daten importiert; der Adapter verwirft sie.

## Wer entscheidet

Daniel. Priorität B – vor Umsetzung des betroffenen Bereichs klären. Block: ERP, Betrieb und Weiterentwicklung.

## Antwort

Es werden keine personenbezogenen Daten importiert; der ERP-Adapter verwirft sie vor dem Schreiben in raw.

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Nichtfunktionale Anforderungen](../requirements/nfa.md)
- [Anforderungen Daten](../requirements/fa-daten.md)
