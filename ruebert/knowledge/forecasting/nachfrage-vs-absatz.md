---
type: concept
title: "Nachfrage statt Absatz"
description: "Warum Flower-Demand die Nachfrage und nicht den Absatz prognostiziert und wie Ausverkauf, Sets, Bundles und Sammelbuchungen dabei behandelt werden."
tags: [prognose, nachfrage, zensur, ausverkauf]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Nachfrage statt Absatz

## Kurzfassung

Absatz ist, was verkauft wurde; Nachfrage ist, was verkauft worden wäre. In Wochen mit Ausverkauf
(verfügbarer Bestand ≤ 30) ist der Absatz künstlich niedrig. Wer auf Absatz trainiert, lernt die
eigenen Ausverkäufe mit und bestellt im nächsten Jahr wieder zu wenig – ein Teufelskreis. Flower-Demand
prognostiziert deshalb die Nachfrage je Basisartikel und Woche: nur echte Endkunden-Nachfrage,
Sets und Bundles aufgelöst, zensierte Wochen korrigiert, Ausreißer nur nach Entscheidung entfernt.

## Inhalt

- [Zielgröße](#zielgröße)
- [Zensur durch Ausverkauf](#zensur-durch-ausverkauf)
- [Ranking-Nachwirkung](#ranking-nachwirkung)
- [Granularität](#granularität)

## Zielgröße

```text
nachfrage[artikel, woche] =
      ENDKUNDE-Abgänge des Basisartikels
    + aufgelöste SET_KOMPONENTE
    + aufgelöste BUNDLE_KOMPONENTE
    (+ B2B_GROSSAUFTRAG nur, wenn Daniel ihn als planbar einstuft)
    − nichts für SAMMEL_UMBUCHUNG, UMLAGERUNG, KORREKTUR, FBA_ABGLEICH
  dann: Zensur-Korrektur für Wochen mit verfügbarem Bestand ≤ Puffer
```

Klassen siehe [Datenklassifikation](../data/datenklassifikation-und-herkunft.md). Absatz,
korrigierte Nachfrage und die Differenz werden getrennt gespeichert und angezeigt.

## Zensur durch Ausverkauf

Ab 2023 gibt es je Hauptsaison 29 bis 50 Artikel-Wochen mit Bestand ≤ 30 (Datenscan 10.10.2026).

Verfahren, von einfach nach anspruchsvoll:

1. **Markieren:** zensierte Wochen erhalten ein Flag. Modelle, die mit fehlenden Werten umgehen,
   bekommen sie als fehlend statt als niedrig.
2. **Auffüllen auf Tagesbasis:** Ist ein Artikel nur an einigen Tagen einer Woche ausverkauft,
   wird die Woche aus den verfügbaren Tagen hochgerechnet (Wochentagsprofil der Kategorie).
3. **Modellbasiert:** Nachfrage einer Ausverkaufswoche = Prognose des Modells ohne diese Woche,
   begrenzt durch die Werte ähnlicher Artikel derselben Woche.

Voraussetzung ist ein zuverlässiger Bestandsverlauf ([Befund Bestand danach](../data/befund-bestand-danach.md)).
v1 hatte dafür nur eine einfache `apply_soldout_correction` und keinen geprüften Bestandsverlauf.

## Ranking-Nachwirkung

Nach einem Ausverkauf verkauft ein Amazon-Artikel oft eine Zeit lang schlechter (Chat 19.05.2026).
Diese Wochen sind nicht zensiert, aber gedämpft. Sie werden markiert (`post_stockout`), damit das
Modell sie nicht als neue Normalität lernt. Die Dauer ist offen ([Q-069](../open-questions/q-069-ranking-nach-ausverkauf.md)).

## Granularität

| Ebene | Verwendung |
|---|---|
| Tag | nur für Zensur-Erkennung und Wochentagsprofile |
| ISO-Woche (Montag) | Standard für Modelle, Ampel, Bestellung (wie v1) |
| Saison/Jahr | Hochrechnung, Plausibilität, Jahresplanung |
| Kategorie, Gesamt | Hierarchie, Trend, Plausibilisierung |

Die Prognose erfolgt über alle Kanäle zusammen, solange keine Kanaldaten vorliegen
([Q-035](../open-questions/q-035-kanal-artikelebene.md)).

## Offene Fragen

- [Q-036: Seit wann gilt der Puffer von 30?](../open-questions/q-036-puffer-historie.md)
- [Q-037: Welche Artikel waren wann ausverkauft?](../open-questions/q-037-ausverkauf-historie.md)
- [Q-069: Wie schnell erholt sich das Ranking?](../open-questions/q-069-ranking-nach-ausverkauf.md)
- [Q-072: Verdrängen Bundles Einzeltüten?](../open-questions/q-072-bundle-effekt.md)

## Verwandte Seiten

- [Datenklassifikation und Herkunft](../data/datenklassifikation-und-herkunft.md)
- [Lager, Bestand und MHD](../business/lager-bestand-mhd.md)
- [Artikelbeziehungen](../business/artikelbeziehungen.md)
- [Modellstrategie](modellstrategie.md)
- [Prognose](index.md)
