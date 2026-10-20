---
type: question
title: "Q-042: Gemeinsame Datenbasis für Ads?"
description: "Welche Datenbasis planst du für Ads, und sollen wir dieselbe PostgreSQL-Datenbank als gemeinsame, saubere Datenbasis nutzen?"
tags: [offene-frage, block-02, prio-a]
status: stable
visibility: public
question_id: Q-042
priority: A
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-042: Gemeinsame Datenbasis für Ads?

## Kurzfassung

**Status: beantwortet.** Welche Datenbasis planst du für Ads, und sollen wir dieselbe PostgreSQL-Datenbank als gemeinsame, saubere Datenbasis nutzen? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Welche Datenbasis planst du für Ads, und sollen wir dieselbe PostgreSQL-Datenbank als gemeinsame, saubere Datenbasis nutzen?

## Worum es geht

Zwei getrennte Datenbasen laufen auseinander. Eine gemeinsame Basis spart doppelte Arbeit bei Altdaten.

Betrifft: [Datenquellen und ERP](../data/datenquellen-und-erp.md), [Zielarchitektur](../plan/zielarchitektur.md).

## Annahme bis zur Antwort

Flower-Demand baut die Datenbasis so, dass ein späteres Ads-Modul dieselben Kerntabellen lesen kann.

## Wer entscheidet

Daniel (fachlich), Robert (technische Umsetzung). Priorität A – im Workshop am 04.11.2026 klären. Block: Daten und Altdaten.

## Antwort

Ja. Die Kerntabellen von Flower-Demand werden als gemeinsame Datenbasis gebaut, die ein späteres Ads-Modul mitnutzt (DAT-18 wird Muss).

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Datenquellen und ERP](../data/datenquellen-und-erp.md)
- [Zielarchitektur](../plan/zielarchitektur.md)
