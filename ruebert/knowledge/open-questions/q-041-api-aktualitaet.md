---
type: question
title: "Q-041: Wie aktuell sind API-Daten?"
description: "Wie aktuell können Daten per ERP-API abgerufen werden (Echtzeit, stündlich, täglich), und gibt es Rate-Limits?"
tags: [offene-frage, block-02, prio-b]
status: stable
visibility: public
question_id: Q-041
priority: B
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-041: Wie aktuell sind API-Daten?

## Kurzfassung

**Status: beantwortet.** Wie aktuell können Daten per ERP-API abgerufen werden (Echtzeit, stündlich, täglich), und gibt es Rate-Limits? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Wie aktuell können Daten per ERP-API abgerufen werden (Echtzeit, stündlich, täglich), und gibt es Rate-Limits?

## Worum es geht

Die Live-Ampel ist nur so aktuell wie der letzte Import.

Betrifft: [Datenquellen und ERP](../data/datenquellen-und-erp.md), [Anforderungen ERP-Integration](../requirements/fa-erp-integration.md).

## Annahme bis zur Antwort

Täglicher nächtlicher Import plus manueller Import-Knopf.

## Wer entscheidet

Daniel. Priorität B – vor Umsetzung des betroffenen Bereichs klären. Block: Daten und Altdaten.

## Antwort

Ein Abruf pro Woche reicht. Der Regelimport läuft wöchentlich (zusammen mit Prüfungen, Prognose und Ampel); ein manueller Import-Knopf bleibt für Sonderfälle. Betrifft DAT-02, MON-01 und den Tagesablauf in der Zielarchitektur.

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Datenquellen und ERP](../data/datenquellen-und-erp.md)
- [Anforderungen ERP-Integration](../requirements/fa-erp-integration.md)
