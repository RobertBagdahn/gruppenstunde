---
type: question
title: "Q-097: Soll das Tool selbst ein LLM nutzen?"
description: "Soll das Tool selbst ein LLM nutzen (z. B. Fragen in natürlicher Sprache, Erklärtexte), und welcher Anbieter ist erlaubt?"
tags: [offene-frage, block-05, prio-c]
status: stable
visibility: public
question_id: Q-097
priority: C
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-097: Soll das Tool selbst ein LLM nutzen?

## Kurzfassung

**Status: beantwortet.** Soll das Tool selbst ein LLM nutzen (z. B. Fragen in natürlicher Sprache, Erklärtexte), und welcher Anbieter ist erlaubt? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Soll das Tool selbst ein LLM nutzen (z. B. Fragen in natürlicher Sprache, Erklärtexte), und welcher Anbieter ist erlaubt?

## Worum es geht

Ein LLM im Tool braucht API-Zugang und berührt Datenschutz.

Betrifft: [Nichtfunktionale Anforderungen](../requirements/nfa.md), [Erklärbarkeit](../forecasting/erklaerbarkeit.md).

## Annahme bis zur Antwort

Kein LLM im Tool; agentische Nutzung läuft über Codex und MCP.

## Wer entscheidet

Daniel. Priorität C – kann später geklärt werden. Block: ERP, Betrieb und Weiterentwicklung.

## Antwort

Ja, später auf jeden Fall: LLM-Funktionen im Tool (Fragen in natürlicher Sprache, Erklärtexte, Unterstützung in der Fall-Inbox) kommen als eigene spätere Phase. Der Anbieter wird mit Daniel geklärt; Unternehmensdaten gehen nur an einen freigegebenen Anbieter. Neue Anforderung UI-17 (Kann → später).

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Nichtfunktionale Anforderungen](../requirements/nfa.md)
- [Erklärbarkeit](../forecasting/erklaerbarkeit.md)
