---
type: concept
title: "Einkauf Eigenmarke"
description: "Regeln der Großbestellung der Eigenmarke: 60k-Stufen, 5.000er-Raster, Rundung, Zieltermin, Lieferzeit und der Abgleich mit Daniels Excel-Planung."
tags: [einkauf, eigenmarke, bestellplaner, rundung]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, v1-datenbank-und-specs]
---

# Einkauf Eigenmarke

## Kurzfassung

Die Eigenmarke wird in großen Mengen beim Hersteller bestellt: Stufen zu 60.000 Tüten, mindestens
5.000 Tüten pro Sorte, nur in 5.000er-Schritten, Lieferzeit ca. zwölf Wochen. Die Bestellmenge
ergibt sich aus der Nachfrage bis zu einem frei gewählten Zieltermin (Mai 2026: KW 39/2027) minus
Bestand, gerundet auf das Raster. Daniels Excel-Planung und der v1-Bestellplaner deckten sich im
Mai 2026 bei den meisten Artikeln. Abweichungen gab es bei Grenzartikeln (Budget) und bei
einzelnen Sorten, deren Bedarf das Tool viel höher sah.

## Inhalt

- [Bestellregeln](#bestellregeln)
- [Rundung](#rundung)
- [Zieltermin und Lieferzeit](#zieltermin-und-lieferzeit)
- [Abgleich mit Excel im Mai 2026](#abgleich-mit-excel-im-mai-2026)
- [Bestellzeitpunkte](#bestellzeitpunkte)

## Bestellregeln

| Regel | Wert | Quelle | Status |
|---|---|---|---|
| Stufe | Bestellung muss exakt ein Vielfaches von 60.000 Tüten sein (60k, 120k, 180k, …) | v1 `Project.md`, Chat 16.05.2026, [Q-044](../open-questions/q-044-60k-stufe.md) | entschieden (Robert, 10.10.2026) |
| Mindestmenge pro Sorte | 5.000 Tüten | v1 `Project.md` | bestätigt durch Chat 19.05.2026 |
| Bestellraster | 5.000er-Schritte; 6.000 ist „keine zulässige Menge“ | Chat 19.05.2026 | bestätigt |
| Lieferzeit | ca. 12 Wochen | v1 `Project.md` | Zuverlässigkeit offen ([Q-047](../open-questions/q-047-lieferzeit-zuverlaessigkeit.md)) |
| Nachbestellungen | unterjährig möglich, Konditionen unklar | v1 `Project.md` | offen ([Q-046](../open-questions/q-046-nachbestellung.md)) |
| Reserve-Aufschlag | v1-Standard 10 %, Daniel rechnet mit 0 % | Chat 20.05.2026 | offen ([Q-051](../open-questions/q-051-reserve-servicegrad.md)) |
| Überbestandsgrenze | Menge ≥ Verkauf oder Prognose der nächsten 2,5 Jahre → Warnung | v1-Spec `order-overstock-warning` | aus MHD abgeleitet |

v1 hat die ursprüngliche Idee, 60.000 Tüten optimal auf Sorten zu verteilen (Allokation), wieder
verworfen (v1-Spec `weekly-order-planning`). Version 2 braucht die Allokation wieder: Weil die Summe
exakt eine 60k-Stufe treffen muss, werden die bedarfsbasierten Rastermengen nach Grenznutzen auf die
gewählte Stufe gebracht (Anforderung BEM-11, [Probabilistische Bestellentscheidung](../forecasting/probabilistische-bestellentscheidung.md#allokation-auf-60k-stufen)).

## Rundung

Fehler in v1 (Chat 22.05.2026): Die Rundungsschwelle bezog sich auf die Gesamtmenge.
Bei Schwelle 80 % wurde aus 20.207 die Menge 25.000, weil 20.207 schon 80,8 % von 25.000 sind.

Daniels erwartete Regel: Die Schwelle bezieht sich auf den **angebrochenen Schritt**.

```text
rest = bedarf mod 5.000            # 20.207 → 207
füllgrad = rest / 5.000            # 207 / 5.000 = 4,1 %
wenn füllgrad ≥ schwelle: aufrunden, sonst abrunden   # → 20.000
Ergebnis mindestens 5.000, sobald bestellt wird
```

Zweiter Fehler (Chat 19.05.2026): Für DGW097 ergab ein Netto-Bedarf von 18.000 eine Bestellmenge
von 6.000 – eine unzulässige Menge. Erwartet waren 15.000 oder 20.000. Jede Bestellmenge muss
deshalb durch einen Test auf Rasterkonformität geprüft werden (Anforderung BEM-03).

## Zieltermin und Lieferzeit

- Daniel hat im Mai 2026 den Bedarf „nach der alten Methode bis KW 39/2027“ berechnet und
  wollte den Zieltermin im Tool entsprechend weit wählen können (Chat 19.05.2026).
  v1 erlaubte zunächst nur zwölf Monate.
- Zwischen Bestellung und Wareneingang liegen ca. zwölf Wochen. Der Bestand muss bis zur Ankunft
  reichen; sonst hilft die Bestellung nicht mehr.
- Wie der Zieltermin gewählt wird, ist offen ([Q-049](../open-questions/q-049-zieltermin-regel.md)).

## Abgleich mit Excel im Mai 2026

Daniel und Elena haben alle Positionen des v1-Bestellplaners mit ihrer Excel-Planung verglichen
(Chat 20.05.2026, Reserve 0 %, gleicher Zeitraum):

| Ergebnis | Beispiel | Einordnung |
|---|---|---|
| Deckungsgleich | „die allermeisten Artikel“ | Tool und Excel liefern dieselbe Größenordnung |
| Tool rundet auf, Daniel konservativ | Grenzartikel | Budget; Daniel: „nachvollziehbar, da spätestens im Folgejahr abverkauft“ |
| Tool deutlich höher, Grund unklar | DGW042: > 7.000 vs. 2.000 | Testfall für Erklärbarkeit ([Q-057](../open-questions/q-057-fall-dgw042.md)) |
| Tool deutlich höher, Grund klar | DGW054: 13.000 vs. 6.000 | „extrem starkes Jahr“ |

Daniel hat die Bestellung am 22.05.2026 aus eigener Prognose und Tool-Daten zusammengestellt.
Seit der Version mit ML-Modell und Ensemble hatte er den Eindruck, die Prognose sei „deutlich
nach oben geschraubt“ – teils durch den Rundungsfehler.

## Bestellzeitpunkte

Belegt ist eine Bestellung Ende Mai 2026 („Ende nächste, Anfang übernächste Woche“, Chat
16.05.2026). Ob es eine feste jährliche Großbestellung gibt und wann die nächste ansteht, ist
offen ([Q-003](../open-questions/q-003-naechste-grossbestellung.md),
[Q-048](../open-questions/q-048-bestellzeitpunkte.md)).

## Offene Fragen

- [Q-003: Wann ist die nächste Großbestellung?](../open-questions/q-003-naechste-grossbestellung.md)
- [Q-006: Gibt es ein festes Budget?](../open-questions/q-006-budget-grenze.md)
- [Q-044: Was bedeutet die 60k-Stufe genau?](../open-questions/q-044-60k-stufe.md)
- [Q-045: Gilt das 5.000er-Raster überall?](../open-questions/q-045-raster-mindestmenge.md)
- [Q-050: Bestätigst du die Rundungsregel?](../open-questions/q-050-rundungsregel.md)
- [Q-055: Wird Zulauf im ERP erfasst?](../open-questions/q-055-zulauf.md)

## Verwandte Seiten

- [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md)
- [Probabilistische Bestellentscheidung](../forecasting/probabilistische-bestellentscheidung.md)
- [Zielkonflikt Ausverkauf vs. Überbestand](zielkonflikt-ausverkauf-ueberbestand.md)
- [Lager, Bestand und MHD](lager-bestand-mhd.md)
- [Altsystem Version 1](../system-v1/index.md)
