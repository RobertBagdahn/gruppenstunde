---
type: question
title: "Q-101: Was bedeutet „Bestand danach“?"
description: "Was bedeutet die Spalte „Bestand danach“ in den Warenbewegungen? Bei Versänden bleibt sie in 61 % der Fälle gleich und steigt teils ohne Wareneingang (z. B. 71 → 72). Ist das der verfügbare Bestand nach Reservierungen?"
tags: [offene-frage, block-02, prio-a]
status: draft
visibility: public
ask: daniel
question_id: Q-101
priority: A
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-101: Was bedeutet „Bestand danach“?

## Kurzfassung

**Status: offen.** Was bedeutet die Spalte „Bestand danach“ in den Warenbewegungen? Bei Versänden bleibt sie in 61 % der Fälle gleich und steigt teils ohne Wareneingang (z. B. 71 → 72). Ist das der verfügbare Bestand nach Reservierungen? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)

## Frage

> Was bedeutet die Spalte „Bestand danach“ in den Warenbewegungen? Bei Versänden bleibt sie in 61 % der Fälle gleich und steigt teils ohne Wareneingang (z. B. 71 → 72). Ist das der verfügbare Bestand nach Reservierungen?

## Worum es geht

Ausverkaufserkennung und Puffer-Logik hängen daran, welcher Bestand gemeint ist. Ein laufender Saldo ist die Spalte nachweislich nicht.

Betrifft: [Befund: Bestand danach ist kein Saldo](../data/befund-bestand-danach.md), [Lager, Bestand und MHD](../business/lager-bestand-mhd.md).

## Annahme bis zur Antwort

„Bestand danach“ ist der verfügbare Bestand (nach Reservierungen) zum Buchungszeitpunkt und passt damit zur Puffer-Regel.

## Wer entscheidet

Daniel. Priorität A – im Workshop am 04.11.2026 klären. Block: Daten und Altdaten.

**An Daniel:** Robert hat am 10.10.2026 entschieden, diese Frage Daniel zu stellen.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Befund: Bestand danach ist kein Saldo](../data/befund-bestand-danach.md)
- [Lager, Bestand und MHD](../business/lager-bestand-mhd.md)
