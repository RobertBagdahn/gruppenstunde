---
type: concept
title: "Datenpipeline und Neuaufbau"
description: "Stammsystem-Prinzip und nukebare Pipeline: Flower-Demand lässt sich jederzeit vollständig aus den echten Daten neu aufbauen."
tags: [daten, pipeline, rebuild, nukebar, stammsystem, entscheidungs-journal]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [arbeitsentscheidungen]
---

# Datenpipeline und Neuaufbau

## Kurzfassung

Die Originaldaten liegen immer im Stammsystem; Flower-Demand ist nur eine Ableitung davon. Die
eigene Datenbank darf jederzeit komplett gelöscht werden („nuke“) und wird dann aus den Quellen
neu aufgebaut („rebuild“) – mit demselben Ergebnis. Dafür laufen alle Schritte als
deterministische, idempotente Pipeline in festen Schichten. Was nicht aus dem Stammsystem kommt
(Daniels Entscheidungen, Regeln, Ereignisse, Einstellungen), liegt als versioniertes
Entscheidungs-Journal in Git und nicht nur in der Datenbank. Diese Regel ist von Robert
vorgegeben und gilt für jede Erweiterung.

## Inhalt

- [Stammsystem-Prinzip](#stammsystem-prinzip)
- [Schichten der Pipeline](#schichten-der-pipeline)
- [Entscheidungs-Journal](#entscheidungs-journal)
- [Nuke und Rebuild](#nuke-und-rebuild)
- [Täglicher Lauf vs. Vollaufbau](#täglicher-lauf-vs-vollaufbau)

## Stammsystem-Prinzip

| Daten | Stammsystem | Flower-Demand hält |
|---|---|---|
| Artikel, Bestand, Aufträge, Bewegungen ab Migration | neues ERP | abgeleitete Kopie |
| Historie vor der Migration | eingefrorener Altdaten-Export (Dateien + Manifest mit Prüfsummen) | abgeleitete Kopie |
| Shop-Merkmale (Aussaat, Kategorie) | Shopify | abgeleitete Kopie |
| Abgeschickte Bestellungen | neues ERP | Verweis auf ERP-Nummer |
| Daniels Entscheidungen, Regeln, Ereignisse, Einstellungen | Entscheidungs-Journal in Git | Projektion |
| Prognosen, Ampel, Kennzahlen, Anomalien | – (berechnet) | Ergebnis, jederzeit neu berechenbar |

Regeln:

1. Flower-Demand schreibt nie in Originaldaten. Einzige Ausnahme: Bestellentwürfe im ERP nach Freigabe.
2. Der Altdaten-Export wird einmal archiviert (schreibgeschützt, Prüfsumme je Datei). Ändert sich eine
   Prüfsumme, bricht der Import mit Fehler ab.
3. Es gibt keinen Zustand, der nur in der Datenbank existiert.

## Schichten der Pipeline

```text
Stammsysteme ──▶ 1 extract ──▶ 2 raw ──▶ 3 staging ──▶ 4 core ──▶ 5 demand ──▶ 6 forecast ──▶ 7 planning
(ERP, Archiv,      Abruf/        unverändert,  typisiert,   Artikel,     klassifiziert,  Läufe,       Ampel,
 Shop, Journal)    Datei-Read    mit Herkunft  dedupliziert Bewegungen,  aufgelöst,      Quantile,    Vorschläge,
                                                            Bestand      Anomalien       Backtests    Szenarien
```

| Schicht | Inhalt | Eigenschaft |
|---|---|---|
| raw | Zeilen exakt wie geliefert + `source`, `batch_id`, `source_key`, `row_hash` | append-only |
| staging | Typen, Zeitzone, Einheiten normalisiert; Duplikate markiert, nicht gelöscht | reine Funktion von raw |
| core | Artikel, Bewegungen, Auftragspositionen, Bestandsverlauf, Beziehungen mit Gültigkeit | reine Funktion von staging + Journal |
| demand | Nachfrageklasse je Zeile, Set/Bundle-Auflösung, Zensur, Anomalie-Flags, Wochenreihen | reine Funktion von core + Regeln |
| forecast | Prognoseläufe mit Quantilen, Backtests, Erklärungen | reine Funktion von demand + Code-Version + Seed |
| planning | Ampel, Reichweite, Bestellvorschläge, Szenarien | reine Funktion von forecast + core + Journal |

Jede Schicht ist ein eigenes PostgreSQL-Schema ([Datenmodell](../plan/datenmodell.md)). Schritte
ab staging dürfen nur ihre Eingabeschichten lesen – nie das Stammsystem direkt.

## Entscheidungs-Journal

Alles, was Menschen entscheiden, ist ein Ereignis in einem Append-only-Journal (JSON Lines) in
einem Git-Repository:

| Journal-Typ | Beispiel |
|---|---|
| `expert_decision` | „Buchung 18764: SAMMEL_UMBUCHUNG, weil Gegenbuchung“ – Daniel, Datum |
| `classification_rule` | neue Regelversion R-020 v2 |
| `event` | „Varianten-Listing Kräuter ab 2023-04-01“ |
| `scope` | „DGWADV ignorieren“ |
| `setting` | Servicegrad, Rundungsschwelle, Ampel-Schwellen |
| `forecast_adjustment` | „DGW054 ×1,2 bis KW 22/2027, Grund: neues Listing“ |
| `order_scenario` | gespeicherter Entwurf eines Bestellszenarios |

Das Backend schreibt jede Entscheidung zuerst ins Journal und committet sie, dann in die Datenbank.
Beim Rebuild wird das Journal von vorne eingelesen. So ist jede Entscheidung versioniert,
begründet, nachvollziehbar und überlebt jeden Nuke (Entscheidung ADR-03 in
[Arbeitsentscheidungen](../sources/arbeitsentscheidungen.md)).

## Nuke und Rebuild

```bash
make nuke       # löscht alle Schemas von Flower-Demand (nie das Stammsystem, nie das Journal)
make rebuild    # extract → raw → … → planning, voller Lauf aus Archiv + ERP + Journal
make verify     # vergleicht Kennzahlen-Prüfsummen mit dem letzten Lauf
```

Anforderungen an den Rebuild (DAT-20 bis DAT-23 in [Anforderungen Daten](../requirements/fa-daten.md)):

- **Deterministisch:** gleiche Quellen + gleicher Code + gleiches Journal → gleiche Zahlen
  (feste Seeds, stabile Sortierung, keine Abhängigkeit von „heute“ außer über einen Stichtag-Parameter).
- **Idempotent:** zweimal hintereinander ausgeführt ändert nichts.
- **Stichtag-fähig:** `make rebuild AS_OF=2025-05-01` baut den Stand eines vergangenen Tages – die
  Grundlage für ehrliche Backtests und den Bestellsimulator.
- **Geprüft:** ein wöchentlicher Rebuild in eine Schatten-Datenbank vergleicht Prüfsummen mit dem
  Produktivstand. Abweichungen sind ein Fehler.
- **Schnell genug:** Vollaufbau inklusive Prognose unter einer Stunde auf der Ziel-VM.

## Täglicher Lauf vs. Vollaufbau

| Lauf | Wann | Umfang |
|---|---|---|
| Inkrementell | wöchentlich nachts und auf Knopfdruck ([Q-041](../open-questions/q-041-api-aktualitaet.md)) | neue ERP-Daten seit letztem Abruf, Anomalien, Ampel |
| Prognose | wöchentlich nach dem Import und auf Knopfdruck | alle Artikel, alle Modelle |
| Vollaufbau | wöchentlich in Schatten-DB, bei jeder Schema-Änderung, nach jedem Nuke | alles |

Inkrementelle Läufe sind nur eine Abkürzung. Ihr Ergebnis muss dem Vollaufbau entsprechen.

## Offene Fragen

- [Q-023: Welche Altdaten gibt es?](../open-questions/q-023-altdaten-umfang.md)
- [Q-041: Wie aktuell sind API-Daten?](../open-questions/q-041-api-aktualitaet.md)
- [Q-090: Welche Ressourcen hat die VM?](../open-questions/q-090-vm-ressourcen.md)
- [Q-094: Wie werden Backups gemacht?](../open-questions/q-094-backups.md)

## Verwandte Seiten

- [Datenklassifikation und Herkunft](datenklassifikation-und-herkunft.md)
- [Daten-Anomalieerkennung](anomalieerkennung.md)
- [Datenmodell](../plan/datenmodell.md)
- [Zielarchitektur](../plan/zielarchitektur.md)
- [Arbeitsentscheidungen](../sources/arbeitsentscheidungen.md)
