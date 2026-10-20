---
type: observation
title: "Befund: Sammelbuchungen vor 2023"
description: "2019–2022 enthält die Buchungsart Versandprozess WMS technische Sammelbuchungen, die v1 als Verkauf gezählt hat – 2021 und 2022 rund die Hälfte des Absatzes."
tags: [befund, daten, sammelbuchungen, v1-fehler]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [export-warenbewegungen]
---

# Befund: Sammelbuchungen vor 2023

## Kurzfassung

v1 zählt jede Buchung „Versandprozess WMS“ als Verkauf. Von 2019 bis 2022 stecken darin 916 Zeilen
mit je mindestens 100 Tüten, zusammen 830.974 Tüten. 98–99 % davon werden innerhalb von 24 Stunden
durch eine Zubuchung derselben Menge ausgeglichen – sie sind technische Umbuchungen, keine Verkäufe.
Dadurch war der Absatz in v1 für 2021 um rund 58 % und für 2022 um rund 51 % zu hoch. Gleichzeitig
fehlt 2019/2020 der Versand über den Packtisch. Der Befund ist eine **Hypothese aus den Daten** und
muss von Daniel bestätigt werden.

## Inhalt

- [Beobachtung](#beobachtung)
- [Beispiel DGW022 am 05.05.2021](#beispiel-dgw022-am-05052021)
- [Folgen](#folgen)
- [Behandlung in Version 2](#behandlung-in-version-2)

## Beobachtung

| Jahr | Zeilen ≥ 100 | Tüten in diesen Zeilen | davon gespiegelt (± 24 h) | Versand < 100 je Zeile |
|---|---:|---:|---:|---:|
| 2019 | 77 | 27.207 | 27.107 (99,6 %) | 7.060 |
| 2020 | 614 | 155.517 | 154.338 (99,2 %) | 39.040 |
| 2021 | 121 | 322.600 | 320.655 (99,4 %) | 236.949 |
| 2022 | 104 | 325.650 | 321.480 (98,7 %) | 317.654 |
| 2023 | 20 | 4.753 | – | 483.657 |
| 2024 | 37 | 11.345 | – | 551.742 |
| 2025 | 21 | 3.664 | – | 584.347 |

„Gespiegelt“: Es gibt beim selben Artikel innerhalb von 24 Stunden eine Buchung „Wareneingang“,
„Plusbuchung WMS“ oder „Korrekturbuchung“ mit genau der umgekehrten Menge.

Parallel dazu gibt es in denselben Jahren „Warenausgang – Ausbuchen aus Streckenlager“ mit
Durchschnittsmengen von 222 (2020) bis 2.795 (2022) Tüten pro Zeile.

## Beispiel DGW022 am 05.05.2021

| Zeit | Buchungsart | Menge | Bestand danach |
|---|---|---:|---:|
| 19:23:59 | Versandprozess WMS | −2.569 | 69 |
| 19:23:59 | Versandprozess WMS | −21.931 | 69 |
| 19:24:00 | Wareneingang | +21.931 | 69 |
| 19:24:59 | Wareneingang | +24.500 | 69 |
| 19:25:01 | Warenausgang | −21.931 | 69 |

Innerhalb von zwei Minuten werden 21.931 Tüten ab-, zu- und wieder abgebucht; der Bestand ändert
sich nicht. Das sieht nach einer Umbuchung zwischen Lagern aus (etwa ins Streckenlager oder zu
Amazon), nicht nach Kundenverkäufen.

## Folgen

- **Wachstum:** Die vermeintliche Verdopplung zwischen 2020 und 2022 ist zum großen Teil ein
  Buchungseffekt. Bereinigt: ≈ 192.000 (2020), ≈ 237.000 (2021), ≈ 318.000 (2022), ≈ 484.000 (2023)
  Tüten – siehe [Saisonalität und Wachstum](../business/saisonalitaet-und-wachstum.md).
- **Training:** v1 hat 2018–2022 ganz ausgeschlossen und nur ab 2023 trainiert. Das war im
  Ergebnis vorsichtig richtig, verschenkt aber Saisonhistorie. Mit Klassifikation lassen sich
  2021 und 2022 vermutlich wieder nutzen.
- **Fehlende Verkäufe:** Wenn ein Teil des Geschäfts über Amazon-Lager (FBA) lief, fehlen dessen
  Endkunden-Verkäufe vor 2023 ganz ([Q-026](../open-questions/q-026-fba-bestand.md)).
- **Packtisch:** 2019/2020 liefen 163.523 Tüten Endkunden-Versand über „Versand mit Packtisch+“,
  die v1 nicht gezählt hat.

## Behandlung in Version 2

1. Regel R-020: Versand ≥ 100 Tüten mit Spiegelbuchung → `SAMMEL_UMBUCHUNG` (keine Nachfrage).
2. Versand ≥ 100 Tüten ohne Spiegelbuchung → Fall-Inbox.
3. „Versand mit Packtisch+“ → `ENDKUNDE`.
4. Ob 2021/2022 ins Training zurückkommen, entscheidet ein Backtest mit und ohne diese Jahre.

## Offene Fragen

- [Q-019: Gibt es B2B- oder Großkunden?](../open-questions/q-019-b2b-grosskunden.md)
- [Q-024: Was sind große Versandbuchungen 2020–2022?](../open-questions/q-024-sammelbuchungen-versand.md)
- [Q-025: Was bedeutet Ausbuchen aus Streckenlager?](../open-questions/q-025-streckenlager.md)
- [Q-026: Wurde Amazon FBA genutzt?](../open-questions/q-026-fba-bestand.md)
- [Q-027: Warum Versand über Packtisch+?](../open-questions/q-027-packtisch-versand.md)

## Verwandte Seiten

- [Warenbewegungen und Buchungsarten](warenbewegungen-buchungsarten.md)
- [Daten-Anomalieerkennung](anomalieerkennung.md)
- [Saisonalität und Wachstum](../business/saisonalitaet-und-wachstum.md)
- [Learnings aus Version 1](../system-v1/learnings.md)
- [Daten](index.md)
