---
type: concept
title: "Warenbewegungen und Buchungsarten"
description: "Alle 15 Buchungsarten im Warenbewegungs-Export mit Mengen, Zeitraum, vermuteter Bedeutung und Behandlung in v1 und v2."
tags: [daten, warenbewegungen, buchungsarten, klassifikation]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [export-warenbewegungen]
---

# Warenbewegungen und Buchungsarten

## Kurzfassung

Der Export enthält rund 2,3 Millionen Lagerbewegungen der Eigenmarke von Februar 2019 bis Mai 2026.
Jede Zeile hat Artikelnummer, Menge (negativ = Abgang), Zeitpunkt, Buchungsart, Kommentar und
„Bestand danach“. v1 hat nur die Buchungsart „Versandprozess WMS“ als Absatz gezählt. Das ist
zugleich zu viel (technische Sammelbuchungen bis 2022) und zu wenig (Packtisch-Versand 2019/2020).
In v2 bekommt jede Buchung eine Nachfrageklasse über versionierte Regeln aus Buchungsart,
Kommentar und Menge.

## Inhalt

- [Spalten](#spalten)
- [Buchungsarten im Überblick](#buchungsarten-im-überblick)
- [Kommentare als Unterscheidungsmerkmal](#kommentare-als-unterscheidungsmerkmal)
- [Vorgeschlagene Zuordnung zu Nachfrageklassen](#vorgeschlagene-zuordnung-zu-nachfrageklassen)

## Spalten

| Export (v1-Name) | Bedeutung | Bemerkung |
|---|---|---|
| `id` | Buchungs-ID im alten ERP | eindeutiger Originalschlüssel |
| `Artikelnummer` (`sku`) | Artikel | `DGW…`, auch Sets und Sonderartikel |
| `fAnzahl` (`quantity`) | Menge, negativ = Abgang | ganze Tüten |
| Zeitpunkt (`booked_at`) | Buchungszeit mit Millisekunden | gleiche Zeitstempel kommen vor |
| `Buchungsart` (`movement_type`) | Typ der Bewegung | 15 Werte, siehe unten |
| Kommentar (`comment`) | Freitext des Prozesses | trennt z. B. Versand und Umlagerung |
| Bestand danach (`stock_after`) | Bestand nach der Buchung | kein laufender Saldo ([Befund](befund-bestand-danach.md)) |

Datei: Semikolon-getrennt, UTF-8 mit BOM (v1-Spec `parquet-export`).

## Buchungsarten im Überblick

Zahlen aus dem Datenscan vom 10.10.2026 (v1-Datenbank, Daten bis 16.05.2026).

| Buchungsart | Zeilen | Zeitraum | Vermutete Bedeutung | v1 | v2-Klasse (Vorschlag) |
|---|---:|---|---|---|---|
| Versandprozess WMS | 2.134.022 | 2019–2026 | Versand an Endkunden; bis 2022 auch Sammelbuchungen | Absatz | je Menge: `ENDKUNDE` oder `SAMMEL_UMBUCHUNG` |
| Warenausgang | 130.944 | 2019–2024 | Packtisch-Versand, Streckenlager, Auftrag verpacken | ignoriert | je Kommentar |
| FBA Bestandsänderung | 34.513 | 2019–2022 | Abgleich mit Amazon-Lager | ignoriert | `FBA_ABGLEICH` |
| Wareneingang | 3.696 | 2019–2026 | Lieferung vom Hersteller, auch Gegenbuchungen | ignoriert | `WARENEINGANG` oder `GEGENBUCHUNG` |
| Minusbuchung WMS | 3.624 | 2019–2026 | manuelle Abbuchung (Bruch, Schwund?) | ignoriert | `KORREKTUR` |
| Minusbuchung Packtisch | 931 | 2020–2023 | manuelle Abbuchung am Packtisch | ignoriert | `KORREKTUR` |
| Plusbuchung WMS | 546 | 2019–2026 | manuelle Zubuchung | ignoriert | `KORREKTUR` |
| Entnahme Produktion | 415 | 08–12/2025 | Verbrauch für Konfektion? | ignoriert | `PRODUKTION` ([Q-028](../open-questions/q-028-produktion-buchungen.md)) |
| Korrekturbuchung | 304 | 2019–2025 | Bestandskorrektur | ignoriert | `KORREKTUR` |
| Retouren | 192 | 2019–2026 | Kundenretoure | ignoriert | `RETOURE` |
| Einlagerung Produktion | 34 | 08–12/2025 | Ergebnis der Konfektion? | ignoriert | `PRODUKTION` |
| JTL-Ameise Import | 11 | 04/2019 | Datenimport beim Systemstart | ignoriert | `SYSTEM` |
| Plusbuchung Packtisch | 11 | 2020–2022 | manuelle Zubuchung | ignoriert | `KORREKTUR` |
| Inventurdifferenzbuchung | 2 | 12/2025 | Inventur | ignoriert | `INVENTUR` |
| Minusbuchung JTL-Workbench | 1 | 12/2025 | manuelle Abbuchung | ignoriert | `KORREKTUR` |

## Kommentare als Unterscheidungsmerkmal

| Buchungsart | Kommentar | Zeilen | Ø Menge je Zeile | Lesart |
|---|---|---:|---:|---|
| Versandprozess WMS | Versand mit EazyShipping | 2.133.152 | 1,3 (ab 2023) | Endkunden-Versand |
| Versandprozess WMS | Ausgehende Umlagerung mit EazyShipping | 870 | – | Umlagerung, kein Absatz |
| Warenausgang | Versand mit Packtisch+ | 129.666 | 1,3 | Endkunden-Versand 2019/2020 |
| Warenausgang | Ausbuchen aus Streckenlager | 1.146 | 222–2.795 | Sammelabgang ([Q-025](../open-questions/q-025-streckenlager.md)) |
| Warenausgang | Versand über Auftrag verpacken | 97 | ≈ 2.000 | Großauftrag, B2B? ([Q-019](../open-questions/q-019-b2b-grosskunden.md)) |
| FBA Bestandsänderung | FBA Bestand (einbuchen für) Abgleich | 34.513 | bis 1.191 | Bestandsabgleich Amazon-Lager |

Die durchschnittliche Menge je Versandzeile fällt von 6,8 (2019) über 2,6 (2022) auf konstant 1,3
ab 2023. Das ist der stärkste Hinweis darauf, dass vor 2023 Sammelbuchungen beigemischt sind –
siehe [Befund: Sammelbuchungen vor 2023](befund-sammelbuchungen-vor-2023.md).

## Vorgeschlagene Zuordnung zu Nachfrageklassen

Die Regeln sind ein Vorschlag und gehören nach Bestätigung in die versionierte Regeldatei
([Datenklassifikation](datenklassifikation-und-herkunft.md)):

1. `Versandprozess WMS` mit Kommentar „Versand mit EazyShipping“ und Menge < 100 → `ENDKUNDE`.
2. `Versandprozess WMS` mit Menge ≥ 100 und Gegenbuchung gleicher Menge innerhalb 24 h → `SAMMEL_UMBUCHUNG`.
3. `Versandprozess WMS` mit Menge ≥ 100 ohne Gegenbuchung → Fall-Inbox (B2B oder echter Großauftrag).
4. `Warenausgang` + „Versand mit Packtisch+“ → `ENDKUNDE`.
5. `Warenausgang` + „Ausbuchen aus Streckenlager“ / „Auftrag verpacken“ → `SAMMEL_ABGANG` (Fall-Inbox, bis Q-025 beantwortet).
6. Alle Umlagerungen → `UMLAGERUNG`; alle Korrekturen → `KORREKTUR` (keine Nachfrage).

## Offene Fragen

- [Q-024: Was sind große Versandbuchungen 2020–2022?](../open-questions/q-024-sammelbuchungen-versand.md)
- [Q-025: Was bedeutet Ausbuchen aus Streckenlager?](../open-questions/q-025-streckenlager.md)
- [Q-026: Wurde Amazon FBA genutzt?](../open-questions/q-026-fba-bestand.md)
- [Q-027: Warum Versand über Packtisch+?](../open-questions/q-027-packtisch-versand.md)
- [Q-029: Wie zählen Korrekturbuchungen?](../open-questions/q-029-korrekturbuchungen.md)
- [Q-102: Sind identische Buchungen echt?](../open-questions/q-102-doppelte-buchungen.md)

## Verwandte Seiten

- [Befund: Sammelbuchungen vor 2023](befund-sammelbuchungen-vor-2023.md)
- [Datenklassifikation und Herkunft](datenklassifikation-und-herkunft.md)
- [Daten-Anomalieerkennung](anomalieerkennung.md)
- [Quelle: Export Warenbewegungen](../sources/export-warenbewegungen.md)
- [Daten](index.md)
