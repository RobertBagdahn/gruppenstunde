---
type: question
title: "Q-092: Wie wird auf das Tool zugegriffen?"
description: "Wie greift ihr auf interne Tools zu – nur im Büronetz, per VPN oder über einen Reverse Proxy mit HTTPS?"
tags: [offene-frage, block-05, prio-b]
status: stable
visibility: public
question_id: Q-092
priority: B
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-092: Wie wird auf das Tool zugegriffen?

## Kurzfassung

**Status: beantwortet.** Wie greift ihr auf interne Tools zu – nur im Büronetz, per VPN oder über einen Reverse Proxy mit HTTPS? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Wie greift ihr auf interne Tools zu – nur im Büronetz, per VPN oder über einen Reverse Proxy mit HTTPS?

## Worum es geht

Bestimmt Login, TLS und ob Robert für Wartung Zugriff braucht.

Betrifft: [Nichtfunktionale Anforderungen](../requirements/nfa.md), [Zielarchitektur](../plan/zielarchitektur.md).

## Annahme bis zur Antwort

Zugriff im Büronetz und per VPN, HTTPS über einen Reverse Proxy.

## Wer entscheidet

Daniel. Priorität B – vor Umsetzung des betroffenen Bereichs klären. Block: ERP, Betrieb und Weiterentwicklung.

## Antwort

Zugriff nur aus dem Büronetz und per VPN; HTTPS über einen Reverse Proxy (NFA-15 wird Muss).

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Nichtfunktionale Anforderungen](../requirements/nfa.md)
- [Zielarchitektur](../plan/zielarchitektur.md)
