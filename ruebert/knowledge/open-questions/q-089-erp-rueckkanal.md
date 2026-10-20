---
type: question
title: "Q-089: Sollen ERP-Änderungen zurückfließen?"
description: "Sollen Änderungen an einer Bestellung im ERP (Menge, Termin, Storno) ins Tool zurückfließen?"
tags: [offene-frage, block-05, prio-c]
status: stable
visibility: public
question_id: Q-089
priority: C
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-089: Sollen ERP-Änderungen zurückfließen?

## Kurzfassung

**Status: beantwortet.** Sollen Änderungen an einer Bestellung im ERP (Menge, Termin, Storno) ins Tool zurückfließen? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Sollen Änderungen an einer Bestellung im ERP (Menge, Termin, Storno) ins Tool zurückfließen?

## Worum es geht

Sonst zeigt das Tool veralteten Zulauf.

Betrifft: [Anforderungen ERP-Integration](../requirements/fa-erp-integration.md), [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md).

## Annahme bis zur Antwort

Zulauf wird bei jedem Import aus dem ERP neu gelesen; das ERP ist führend.

## Wer entscheidet

Daniel. Priorität C – kann später geklärt werden. Block: ERP, Betrieb und Weiterentwicklung.

## Antwort

Ja, das ERP ist führend. Bestellungen und Zulauf werden bei jedem Import neu aus dem ERP gelesen; Änderungen dort (Menge, Termin, Storno) überschreiben den Stand im Tool (ERP-08 wird Muss).

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Anforderungen ERP-Integration](../requirements/fa-erp-integration.md)
- [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md)
