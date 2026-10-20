---
type: concept
title: "Zielkonflikt Ausverkauf vs. Überbestand"
description: "Warum jede Bestellmenge eine Risikoabwägung zwischen entgangenen Verkäufen und Entsorgung ist und wie das Tool sie sichtbar macht."
tags: [risiko, servicegrad, ausverkauf, ueberbestand]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel]
---

# Zielkonflikt Ausverkauf vs. Überbestand

## Kurzfassung

Daniel steht bei jeder Bestellung zwischen zwei Schmerzen: „Palettenweise Zeug wegwerfen tut
extrem weh, aber ein fast leeres Lager und entgangene Sales tun auch ziemlich weh (vor allem weil
sich Sold Out auch negativ auf das Ranking bei Amazon auswirkt)“ (Chat 19.05.2026). Weil die
Nachfrage unsicher ist, gibt es keine „richtige“ Menge, sondern nur eine gute Abwägung von
Risiken. Robert hat daraus abgeleitet: „ein Spiel mit Risiken und Quantilen“. Das Tool muss diese
Abwägung je Artikel sichtbar und einstellbar machen.

## Inhalt

- [Die zwei Kostenarten](#die-zwei-kostenarten)
- [Warum Quantile](#warum-quantile)
- [Was Daniel einstellen können soll](#was-daniel-einstellen-können-soll)

## Die zwei Kostenarten

| | Ausverkauf (zu wenig) | Überbestand (zu viel) |
|---|---|---|
| Direkte Kosten | entgangener Deckungsbeitrag | Einkaufspreis entsorgter Tüten, Lagerplatz |
| Indirekte Kosten | Amazon-Ranking sinkt, auch nach Wiederauffüllung | Kapitalbindung, Budget fehlt für andere Sorten |
| Zeitpunkt | sofort, besonders teuer in der Hauptsaison | spät, wenn das MHD naht (3 Jahre) |
| Korrigierbar? | Eigenmarke: nur mit 12 Wochen Verzug | nein, nur Abverkauf |
| Quantifiziert? | nein ([Q-004](../open-questions/q-004-kosten-ausverkauf.md)) | nein ([Q-005](../open-questions/q-005-kosten-ueberbestand.md)) |

v1 bildete den Konflikt über drei Strategien ab: „Überbestände reduzieren“, „Ausgewogen“,
„OOS-Vermeidung“ (Gewicht 0,8 / 0,5 / 0,2) und einen Reserve-Aufschlag in Prozent.

## Warum Quantile

Eine Punktprognose („erwartet 8.000 Tüten“) verschweigt, dass es mit gewisser Wahrscheinlichkeit
auch 5.000 oder 12.000 werden. Bestellt man genau den Erwartungswert, verkauft man in rund der
Hälfte der Fälle aus. Ist Ausverkauf teurer als Überbestand, muss man über dem Erwartungswert
bestellen – wie weit, ergibt sich aus dem Kostenverhältnis (Servicegrad). Die Rechnung steht in
[Probabilistische Bestellentscheidung](../forecasting/probabilistische-bestellentscheidung.md).

Zusätzlich verändern die Rasterregeln die Abwägung: Bei 5.000er-Schritten kann der nächste Schritt
mehrere Jahre Bestand bedeuten. Dann zählt das MHD.

## Was Daniel einstellen können soll

- Servicegrad bzw. Strategie global und je Artikelgruppe (z. B. Top-Seller vorsichtiger).
- Budgetgrenze mit sichtbarer Priorisierung.
- Je Artikel: „Wie wahrscheinlich ist ein Ausverkauf bis zum Zieltermin bei dieser Menge?“ und
  „Wie viele Tüten bleiben voraussichtlich nach 2,5 Jahren übrig?“

## Offene Fragen

- [Q-004: Was kostet eine Ausverkaufswoche?](../open-questions/q-004-kosten-ausverkauf.md)
- [Q-005: Was kostet Überbestand?](../open-questions/q-005-kosten-ueberbestand.md)
- [Q-006: Gibt es ein festes Budget?](../open-questions/q-006-budget-grenze.md)
- [Q-051: Reserve-Prozent oder Servicegrad?](../open-questions/q-051-reserve-servicegrad.md)
- [Q-077: Wie soll Unsicherheit aussehen?](../open-questions/q-077-unsicherheit-darstellung.md)

## Verwandte Seiten

- [Probabilistische Bestellentscheidung](../forecasting/probabilistische-bestellentscheidung.md)
- [Einkauf Eigenmarke](einkauf-eigenmarke.md)
- [Lager, Bestand und MHD](lager-bestand-mhd.md)
- [Vertriebskanäle und Amazon](vertriebskanaele-und-amazon.md)
- [Anforderungen Bestellplanung Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md)
