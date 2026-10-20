---
type: question
title: "Q-024: Was sind große Versandbuchungen 2020–2022?"
description: "Was steckt hinter den großen Mengen pro Buchung in „Versandprozess WMS“ 2020–2022 (bis 21.931 Tüten in einer Zeile)?"
tags: [offene-frage, block-02, prio-a]
status: stable
visibility: public
question_id: Q-024
priority: A
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-024: Was sind große Versandbuchungen 2020–2022?

## Kurzfassung

**Status: beantwortet.** Was steckt hinter den großen Mengen pro Buchung in „Versandprozess WMS“ 2020–2022 (bis 21.931 Tüten in einer Zeile)? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Was steckt hinter den großen Mengen pro Buchung in „Versandprozess WMS“ 2020–2022 (bis 21.931 Tüten in einer Zeile)?

## Worum es geht

Diese Zeilen zählen in v1 als Verkauf. Sind es Umlagerungen oder B2B-Lieferungen, ist die Nachfrage dieser Jahre stark überschätzt.

Betrifft: [Befund: Sammelbuchungen vor 2023](../data/befund-sammelbuchungen-vor-2023.md), [Warenbewegungen und Buchungsarten](../data/warenbewegungen-buchungsarten.md).

## Annahme bis zur Antwort

Buchungen über 100 Tüten pro Zeile vor 2023 sind keine Endkunden-Nachfrage (Regel R-020, bis zur Antwort in der Fall-Inbox).

## Wer entscheidet

Daniel. Priorität A – im Workshop am 04.11.2026 klären. Block: Daten und Altdaten.

## Antwort

Versandbuchungen ab 100 Tüten pro Zeile mit Gegenbuchung derselben Menge innerhalb von 24 Stunden sind technische Umbuchungen und keine Nachfrage (Regel R-020, Klasse SAMMEL_UMBUCHUNG). Große Buchungen ohne Gegenbuchung gehen weiter in die Fall-Inbox.

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Befund: Sammelbuchungen vor 2023](../data/befund-sammelbuchungen-vor-2023.md)
- [Warenbewegungen und Buchungsarten](../data/warenbewegungen-buchungsarten.md)
