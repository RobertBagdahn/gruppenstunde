---
type: question
title: "Q-050: Bestätigst du die Rundungsregel?"
description: "Bestätigst du: Aufrunden auf den nächsten 5.000er-Schritt nur, wenn der angebrochene Schritt mindestens X % gefüllt ist (20.207 → 20.000)? Welcher Standardwert für X?"
tags: [offene-frage, block-03, prio-a]
status: draft
visibility: public
ask: daniel
question_id: Q-050
priority: A
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-050: Bestätigst du die Rundungsregel?

## Kurzfassung

**Status: offen.** Bestätigst du: Aufrunden auf den nächsten 5.000er-Schritt nur, wenn der angebrochene Schritt mindestens X % gefüllt ist (20.207 → 20.000)? Welcher Standardwert für X? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)

## Frage

> Bestätigst du: Aufrunden auf den nächsten 5.000er-Schritt nur, wenn der angebrochene Schritt mindestens X % gefüllt ist (20.207 → 20.000)? Welcher Standardwert für X?

## Worum es geht

In v1 wurde die Schwelle auf die Gesamtmenge bezogen; dadurch wurde zu oft aufgerundet (Feedback 22.05.2026).

Betrifft: [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md), [Einkauf Eigenmarke](../business/einkauf-eigenmarke.md).

## Annahme bis zur Antwort

Schwelle bezieht sich auf den angebrochenen Schritt; Standard 50 %.

## Wer entscheidet

Daniel. Priorität A – im Workshop am 04.11.2026 klären. Block: Einkauf Eigenmarke und Fremdmarke.

**An Daniel:** Robert hat am 10.10.2026 entschieden, diese Frage Daniel zu stellen.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md)
- [Einkauf Eigenmarke](../business/einkauf-eigenmarke.md)
