---
type: concept
title: "Saisonalität und Wachstum"
description: "Saisonverlauf des Saatgutgeschäfts und die von Daniel genannten Wachstumstreiber 2019–2026 mit bereinigten Absatzzahlen."
tags: [saison, wachstum, treiber, ereignisse]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, export-warenbewegungen]
---

# Saisonalität und Wachstum

## Kurzfassung

Saatgut verkauft sich vor allem in der Hauptsaison März bis Mai; danach brechen die Verkäufe stark
ein (Chat 17.05.2026). Die Nebensaison ist schwer vorherzusagen und hat prozentual die größten
Prognosefehler. Das Wachstum hat mehrere Treiber, die Daniel selbst „gerne alle kennen“ würde:
Sortimentsausbau, Amazon-Ranking, Corona 2021, Varianten-Listing 2023, neues Layout ab Ende 2025,
Bundles 2026 und externe Faktoren. Bereinigt um technische Sammelbuchungen ist das Wachstum seit
2021 deutlich gleichmäßiger als in v1 angenommen.

## Inhalt

- [Saisonverlauf](#saisonverlauf)
- [Wachstumstreiber nach Daniel](#wachstumstreiber-nach-daniel)
- [Absatz je Jahr, roh und bereinigt](#absatz-je-jahr-roh-und-bereinigt)
- [Ereigniskalender](#ereigniskalender)

## Saisonverlauf

| Phase | Zeitraum | Merkmal | Quelle |
|---|---|---|---|
| Hauptsaison | März–Mai (v1: KW 9–22) | Hauptaussaatzeit, größter Absatz | v1 `Project.md`, Chat 17.05.2026 |
| Nach der Hauptsaison | ab Juni | „Sales gehen dann sehr stark zurück“ | Chat 17.05.2026 |
| Herbst | Sept.–Nov. | kleiner Peak, Wintergemüse (v1-Annahme, unbestätigt) | v1 `Project.md` |
| Q4 | Nov.–Dez. | Adventskalender, Weihnachtsbaum-Samen | Chat 17.05.2026 |
| Jahreswechsel | Januar | Glücksklee | Chat 17.05.2026 |

Ein Ausverkauf im Februar, der die ganze Hauptsaison verpasst, ist der schlimmste Fall (v1 `Project.md`).
v1 markiert Ostern und den 20. März in allen Diagrammen; ob Ostern den Saisonstart verschiebt, ist
nicht belegt ([Q-074](../open-questions/q-074-wetter-saisonstart.md)).

## Wachstumstreiber nach Daniel

Aus dem Chat vom 17.05.2026, in Daniels Reihenfolge:

1. **Sortimentsausbau** – die Eigenmarke wurde über die Jahre erweitert.
2. **Amazon-Ranking** – neue Artikel müssen Ranking aufbauen (Amazon ≈ 80–90 %).
3. **Corona-Boost 2021** – Baumärkte und Gartencenter geschlossen, Menschen zu Hause im Garten.
4. **Varianten-Listing 2023** – höheres Ranking durch zusammengelegte Listings.
5. **Neues Produktlayout** – seit Ende 2025, schrittweise nach Abverkauf des alten Layouts.
6. **3er- und 5er-Packs** – seit 2026.
7. **Externe Faktoren** – Text abgeschnitten ([Q-067](../open-questions/q-067-externe-faktoren.md)).

Daniel korrigierte Roberts Eindruck „dieses Jahr doppelt so viel“: Die Hauptsaison war Mitte Mai
fast vorbei, der Rest des Jahres bringt wenig dazu (Chat 17.05.2026).

## Absatz je Jahr, roh und bereinigt

Tüten aus den Warenbewegungen der Eigenmarke (Export bis 16.05.2026). „Roh v1“ ist, was v1 als
Absatz gezählt hat. „Endkunde (bereinigt)“ zählt nur Versandbuchungen unter 100 Tüten pro Zeile
plus Packtisch-Versand – siehe [Befund Sammelbuchungen](../data/befund-sammelbuchungen-vor-2023.md).

| Jahr | Roh v1 („Versandprozess WMS“) | davon Sammelbuchungen ≥ 100 | Packtisch-Versand | Endkunde (bereinigt) |
|---|---:|---:|---:|---:|
| 2019 | 34.267 | 27.207 | 10.974 | ≈ 18.000 |
| 2020 | 194.557 | 155.517 | 152.549 | ≈ 192.000 |
| 2021 | 559.549 | 322.600 | – | ≈ 237.000 |
| 2022 | 643.304 | 325.650 | – | ≈ 318.000 |
| 2023 | 488.410 | 4.753 | – | ≈ 484.000 |
| 2024 | 563.087 | 11.345 | – | ≈ 552.000 |
| 2025 | 588.011 | 3.664 | – | ≈ 584.000 |
| 2026 (bis 16.05.) | 487.807 | 525 | – | ≈ 487.000 |

Die bereinigten Werte sind eine **Hypothese** und noch nicht von Daniel bestätigt. Endkunden-Verkäufe
aus Amazon-Lagern (FBA) fehlen vermutlich vor 2023 ganz ([Q-026](../open-questions/q-026-fba-bestand.md)).

## Ereigniskalender

Ereignisse werden in v2 als Daten gepflegt (Anforderung DAT-13 in [Daten](../requirements/fa-daten.md)):

| Ereignis | Zeitraum | Art | Belegt durch |
|---|---|---|---|
| Corona-Boost | 2020–2021 | Nachfrageschock | Chat 17.05.2026 |
| FBA-Phase (Hypothese) | bis 2022 | Datenlücke | Buchungsarten |
| Varianten-Listing | 2023 | Strukturbruch | Chat 17.05.2026 |
| Neues Layout | ab Ende 2025 | schleichend je Artikel | Chat 17.05.2026 |
| Bundles 3er/5er | ab 2026 | neue Verkaufsform | Chat 17.05.2026 |
| ERP-Migration | Sommer/Herbst 2026 | Datenquellenwechsel | Chat 29.05. und 07.10.2026 |

## Offene Fragen

- [Q-067: Welche externen Faktoren meintest du?](../open-questions/q-067-externe-faktoren.md)
- [Q-071: Welche Artikel haben wann das neue Layout?](../open-questions/q-071-layout-zeitplan.md)
- [Q-073: Was treibt die Nebensaison?](../open-questions/q-073-nebensaison-treiber.md)
- [Q-074: Verschiebt das Wetter den Saisonstart?](../open-questions/q-074-wetter-saisonstart.md)
- [Q-075: Gibt es eine Liste besonderer Ereignisse?](../open-questions/q-075-ereignisliste.md)

## Verwandte Seiten

- [Vertriebskanäle und Amazon](vertriebskanaele-und-amazon.md)
- [Befund: Sammelbuchungen vor 2023](../data/befund-sammelbuchungen-vor-2023.md)
- [Modellstrategie](../forecasting/modellstrategie.md)
- [Nachsteuern in der Saison](../forecasting/nachsteuern-in-der-saison.md)
- [Geschäftsmodell](index.md)
