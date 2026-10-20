---
type: question
title: "Q-106: Wie sollen Absatz-Ausreißer erkannt werden?"
description: "Die v1-Verfahren finden auf den echten Daten entweder nichts (IQR) oder rund 1.459 Treffer (gleitender z-Wert); welche Methode soll die Fall-Inbox füttern?"
tags: [offene-frage, block-02, prio-b]
status: draft
visibility: public
ask: robert
question_id: Q-106
priority: B
generated: { by: agent:claude-opus-5-5, at: 2026-10-17T00:00:00Z }
---

# Q-106: Wie sollen Absatz-Ausreißer erkannt werden?

## Kurzfassung

**Status: offen.** Beide Verfahren aus v1 taugen auf den echten Daten (2023 bis Mai 2026) nicht als Quelle für
die Fall-Inbox: Die IQR-Methode findet nichts, der gleitende z-Wert über acht Wochen meldet 1.459 Wochen
in 175 Artikeln. Bis zur Entscheidung zeigt der Prototyp in der Fall-Inbox nur die Datenbefunde (Sammelbuchungen,
FBA, negativer Bestand) und keine Absatz-Ausreißer. Das darf nicht als „es gibt keine Ausreißer“ gelesen werden.

## Inhalt

- [Frage](#frage)
- [Worum es geht](#worum-es-geht)
- [Annahme bis zur Antwort](#annahme-bis-zur-antwort)
- [Was gebraucht wird](#was-gebraucht-wird)
- [Wer entscheidet](#wer-entscheidet)

## Frage

> Mit welchem Verfahren sollen Wochen mit auffälligem Absatz erkannt und Daniel zur Entscheidung „verwenden
> oder ausschließen“ vorgelegt werden?

## Worum es geht

| Verfahren (v1) | Ergebnis auf den echten Daten | Warum |
|---|---|---|
| IQR je Kalenderwoche (Faktor 3, mind. 3 Werte, mind. 50 Tüten Abweichung), ab 2023 | 0 Funde | Mit 3–4 Jahreswerten je Kalenderwoche vergrößert ein Ausreißer seine eigene Grenze: [200, 200, 5000] hat die obere Grenze 9.800. Erst ab etwa 6 Jahreswerten wird ein Ausreißer sichtbar. |
| gleitender z-Wert, Fenster 8 Wochen, Schwelle 2 | 1.459 Funde (1.285 Spitzen, 174 Einbrüche) | Der saisonale Anstieg und normale Schwankungen überschreiten die Schwelle; ab Schwelle 2,5 gibt es mathematisch keine Funde mehr (Fenster mit Messpunkt: größter möglicher Wert 2,47). |

Beide Zahlen stammen aus einem Lauf des v1-Codes auf der Datenbank vom 21.05.2026. Ein Verfahren, das die
Saison berücksichtigt (z. B. Abweichung von Prognose oder Vorjahreswoche), wurde nicht erprobt.

Betrifft: [Daten-Anomalieerkennung](../data/anomalieerkennung.md),
[Datenklassifikation und Herkunft](../data/datenklassifikation-und-herkunft.md).

## Annahme bis zur Antwort

Absatz-Ausreißer werden im Prototyp nicht automatisch erkannt. Die Fall-Inbox enthält nur Datenbefunde; die
Anomalie-Schwellen bleiben Einstellungen (DAT-29), keine festen Regeln.

## Was gebraucht wird

- Entscheidung für ein Verfahren (saisonbereinigt) oder dafür, Ausreißer zunächst nur von Hand zu markieren.
- Daniels Einschätzung, ab welcher Größe eine Woche für ihn eine Entscheidung wert ist (Tüten, Prozent).

## Wer entscheidet

Robert (Prognose und Technik), mit Daniels Einschätzung zur relevanten Größe. Priorität B – vor Umsetzung der
Fall-Inbox in Version 2 klären. Block: Daten und Altdaten.

## Offene Fragen

Diese Seite **ist** die offene Frage. Sie wird geschlossen, indem hier ein Abschnitt
`## Antwort` mit Antwort, Person und Datum ergänzt, `status` auf `stable` gesetzt und die
Antwort in die betroffene Fachseite übernommen wird.

## Verwandte Seiten

- [Offene Fragen](index.md)
- [Daten-Anomalieerkennung](../data/anomalieerkennung.md)
- [Befund: Sammelbuchungen vor 2023](../data/befund-sammelbuchungen-vor-2023.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
