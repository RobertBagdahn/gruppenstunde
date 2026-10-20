---
type: concept
title: "Daten-Anomalieerkennung"
description: "Katalog der automatischen Prüfungen, die auffällige Daten finden, mit Schweregrad, Folge und den Funden aus dem Datenscan vom 10.10.2026."
tags: [daten, anomalien, datenqualitaet, fall-inbox]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [export-warenbewegungen, v1-datenbank-und-specs]
---

# Daten-Anomalieerkennung

## Kurzfassung

Die Anomalieerkennung prüft bei jedem Import und jedem Rebuild automatisch, ob Daten auffällig sind:
kaputte Struktur, widersprüchliche Bestände, unplausible Mengen, Ausreißer in Zeitreihen und
Verstöße gegen Geschäftsregeln. Jeder Fund bekommt einen Schweregrad: Blocker stoppen den Import,
Fälle gehen in die Fall-Inbox zu Daniel, Hinweise erscheinen im Datenqualitätsbericht. v1 kannte
nur eine Ausreißerprüfung je Kalenderwoche. Der erste Scan der v1-Daten hat bereits zwölf Arten
von Auffälligkeiten gefunden, darunter zwei, die die Prognose grundlegend verändern.

## Inhalt

- [Schweregrade](#schweregrade)
- [Prüfkatalog](#prüfkatalog)
- [Funde im Datenscan vom 10.10.2026](#funde-im-datenscan-vom-10102026)
- [Ablauf](#ablauf)
- [Erbe aus v1](#erbe-aus-v1)

## Schweregrade

| Stufe | Wirkung | Beispiel |
|---|---|---|
| Blocker | Import bricht ab, letzter guter Stand bleibt aktiv, Hinweis auf Startseite | Prüfsumme des Altdaten-Archivs geändert |
| Fall | Zeilen bleiben `UNKLAR` bzw. markiert, Fall in der Fall-Inbox | Versandbuchung über 100 Tüten ohne Gegenbuchung |
| Hinweis | Eintrag im Datenqualitätsbericht, keine Wirkung auf Prognose | Buchung am Sonntag |

## Prüfkatalog

| ID | Prüfung | Regel (Startwert) | Stufe |
|---|---|---|---|
| A-01 | Schema | Pflichtspalten, Typen, Zeichensatz | Blocker |
| A-02 | Archiv-Integrität | Prüfsumme je Archivdatei unverändert | Blocker |
| A-03 | Importvolumen | Zeilen je Import weicht > 50 % vom Mittel der letzten 4 Läufe ab | Fall |
| A-04 | Duplikate | gleiche Artikel, Zeitpunkt, Menge, Buchungsart | Hinweis, ab Häufung Fall |
| A-05 | Unbekannter Artikel | Artikelnummer nicht im Artikelstamm | Fall |
| A-06 | Beziehungs-Konsistenz | Set ohne `is_set`, Komponente unbekannt, Bundle ohne Mapping | Fall |
| A-07 | Große Einzelbuchung | Abgang ≥ 100 Tüten in einer Zeile | Fall |
| A-08 | Spiegelbuchung | Abgang und Zugang gleicher Menge innerhalb 24 h | automatisch `SAMMEL_UMBUCHUNG`, Stichprobe als Fall |
| A-09 | Bestandskette | „Bestand danach“ passt nicht zu Vorbestand plus Menge | Hinweis (Semantik offen) |
| A-10 | Negativer Bestand | Bestand < 0 | Fall |
| A-11 | Wochen-Ausreißer | Woche außerhalb [Q1 − 3·IQR, Q3 + 3·IQR] gleicher KW anderer Jahre und Abweichung > 50 | Fall |
| A-12 | Niveausprung | dauerhafter Sprung im gleitenden Mittel (Changepoint) | Fall mit Ereignis-Vorschlag |
| A-13 | Unerwartete Null | kein Absatz in einer Hauptsaison-Woche bei Artikel mit sonst > 20 Tüten pro Woche und Bestand > Puffer | Fall (Listing-Problem?) |
| A-14 | Zensur | Wochenend-Bestand ≤ Puffer 30 | automatisch `censored`, Bestätigung als Fall |
| A-15 | Rasterverstoß Wareneingang | Eigenmarken-Wareneingang kein Vielfaches von 5.000 | Hinweis |
| A-16 | Verteilungsdrift | Anteil einer Buchungsart oder Ø Menge je Zeile ändert sich sprunghaft | Fall |
| A-17 | Datenlücke | keine Bewegungen an Werktagen, Datenende älter als 8 Tage (wöchentlicher Abruf) | Fall bzw. Blocker für Ampel |
| A-18 | Stammdaten-Änderung | Preis, Kategorie oder Status ändert sich | Hinweis |

Schwellwerte sind Einstellungen im Entscheidungs-Journal, nicht im Code.

## Funde im Datenscan vom 10.10.2026

Ausgeführt auf der v1-Datenbank (Daten bis 16.05.2026), siehe [Quelle v1](../sources/v1-datenbank-und-specs.md).

| Prüfung | Fund | Bedeutung |
|---|---|---|
| A-07/A-08 | 916 Versandzeilen ≥ 100 Tüten 2019–2022 mit zusammen 830.974 Tüten; 98–99 % davon innerhalb 24 h gespiegelt | technische Umbuchungen statt Verkauf ([Befund](befund-sammelbuchungen-vor-2023.md)) |
| A-09 | 2025: bei 61 % der Buchungen bleibt „Bestand danach“ gleich; teils steigt er ohne Zugang | Spalte ist kein Saldo ([Befund](befund-bestand-danach.md)) |
| A-10 | negativer Bestand: 2020 1.015 Zeilen (21 Artikel), 2024 107 Zeilen bis −2.950, 2025 84 Zeilen | [Q-104](../open-questions/q-104-negativer-bestand.md) |
| A-04 | 15.346 Gruppen identischer Buchungen | [Q-102](../open-questions/q-102-doppelte-buchungen.md) |
| A-05 | 29 `DGW`-Nummern ohne Stammdaten; `DGWADV` mit 8.567 verkauften Tüten | [Q-103](../open-questions/q-103-unbekannte-artikelnummern.md) |
| A-06 | 14 Sets zugeordnet, aber `is_set` überall falsch | Sync-Fehler in v1 |
| A-14 | Hauptsaison: 29 (2023), 50 (2024), 39 (2025), 43 (2026) Artikel-Wochen mit Bestand ≤ 30 | zensierte Nachfrage |
| A-13 | 190 Artikel-Wochen ohne Absatz in der Hauptsaison 2025 bei sonst gut laufenden Artikeln | Ursache offen (Ausverkauf, Listing, Neuanlage) |
| A-11 | 117 Wochen-Spitzen (> 3 × Median gleicher KW und > 100 Tüten) bei 53 Artikeln seit 2023 | Fälle für Daniel |
| A-07 | Einzelversand 2024-10-09 DGW128 −2.000; mehrere −500 seit 2023 | B2B-Aufträge? ([Q-019](../open-questions/q-019-b2b-grosskunden.md)) |
| A-15 | 2025: nur 123 von 264 Wareneingängen sind Vielfache von 5.000 | Teil-, Nach- oder Rücklieferungen |
| A-16 | Ø Menge je Versandzeile: 6,8 (2019) → 2,6 (2022) → 1,3 (ab 2023) | Strukturbruch 2023 |

Die Prüfungen A-13 und A-11 sind mit Startwerten gerechnet und müssen mit Daniel kalibriert werden.

## Ablauf

1. Import schreibt raw, Prüfungen A-01 bis A-05 laufen sofort; Blocker stoppen hier.
2. Nach staging und core laufen A-06 bis A-10, A-15, A-18.
3. Nach der Wochenaggregation laufen A-11 bis A-14, A-16, A-17.
4. Jeder Fund wird als `anomaly` mit Prüfung, Zeilen-IDs, Messwert, Schwelle und Erklärtext gespeichert.
5. Fälle erscheinen in der [Fall-Inbox](datenklassifikation-und-herkunft.md#fall-inbox), gebündelt nach Prüfung und Artikel.
6. Der Datenqualitätsbericht je Import zeigt alle Funde, Trend über Zeit und offene Fälle.

Anomalien sind Ergebnisse und werden bei jedem Rebuild neu berechnet. Nur Daniels Entscheidungen
zu Fällen sind dauerhaft – im Entscheidungs-Journal.

## Erbe aus v1

v1 hatte eine Seite „Anomalien“ mit IQR-Prüfung je Kalenderwoche ab 2023, Mindestabweichung 50,
Aktionen „Excludieren“ und „Behalten“ sowie Massenaktionen (v1-Specs `anomaly-detection`,
`sales-exclusions`, `anomaly-flat-list`). Diese Logik lebt als A-11 weiter. Neu sind die
strukturellen Prüfungen auf Buchungsebene, die in v1 fehlten und die großen Datenfehler übersehen haben.

## Offene Fragen

- [Q-019: Gibt es B2B- oder Großkunden?](../open-questions/q-019-b2b-grosskunden.md)
- [Q-037: Welche Artikel waren wann ausverkauft?](../open-questions/q-037-ausverkauf-historie.md)
- [Q-102: Sind identische Buchungen echt?](../open-questions/q-102-doppelte-buchungen.md)
- [Q-103: Was sind Artikelnummern ohne Stammdaten?](../open-questions/q-103-unbekannte-artikelnummern.md)
- [Q-104: Warum gibt es negativen Bestand?](../open-questions/q-104-negativer-bestand.md)
- [Q-106: Wie sollen Absatz-Ausreißer erkannt werden?](../open-questions/q-106-anomalie-methode-absatz.md)

## Verwandte Seiten

- [Datenklassifikation und Herkunft](datenklassifikation-und-herkunft.md)
- [Datenpipeline und Neuaufbau](datenpipeline-und-neuaufbau.md)
- [Befund: Sammelbuchungen vor 2023](befund-sammelbuchungen-vor-2023.md)
- [Befund: Bestand danach ist kein Saldo](befund-bestand-danach.md)
- [Anforderungen Daten](../requirements/fa-daten.md)
