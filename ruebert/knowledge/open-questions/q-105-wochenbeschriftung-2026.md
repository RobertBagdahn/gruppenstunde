---
type: question
title: "Q-105: Wie sind Wochen in Daniels Datenbasis beschriftet?"
description: "v1 beschriftet alle Wochen ab 2026 eine Woche zu spät; gilt das auch für die PostgreSQL-Datenbasis und Vario?"
tags: [offene-frage, block-02, prio-a]
status: draft
visibility: public
ask: daniel
question_id: Q-105
priority: A
generated: { by: agent:claude-opus-5-5, at: 2026-10-17T00:00:00Z }
---

# Q-105: Wie sind Wochen in Daniels Datenbasis beschriftet?

## Kurzfassung

**Status: offen.** Die v1-Datenbank beschriftet alle Wochen ab 2026 sieben Tage zu spät
([Befund](../data/befund-kalenderwochen-2026.md)). Offen ist, ob die kuratierte PostgreSQL-Datenbasis und
Vario Wochen anders beschriften und welche Wochenlogik Rübert übernehmen soll. Bis zur Antwort gilt die unten
genannte Annahme. Sie darf nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Was gebraucht wird](#was-gebraucht-wird)
- [Wer entscheidet](#wer-entscheidet)

## Frage

> Ab welchem Montag beginnt in deiner PostgreSQL-Datenbasis und in Vario eine Woche – und stimmt „KW“ dort
> mit der ISO-Kalenderwoche überein?

## Worum es geht

Rübert plant in ISO-Wochen (Montag bis Sonntag, [NFA-06](../requirements/nfa.md)). In v1 liegen die Zeilen von
2026 sieben Tage nach dem ISO-Montag; die Prognose trägt die Verschiebung. Wenn Daniels Datenbasis anders
beschriftet, würden Absatz und Prognose beim Umstellen gegeneinander um Wochen versetzt.

Betrifft: [Befund: Kalenderwochen 2026](../data/befund-kalenderwochen-2026.md),
[Datenpipeline und Neuaufbau](../data/datenpipeline-und-neuaufbau.md).

## Annahme bis zur Antwort

Die ISO-Woche (`year`, `week`) der v1-Zeilen ist richtig, die Beschriftung `week_start` ist falsch. Der
Prototyp zeigt die korrigierte Beschriftung; die ursprüngliche steht in `v1_week_start`.

## Was gebraucht wird

- Beschriftungsregel der Wochen in der PostgreSQL-Datenbasis (Wochenbeginn, Zeitzone).
- Eine Stichprobe: Absatz einer Woche in PostgreSQL gegen die Buchungen derselben Tage.

## Wer entscheidet

Daniel (Datenbasis). Priorität A – im Workshop am 04.11.2026 klären. Block: Daten und Altdaten.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Befund: Kalenderwochen 2026](../data/befund-kalenderwochen-2026.md)
- [Quelle: Folgeantworten Daniel](../sources/daniel-followup.md)
