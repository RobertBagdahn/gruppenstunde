---
type: concept
title: "Datenklassifikation und Herkunft"
description: "Wie jede Datenzeile eindeutig identifiziert, mit Herkunft versehen und einer Nachfrageklasse zugeordnet wird – und wie Daniel unklare Fälle entscheidet."
tags: [daten, klassifikation, herkunft, lineage, fall-inbox]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [arbeitsentscheidungen, export-warenbewegungen]
---

# Datenklassifikation und Herkunft

## Kurzfassung

Robert will alle Daten genau identifizieren und unterscheiden können; Daniel ist der Experte, der
Fälle schnell einschätzt. Deshalb trägt jede Zeile ihre Herkunft bis zur Originalzeile im
Stammsystem, und jede Bewegung bekommt über versionierte Regeln eine Nachfrageklasse. Nichts wird
weggefiltert – auch ausgeschlossene Zeilen bleiben mit Klasse und Begründung sichtbar. Wo Regeln
nicht sicher entscheiden, landet der Fall in der Fall-Inbox. Daniel entscheidet mit einem Klick,
die Entscheidung wird ins Entscheidungs-Journal geschrieben und kann zur neuen Regel werden.

## Inhalt

- [Herkunft je Zeile](#herkunft-je-zeile)
- [Nachfrageklassen](#nachfrageklassen)
- [Regeln](#regeln)
- [Fall-Inbox](#fall-inbox)
- [Rückverfolgbarkeit in der Oberfläche](#rückverfolgbarkeit-in-der-oberfläche)

## Herkunft je Zeile

| Feld | Bedeutung |
|---|---|
| `source_system` | `erp_legacy`, `erp`, `shopify`, `journal` |
| `source_object` | z. B. `inventory_movement`, `order_line`, `product` |
| `source_key` | Originalschlüssel im Stammsystem (z. B. Buchungs-ID) |
| `batch_id` | Import-Lauf mit Zeitpunkt, Datei oder Endpoint, Prüfsumme |
| `row_hash` | Prüfsumme der Originalzeile – erkennt Änderungen und Duplikate |
| `ingested_at` | Zeitpunkt des Imports |

Natürlicher Schlüssel ist `(source_system, source_object, source_key)`. Ein erneuter Import
derselben Zeile erzeugt keinen zweiten Datensatz; eine geänderte Zeile erzeugt eine neue Version.

## Nachfrageklassen

| Klasse | Zählt als Nachfrage? | Beispiel |
|---|---|---|
| `ENDKUNDE` | ja | Versand mit EazyShipping, 1–5 Tüten |
| `SET_KOMPONENTE` | ja (aufgelöst) | Verkauf eines Sets → Komponenten |
| `BUNDLE_KOMPONENTE` | ja (aufgelöst) | 3er-Pack → 3 Tüten Basisartikel |
| `B2B_GROSSAUFTRAG` | getrennt ausgewiesen, Entscheidung je Fall | „Versand über Auftrag verpacken“, ≈ 2.000 Tüten |
| `SAMMEL_UMBUCHUNG` | nein | Versand −21.931 mit Gegenbuchung +21.931 |
| `SAMMEL_ABGANG` | offen | Ausbuchen aus Streckenlager |
| `FBA_ABGLEICH` | nein | FBA Bestand Abgleich |
| `UMLAGERUNG` | nein | Ausgehende Umlagerung |
| `WARENEINGANG` | nein | Lieferung vom Hersteller |
| `GEGENBUCHUNG` | nein | Wareneingang, der eine Sammelbuchung ausgleicht |
| `RETOURE` | nein (Bestand +) | Retouren |
| `KORREKTUR`, `INVENTUR`, `PRODUKTION`, `SYSTEM` | nein | Plus-/Minusbuchungen, Inventur |
| `UNKLAR` | nein, bis entschieden | Fall in der Fall-Inbox |

Zusätzliche Merkmale je Artikel-Woche: `censored` (Bestand ≤ Puffer), `anomaly_ids`,
`excluded_by_decision`, `event_ids`.

## Regeln

- Regeln liegen versioniert im Entscheidungs-Journal (`classification_rule`), mit ID, Version,
  Bedingung, Zielklasse, Begründung und Autor.
- Jede klassifizierte Zeile speichert `rule_id` und `rule_version`. Ändert sich eine Regel, ist
  sichtbar, welche Zeilen betroffen sind, und der Rebuild ordnet sie neu zu.
- Reihenfolge: Expertenentscheidung zur Zeile > spezifische Regel > allgemeine Regel > `UNKLAR`.
- Vorgeschlagene Startregeln stehen in [Buchungsarten](warenbewegungen-buchungsarten.md).

## Fall-Inbox

Die Fall-Inbox ist der Ort, an dem Daniels Fachwissen in die Daten fließt.

| Element | Inhalt |
|---|---|
| Fallkarte | Artikel „Name (SKU)“, Zeitraum, betroffene Zeilen, Menge, Kontextdiagramm (Wochen davor/danach, Vorjahre), Bestand |
| Vorschlag | Klasse, die das System vermutet, mit Begründung und Sicherheit |
| Aktionen | ein Klick je Klasse, „Behalten“, „Ausschließen“, „Später“; optional Kommentar |
| Gruppierung | ähnliche Fälle werden gebündelt („41 Buchungen dieser Art übernehmen?“) |
| Wirkung | zeigt vor dem Speichern, wie sich Nachfrage und Prognose ändern |
| Tastatur | Tasten 1–9 für Klassen, Enter für Vorschlag übernehmen |

Quellen der Fälle: `UNKLAR`-Zeilen, [Anomalieerkennung](anomalieerkennung.md), Zensur-Wochen zur
Bestätigung, neue Artikel ohne Stammdaten. Entschiedene Fälle bleiben mit Begründung im Journal.
Aus wiederkehrenden Entscheidungen schlägt das System neue Regeln vor; Daniel bestätigt sie.

## Rückverfolgbarkeit in der Oberfläche

Jede Zahl in der Oberfläche lässt sich aufklappen: Bestellmenge → Prognose → Nachfrage je Woche →
klassifizierte Zeilen → Originalzeile mit Quelle und Import. So beantwortet das Tool die Frage
„Wo kommt diese Zahl her?“ bis zur einzelnen Buchung (Anforderung DAT-19).

## Offene Fragen

- [Q-019: Gibt es B2B- oder Großkunden?](../open-questions/q-019-b2b-grosskunden.md)
- [Q-024: Was sind große Versandbuchungen 2020–2022?](../open-questions/q-024-sammelbuchungen-versand.md)
- [Q-029: Wie zählen Korrekturbuchungen?](../open-questions/q-029-korrekturbuchungen.md)
- [Q-037: Welche Artikel waren wann ausverkauft?](../open-questions/q-037-ausverkauf-historie.md)

## Verwandte Seiten

- [Datenpipeline und Neuaufbau](datenpipeline-und-neuaufbau.md)
- [Daten-Anomalieerkennung](anomalieerkennung.md)
- [Warenbewegungen und Buchungsarten](warenbewegungen-buchungsarten.md)
- [Anforderungen Daten](../requirements/fa-daten.md)
- [Erklärbarkeit](../forecasting/erklaerbarkeit.md)
