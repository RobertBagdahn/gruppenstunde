---
type: question
title: "Q-033: Sind Sets vorkonfektioniert?"
description: "Sind Sets vorkonfektioniert mit eigenem Bestand, oder werden sie beim Versand aus Einzeltüten gepackt?"
tags: [offene-frage, block-02, prio-a]
status: stable
visibility: public
question_id: Q-033
priority: A
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-033: Sind Sets vorkonfektioniert?

## Kurzfassung

**Status: beantwortet.** Sind Sets vorkonfektioniert mit eigenem Bestand, oder werden sie beim Versand aus Einzeltüten gepackt? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Sind Sets vorkonfektioniert mit eigenem Bestand, oder werden sie beim Versand aus Einzeltüten gepackt?

## Worum es geht

Davon hängt ab, ob ein Set-Verkauf sofort Einzeltüten verbraucht oder ob Set-Bestand separat geplant werden muss.

Betrifft: [Stammdaten, Sets und Bundles](../data/stammdaten-sets-bundles.md), [Artikelbeziehungen](../business/artikelbeziehungen.md).

## Annahme bis zur Antwort

Sets werden aus Einzeltüten gepackt; ein Set-Verkauf verbraucht sofort die Komponenten.

## Wer entscheidet

Daniel. Priorität A – im Workshop am 04.11.2026 klären. Block: Daten und Altdaten.

## Antwort

Beides ist möglich. Das System unterstützt je Set beide Varianten: (a) beim Versand gepackt – ein Set-Verkauf verbraucht sofort die Komponenten; (b) vorkonfektioniert – das Set hat eigenen Bestand, die Komponenten werden bei der Produktion verbraucht (Buchungen „Entnahme/Einlagerung Produktion“). Welches Set welche Variante nutzt, wird als Merkmal je Set gepflegt (ERP oder Journal); bis dahin gilt Variante (a).

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Stammdaten, Sets und Bundles](../data/stammdaten-sets-bundles.md)
- [Artikelbeziehungen](../business/artikelbeziehungen.md)
