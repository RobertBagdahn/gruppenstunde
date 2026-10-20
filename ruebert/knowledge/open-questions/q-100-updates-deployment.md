---
type: question
title: "Q-100: Wer spielt Updates ein?"
description: "Wer spielt Updates ein, und darf es automatische Updates geben (z. B. nachts per CI)?"
tags: [offene-frage, block-05, prio-b]
status: stable
visibility: public
question_id: Q-100
priority: B
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-100: Wer spielt Updates ein?

## Kurzfassung

**Status: beantwortet.** Wer spielt Updates ein, und darf es automatische Updates geben (z. B. nachts per CI)? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Wer spielt Updates ein, und darf es automatische Updates geben (z. B. nachts per CI)?

## Worum es geht

Automatische Updates sind bequem, aber riskant ohne Tests und Backups.

Betrifft: [Nichtfunktionale Anforderungen](../requirements/nfa.md), [Spec-Driven Development](../plan/spec-driven-development.md).

## Annahme bis zur Antwort

Updates manuell per Skript nach erfolgreicher CI.

## Wer entscheidet

Daniel. Priorität B – vor Umsetzung des betroffenen Bereichs klären. Block: ERP, Betrieb und Weiterentwicklung.

## Antwort

Updates werden automatisch nachts eingespielt, wenn die CI grün ist (inklusive Rebuild-Test). Vor jedem Update wird gesichert; Rückrollen auf die vorige Version muss per Befehl möglich sein und ein fehlgeschlagener Start rollt automatisch zurück (NFA-05 angepasst).

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Nichtfunktionale Anforderungen](../requirements/nfa.md)
- [Spec-Driven Development](../plan/spec-driven-development.md)
