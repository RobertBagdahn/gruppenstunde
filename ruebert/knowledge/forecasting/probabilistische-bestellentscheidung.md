---
type: method
title: "Probabilistische Bestellentscheidung"
description: "Wie aus Prognose-Quantilen, Kosten, Raster und Budget eine Bestellmenge für Eigenmarke und ein Bestellpunkt für Fremdmarken entsteht."
tags: [prognose, quantile, servicegrad, newsvendor, bestellung]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Probabilistische Bestellentscheidung

## Kurzfassung

Eine Bestellung ist eine Wette auf eine unsichere Nachfrage. Die Bestellmenge ergibt sich deshalb aus
der Verteilung der Nachfrage bis zum Zieltermin und dem Verhältnis der Kosten von Ausverkauf und
Überbestand (Servicegrad). Für die Eigenmarke kommen das 5.000er-Raster, die Mindestmenge, das MHD
und ein Budget dazu; die beste Rastermenge wird über erwartete Kosten gewählt. Für Fremdmarken gilt
eine Bestellpunkt-Logik mit kurzer Lieferzeit. Alle Rechenschritte bleiben für Daniel sichtbar.

## Inhalt

- [Grundidee Servicegrad](#grundidee-servicegrad)
- [Eigenmarke: Menge im Raster](#eigenmarke-menge-im-raster)
- [Allokation auf 60k-Stufen](#allokation-auf-60k-stufen)
- [Budget](#budget)
- [Fremdmarke: Bestellpunkt](#fremdmarke-bestellpunkt)
- [Einfacher Modus wie in v1](#einfacher-modus-wie-in-v1)

## Grundidee Servicegrad

```text
Cu = Kosten je fehlender Tüte   (Deckungsbeitrag + Ranking-Schaden)
Co = Kosten je übriger Tüte     (EK × Entsorgungswahrscheinlichkeit + Lager + Kapital)
Servicegrad α = Cu / (Cu + Co)
optimale Menge = α-Quantil der Nachfrage bis Zieltermin − verfügbarer Bestand − Zulauf + Puffer
```

Beispiel: Cu = 3 €, Co = 1 € → α = 75 %. Es wird so viel bestellt, dass die Nachfrage bis zum
Zieltermin mit 75 % Wahrscheinlichkeit gedeckt ist. Solange Cu und Co unbekannt sind
([Q-004](../open-questions/q-004-kosten-ausverkauf.md), [Q-005](../open-questions/q-005-kosten-ueberbestand.md)),
stellt Daniel α direkt ein; die v1-Strategien werden als Voreinstellungen übernommen
(z. B. „OOS-Vermeidung“ = 90 %, „Ausgewogen“ = 75 %, „Überbestände reduzieren“ = 60 % – Vorschlag).

Die Verteilung der Summe über viele Wochen wird aus Simulationspfaden (Stichproben je Woche mit
Korrelation über die Saison) gebildet, nicht durch Addieren von Wochenquantilen.

## Eigenmarke: Menge im Raster

Zulässige Mengen: 0 oder 5.000, 10.000, 15.000, … Für jede zulässige Menge q berechnet das Tool
aus den Nachfragepfaden:

| Kennzahl | Bedeutung |
|---|---|
| P(Ausverkauf vor Zieltermin) | Anteil der Pfade, in denen Bestand + q vor dem Zieltermin ≤ Puffer fällt |
| erwartete Fehlmenge | Tüten, die bis zum Zieltermin fehlen |
| erwarteter Rest nach 2,5 Jahren | Tüten, die vermutlich nicht vor MHD-Ende verkauft werden |
| erwartete Kosten | Cu × Fehlmenge + Co × Rest |

Vorschlag = Menge mit den geringsten erwarteten Kosten. Daniel sieht die Nachbarmengen als Vergleich
(„15.000: 22 % Ausverkaufsrisiko, 20.000: 6 %, aber 3.100 Tüten Rest“). Damit ersetzt die
Kostenrechnung die feste Rundungsschwelle; die korrigierte Schwellenrundung
([Einkauf Eigenmarke](../business/einkauf-eigenmarke.md#rundung)) bleibt als einfacher Modus.

Zusätzliche Prüfungen: Bestand reicht bis Wareneingang (Lieferzeit 12 Wochen), Überbestandswarnung
bei Menge ≥ Verkauf oder Prognose der nächsten 2,5 Jahre (aus v1).

## Allokation auf 60k-Stufen

Die Großbestellung muss exakt ein Vielfaches von 60.000 Tüten sein ([Q-044](../open-questions/q-044-60k-stufe.md)).
Ablauf:

1. Je Artikel die kostenoptimale Rastermenge bestimmen (siehe oben) → Summe S.
2. Zielstufe wählen: nächste 60k-Stufe unter und über S; Daniel sieht beide.
3. **Auffüllen** (Stufe > S): 5.000er-Schritte nach größter Kostenersparnis je Schritt hinzufügen
   (meist Artikel mit hohem Ausverkaufsrisiko und kurzer Reichweite), Überbestandsgrenze beachten.
4. **Kürzen** (Stufe < S): 5.000er-Schritte mit dem geringsten Kostenanstieg entfernen; Mindestmenge
   5.000 je bestellter Sorte bleibt, sonst fällt die Sorte ganz heraus.
5. Jede Abweichung vom Bedarfsvorschlag wird je Artikel mit Grund angezeigt.

Das ist ein kleines ganzzahliges Optimierungsproblem; der gierige Schrittansatz ist erklärbar und
für rund 190 Sorten ausreichend. Ein exakter Löser (z. B. ILP) kann zur Kontrolle mitlaufen.

## Budget

Ist zusätzlich ein Budget gesetzt, wird es wie eine Stufe behandelt: Schritte nach Kostenersparnis
je Euro auffüllen, bis das Budget erreicht ist. Das Ergebnis ist eine Rangliste, die Daniel
übersteuern kann. Eine automatische Kürzung ohne Sichtbarkeit gibt es nicht.

## Fremdmarke: Bestellpunkt

```text
Bestellpunkt s = α-Quantil der Nachfrage über (Lieferzeit + Bestellintervall)
Bestellen, wenn verfügbarer Bestand + Zulauf ≤ s
Bestellmenge = auf Mindestabnahme und Verpackungseinheit gerundete Differenz zum Zielbestand S
```

Gebündelt je Lieferant, unter Berücksichtigung von Mindestbestellwert und Bestelltagen
([Q-060](../open-questions/q-060-fremd-konditionen.md)).

## Einfacher Modus wie in v1

Für Vergleichbarkeit mit Daniels Excel bleibt der v1-Weg verfügbar:
Netto-Bedarf = Summe Punktprognose bis Zieltermin − Bestand, × (1 + Reserve %), Raster-Rundung
mit Schwelle auf den angebrochenen Schritt.

## Offene Fragen

- [Q-004: Was kostet eine Ausverkaufswoche?](../open-questions/q-004-kosten-ausverkauf.md)
- [Q-005: Was kostet Überbestand?](../open-questions/q-005-kosten-ueberbestand.md)
- [Q-046: Wie funktionieren Nachbestellungen?](../open-questions/q-046-nachbestellung.md)
- [Q-051: Reserve-Prozent oder Servicegrad?](../open-questions/q-051-reserve-servicegrad.md)
- [Q-054: Wie hoch sind die Einkaufspreise?](../open-questions/q-054-ek-preise.md)

## Verwandte Seiten

- [Zielkonflikt Ausverkauf vs. Überbestand](../business/zielkonflikt-ausverkauf-ueberbestand.md)
- [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md)
- [Anforderungen Bestellplanung Fremdmarke](../requirements/fa-bestellplanung-fremdmarke.md)
- [Kennzahlen und Bewertung](kennzahlen-und-bewertung.md)
- [Prognose](index.md)
