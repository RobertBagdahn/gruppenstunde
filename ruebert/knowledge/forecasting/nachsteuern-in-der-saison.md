---
type: method
title: "Nachsteuern in der Saison"
description: "Wie Flower-Demand während der Saison mit aktuellen Verkäufen hochrechnet und meldet, wenn Artikel besser oder schlechter laufen als geplant (Variante 3)."
tags: [prognose, nachsteuern, saisonfortschritt, monitoring]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel]
---

# Nachsteuern in der Saison

## Kurzfassung

Daniel möchte Variante 4 für die Jahresplanung und Variante 3 „zum kurzfristigen Nachsteuern, wenn
Artikel doch besser performen wie prognostiziert“ (Chat, vor 16.05.2026). In der Saison sind die
aktuellen Verkäufe die beste Information. Die Saisonfortschrittskurve sagt, welcher Anteil der
Saisonmenge bis zu einer Kalenderwoche üblicherweise verkauft ist. Daraus entsteht eine laufende
Hochrechnung, die mit der Jahresprognose verglichen wird. Weicht sie stark ab und reicht der
Bestand dadurch nicht, meldet die Live-Ampel einen Nachsteuer-Bedarf.

## Inhalt

- [Saisonfortschrittskurve](#saisonfortschrittskurve)
- [Hochrechnung und Gewichtung](#hochrechnung-und-gewichtung)
- [Signale](#signale)
- [Grenzen](#grenzen)

## Saisonfortschrittskurve

```text
fortschritt[kategorie, kw] = Σ Nachfrage bis kw / Σ Nachfrage der ganzen Saison   (je Jahr)
Kurve = Median über die Jahre, Band = Spannweite über die Jahre
```

Beispiel (fiktiv): Bis KW 14 sind bei Gemüsesamen typischerweise 35 % der Saison verkauft
(Spannweite 28–41 %). Hat ein Artikel bis KW 14 schon 4.200 Tüten verkauft, ergibt das eine
Saisonhochrechnung von 4.200 / 0,35 ≈ 12.000 (Band 10.200–15.000).

## Hochrechnung und Gewichtung

Früh in der Saison ist die Hochrechnung unsicher, spät sehr genau. Die aktualisierte Prognose
mischt beides nach Sicherheit:

```text
neue_saison = w × hochrechnung + (1 − w) × jahresprognose
w steigt mit dem Saisonfortschritt und sinkt mit der Streuung der Fortschrittskurve
```

Technisch ist das eine Bayes-Aktualisierung der Saisonsumme. Die Wochenverteilung wird aus der
Saisonkurve abgeleitet. Zensierte Wochen zählen nicht als schwacher Verkauf.

## Signale

| Signal | Bedingung (Startwert) | Wirkung |
|---|---|---|
| Läuft besser | Hochrechnung > Prognose + 20 % und P(Ausverkauf vor Zieltermin) steigt über Servicegrad-Grenze | Ampel-Hinweis „Nachbestellung prüfen“ mit Menge und spätestem Bestelltermin |
| Läuft schlechter | Hochrechnung < Prognose − 20 % | Hinweis auf Überbestand, keine Nachbestellung |
| Saisonverschiebung | früher oder später Start als üblich (Kurvenvergleich aller Artikel) | Hinweis, Hochrechnung wird vorsichtiger gewichtet |
| Ausverkauf droht vor Wareneingang | Bestand reicht nicht bis Lieferzeit | Rot |

Die Schwellen sind Einstellungen ([Q-081](../open-questions/q-081-nachsteuern-schwelle.md)).
Ob eine Nachbestellung der Eigenmarke mit 12 Wochen Lieferzeit in der Saison noch hilft, hängt von
den Nachbestell-Konditionen ab ([Q-046](../open-questions/q-046-nachbestellung.md)).

## Grenzen

- Ein verschobener Saisonstart (Wetter) sieht früh wie Wachstum oder Schwäche aus
  ([Q-074](../open-questions/q-074-wetter-saisonstart.md)).
- Neue Artikel haben keine eigene Kurve und nutzen die Kategoriekurve.
- Die Variante 3 ist aus dem Kontext rekonstruiert, der Originaltext ist abgeschnitten
  ([Q-091](../open-questions/q-091-varianten-3-und-4-vollstaendig.md)).

## Offene Fragen

- [Q-046: Wie funktionieren Nachbestellungen?](../open-questions/q-046-nachbestellung.md)
- [Q-074: Verschiebt das Wetter den Saisonstart?](../open-questions/q-074-wetter-saisonstart.md)
- [Q-081: Ab wann soll nachgesteuert werden?](../open-questions/q-081-nachsteuern-schwelle.md)
- [Q-091: Sind Variante 3 und 4 richtig verstanden?](../open-questions/q-091-varianten-3-und-4-vollstaendig.md)

## Verwandte Seiten

- [Anforderungen Monitoring und Ampel](../requirements/fa-monitoring-ampel.md)
- [Saisonalität und Wachstum](../business/saisonalitaet-und-wachstum.md)
- [Kennzahlen und Bewertung](kennzahlen-und-bewertung.md)
- [Vision, Ziele und Rollen](../requirements/vision-ziele-rollen.md)
- [Prognose](index.md)
