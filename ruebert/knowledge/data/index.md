---
type: index
title: "Daten"
description: "Woher die Daten kommen, wie jede Zeile identifiziert und eingeordnet wird, wie die Pipeline jederzeit neu aufgebaut wird und welche Auffälligkeiten gefunden wurden."
tags: [daten, index, pipeline]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Daten

## Kurzfassung

Flower-Demand besitzt keine eigenen Originaldaten. Die Originale liegen immer im Stammsystem: im
neuen ERP für alles ab der Migration, im eingefrorenen Export des alten ERP für die Historie.
Die Datenbank von Flower-Demand ist vollständig abgeleitet und darf jederzeit gelöscht und aus den
Quellen neu aufgebaut werden („nukebar“). Jede Zeile wird mit Herkunft gespeichert und einer
Nachfrageklasse zugeordnet. Eine Anomalieerkennung findet auffällige Daten und legt unklare Fälle
Daniel zur Entscheidung vor. Der erste Datenscan hat zwei große Befunde ergeben.

## Inhalt

- [Seiten in diesem Bereich](#seiten-in-diesem-bereich)
- [Grundsätze](#grundsätze)

## Seiten in diesem Bereich

### Quellen und Inhalte

| Seite | Wofür sie gut ist |
|---|---|
| [Datenquellen und ERP](datenquellen-und-erp.md) | Altes und neues ERP, Exporte, API, MCP, Lieferwege |
| [Warenbewegungen und Buchungsarten](warenbewegungen-buchungsarten.md) | Alle 15 Buchungsarten mit Mengen und Bedeutung |
| [Stammdaten, Sets und Bundles](stammdaten-sets-bundles.md) | Artikelfelder, Set-Zuordnung, Bundles, Anreicherung |

### Verarbeitung

| Seite | Wofür sie gut ist |
|---|---|
| [Datenpipeline und Neuaufbau](datenpipeline-und-neuaufbau.md) | Stammsystem-Prinzip, Schichten, nukebar, Entscheidungs-Journal |
| [Datenklassifikation und Herkunft](datenklassifikation-und-herkunft.md) | Herkunft je Zeile, Nachfrageklassen, Regeln, Fall-Inbox |
| [Daten-Anomalieerkennung](anomalieerkennung.md) | Katalog der Prüfungen und Funde im Datenscan |

### Befunde

| Seite | Wofür sie gut ist |
|---|---|
| [Befund: Sammelbuchungen vor 2023](befund-sammelbuchungen-vor-2023.md) | 2021/22 ist rund die Hälfte des v1-Absatzes technische Umbuchung |
| [Befund: Bestand danach ist kein Saldo](befund-bestand-danach.md) | Die Bestandsspalte ist vermutlich verfügbarer Bestand |
| [Befund: Kalenderwochen 2026](befund-kalenderwochen-2026.md) | v1 beschriftet alle Wochen ab 2026 eine Woche zu spät |

## Grundsätze

1. **Stammsystem ist führend.** Flower-Demand verändert nie Originaldaten und hält keine Kopie als Wahrheit.
2. **Nukebar.** `make nuke && make rebuild` muss jederzeit dasselbe Ergebnis liefern.
3. **Jede Zeile ist identifizierbar** – Quelle, Import, Originalschlüssel, Prüfsumme.
4. **Nichts wird gelöscht, alles wird klassifiziert.** Ausschlüsse sind Klassen, keine Filter.
5. **Daniel entscheidet unklare Fälle**; seine Entscheidungen liegen versioniert außerhalb der Datenbank.

## Offene Fragen

- [Q-023: Welche Altdaten gibt es?](../open-questions/q-023-altdaten-umfang.md)
- [Q-024: Was sind große Versandbuchungen 2020–2022?](../open-questions/q-024-sammelbuchungen-versand.md)
- [Q-101: Was bedeutet „Bestand danach“?](../open-questions/q-101-bestand-danach-semantik.md)

## Verwandte Seiten

- [Geschäftsmodell](../business/index.md)
- [Anforderungen Daten](../requirements/fa-daten.md)
- [Datenmodell](../plan/datenmodell.md)
- [Nachfrage statt Absatz](../forecasting/nachfrage-vs-absatz.md)
- [Quelle: Export Warenbewegungen](../sources/export-warenbewegungen.md)
