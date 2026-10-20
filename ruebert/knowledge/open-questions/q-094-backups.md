---
type: question
title: "Q-094: Wie werden Backups gemacht?"
description: "Gibt es eine Backup-Lösung für die VM, und wo sollen Datenbank-Backups liegen?"
tags: [offene-frage, block-05, prio-b]
status: draft
visibility: public
ask: daniel
question_id: Q-094
priority: B
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-094: Wie werden Backups gemacht?

## Kurzfassung

**Status: offen.** Gibt es eine Backup-Lösung für die VM, und wo sollen Datenbank-Backups liegen? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)

## Frage

> Gibt es eine Backup-Lösung für die VM, und wo sollen Datenbank-Backups liegen?

## Worum es geht

Expertenentscheidungen und Bestellhistorie sind nicht reproduzierbar und müssen gesichert werden.

Betrifft: [Nichtfunktionale Anforderungen](../requirements/nfa.md), [Zielarchitektur](../plan/zielarchitektur.md).

## Annahme bis zur Antwort

Tägliches pg_dump auf ein Netzlaufwerk, 30 Tage Aufbewahrung.

## Wer entscheidet

Daniel. Priorität B – vor Umsetzung des betroffenen Bereichs klären. Block: ERP, Betrieb und Weiterentwicklung.

**An Daniel:** Robert hat am 10.10.2026 entschieden, diese Frage Daniel zu stellen.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Nichtfunktionale Anforderungen](../requirements/nfa.md)
- [Zielarchitektur](../plan/zielarchitektur.md)
