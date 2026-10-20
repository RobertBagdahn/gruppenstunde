---
type: question
title: "Q-056: Wie läuft eine Bestellung ab?"
description: "Welche Schritte hat eine Bestellung vom Vorschlag bis zum Versand an den Hersteller (Prüfung, Freigabe, Format)?"
tags: [offene-frage, block-03, prio-b]
status: stable
visibility: public
question_id: Q-056
priority: B
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-056: Wie läuft eine Bestellung ab?

## Kurzfassung

**Status: beantwortet.** Welche Schritte hat eine Bestellung vom Vorschlag bis zum Versand an den Hersteller (Prüfung, Freigabe, Format)? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Welche Schritte hat eine Bestellung vom Vorschlag bis zum Versand an den Hersteller (Prüfung, Freigabe, Format)?

## Worum es geht

Der Freigabe-Workflow im Tool soll den echten Ablauf abbilden.

Betrifft: [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md), [Anforderungen ERP-Integration](../requirements/fa-erp-integration.md).

## Annahme bis zur Antwort

Vorschlag → Prüfung durch Daniel → Freigabe → Bestellung im ERP.

## Wer entscheidet

Daniel. Priorität B – vor Umsetzung des betroffenen Bereichs klären. Block: Einkauf Eigenmarke und Fremdmarke.

## Antwort

Ablauf: Vorschlag → Prüfung durch Daniel → Freigabe durch Daniel → Bestellentwurf im ERP (mit ERP-Belegnummer zurück). Abgeschickt wird im ERP.

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md)
- [Anforderungen ERP-Integration](../requirements/fa-erp-integration.md)
