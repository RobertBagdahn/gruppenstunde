---
type: question
title: "Q-044: Was bedeutet die 60k-Stufe genau?"
description: "Was genau bedeutet die 60k-Stufe – Mindestvolumen pro Bestellung, Preisstaffel oder Produktionslos? Muss eine Bestellung exakt ein Vielfaches von 60.000 sein?"
tags: [offene-frage, block-03, prio-a]
status: stable
visibility: public
question_id: Q-044
priority: A
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Q-044: Was bedeutet die 60k-Stufe genau?

## Kurzfassung

**Status: beantwortet.** Was genau bedeutet die 60k-Stufe – Mindestvolumen pro Bestellung, Preisstaffel oder Produktionslos? Muss eine Bestellung exakt ein Vielfaches von 60.000 sein? Bis zur Antwort gilt die unten genannte Annahme. Sie darf
nicht als bestätigte Regel ausgegeben werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Wer entscheidet](#wer-entscheidet)
- [Antwort](#antwort)

## Frage

> Was genau bedeutet die 60k-Stufe – Mindestvolumen pro Bestellung, Preisstaffel oder Produktionslos? Muss eine Bestellung exakt ein Vielfaches von 60.000 sein?

## Worum es geht

v1 hat die Allokation auf 60k-Stufen zugunsten artikelweiser Mengen mit Budgetwarnung aufgegeben. Ob das korrekt ist, hängt von dieser Regel ab.

Betrifft: [Einkauf Eigenmarke](../business/einkauf-eigenmarke.md), [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md).

## Annahme bis zur Antwort

60.000 ist ein Mindestvolumen pro Bestellung; die Summe muss nicht exakt ein Vielfaches sein.

## Wer entscheidet

Daniel. Priorität A – im Workshop am 04.11.2026 klären. Block: Einkauf Eigenmarke und Fremdmarke.

## Antwort

Die Großbestellung muss exakt ein Vielfaches von 60.000 Tüten sein (60k, 120k, 180k, …). Damit braucht der Bestellplaner wieder eine **Allokation**: Die bedarfsbasierten Rastermengen werden auf die nächste passende 60k-Stufe gebracht, indem Mengen nach Grenznutzen (geringstes Ausverkaufsrisiko je zusätzlichem 5.000er-Schritt bzw. geringster Schaden beim Kürzen) erhöht oder gekürzt werden. Daniel sieht beide Nachbarstufen (z. B. 120k und 180k) im Vergleich. Widerspruch W1 ist damit zugunsten der Allokation entschieden; BEM-11 wird angepasst.

Entschieden von Robert am 10.10.2026.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
- [Einkauf Eigenmarke](../business/einkauf-eigenmarke.md)
- [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md)
