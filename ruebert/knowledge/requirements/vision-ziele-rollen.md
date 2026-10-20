---
type: requirements
title: "Vision, Ziele und Rollen"
description: "Zielbild von Flower-Demand Version 2, messbare Ziele, Nutzerrollen und die wichtigsten Nutzungsszenarien."
tags: [anforderungen, vision, ziele, rollen]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel]
---

# Vision, Ziele und Rollen

## Kurzfassung

Daniels Ziel (Chat 09.10.2026): für Eigenmarke (langfristig) und Fremdmarke (kurzfristig) eine
solide Bedarfsprognose und Bestellplanung, aus der direkt Bestellungen im ERP entstehen – und ein
System, das er selbst agentisch warten und erweitern kann. Robert denkt dabei an die
Endausbaustufe, nicht an ein MVP, und baut sie schrittweise. Das Werkzeug ersetzt Daniels
Fachurteil nicht, sondern macht Risiken sichtbar und Entscheidungen nachvollziehbar.

## Inhalt

- [Vision](#vision)
- [Herkunft des Zielbilds](#herkunft-des-zielbilds)
- [Messbare Ziele](#messbare-ziele)
- [Rollen](#rollen)
- [Nutzungsszenarien](#nutzungsszenarien)
- [Nicht-Ziele](#nicht-ziele)

## Vision

> Daniel trifft jede Einkaufsentscheidung für Eigen- und Fremdmarke datenbasiert, versteht jede
> Zahl bis zur einzelnen Buchung, sieht Risiken in Wahrscheinlichkeiten statt Bauchgefühl, und das
> System erzeugt die freigegebene Bestellung direkt im ERP. Neue Ideen setzt er mit Codex selbst um.

## Herkunft des Zielbilds

| Zeitpunkt | Aussage | Quelle |
|---|---|---|
| vor 16.05. | Kombination aus Variante 3 (kurzfristig nachsteuern) und 4 (Jahresplanung); API-Zugriff und ERP-Integration denkbar; Artikel-Cockpit ohne Prognose existiert schon | Chat |
| 16.05. | Web-Tool mit Import, Prognose 12 Monate, Ampel-Startseite, Bestellplaner, Artikelanalyse | Chat (Robert) |
| 22.05. | „Auf die Live Ampel freue ich mich schon riesig“ | Chat |
| 29.05. | Daten bis zur ERP-Umstellung per CSV, dann API | Chat |
| 09.10. | Eigen- und Fremdmarke, Bestellungen im ERP, agentisch wartbar, saubere Datenbasis auch für Ads, intern betreiben | Chat |

Die Varianten 1–4 sind im Chat nur teilweise erhalten ([Q-091](../open-questions/q-091-varianten-3-und-4-vollstaendig.md)).

## Messbare Ziele

| ID | Ziel | Messgröße (Vorschlag) | Status |
|---|---|---|---|
| Z1 | Weniger Ausverkauf in der Hauptsaison | Artikel-Wochen mit Bestand ≤ 30 in KW 9–22 bei Drehklasse 6–10 | offen ([Q-001](../open-questions/q-001-erfolg-messen.md)) |
| Z2 | Weniger Überbestand und Entsorgung | Tüten mit Reichweite > 2,5 Jahre; entsorgte Tüten | offen |
| Z3 | Weniger Planungsaufwand | Stunden für die Jahresbestellung statt Excel | offen |
| Z4 | Vertrauen | Anteil Vorschläge, die Daniel ohne Änderung übernimmt; jede Abweichung erklärbar | abgeleitet |
| Z5 | Selbstständigkeit | Daniel setzt eine Änderung per OpenSpec und Codex allein um | bestätigt (Chat 09.10.) |
| Z6 | Saubere Datenbasis | jede Kennzahl bis zur Buchung rückverfolgbar; Rebuild jederzeit möglich | Robert |

## Rollen

| Rolle | Person | Rechte |
|---|---|---|
| Owner / Einkauf | Daniel | alles, Freigabe von Bestellungen, Entscheidungen in der Fall-Inbox |
| Planung | Elena | kein eigener Zugang; arbeitet über Daniel mit (entschieden, [Q-008](../open-questions/q-008-nutzerkreis.md)) |
| Entwicklung Prognose/Technik | Robert | Code, Modelle, Review |
| Coding-Agent | Codex (Daniel), Claude Code (Robert) | Code über OpenSpec und AGENTS.md |
| System | Nachtlauf | Import, Prüfungen, Prognose, Ampel |

## Nutzungsszenarien

| Nr. | Szenario | Häufigkeit | Anforderungen |
|---|---|---|---|
| S1 | Montags Ampel prüfen: Was ist rot, was hat sich geändert? | wöchentlich | MON-01 … MON-06 |
| S2 | Jahresbestellung Eigenmarke planen, Szenarien vergleichen, freigeben | 1–2 × pro Jahr | BEM-01 … BEM-21 |
| S3 | In der Saison nachsteuern, wenn Artikel besser laufen | wöchentlich März–Mai | MON-08, PRG-12 |
| S4 | Fremdmarken-Bestellvorschläge je Lieferant prüfen und ins ERP schicken | wöchentlich | BFM-01 … BFM-10 |
| S5 | Auffällige Daten in der Fall-Inbox entscheiden | nach Bedarf | DAT-07, DAT-24 |
| S6 | Eine Prognose verstehen oder anzweifeln | bei Bedarf | PRG-10, UI-02 |
| S7 | Neue Funktion mit Codex bauen | bei Bedarf | NFA-09 … NFA-12 |

## Nicht-Ziele

- Kein Ersatz für das ERP oder das bestehende Artikel-Cockpit ([Q-011](../open-questions/q-011-cockpit-bestehend.md)).
- Keine Preis- oder Werbeoptimierung in Version 2 (Datenbasis wird aber vorbereitet).
- Keine öffentliche oder mandantenfähige Software.

## Offene Fragen

- [Q-001: Woran messen wir Erfolg?](../open-questions/q-001-erfolg-messen.md)
- [Q-002: Welcher Bereich zuerst?](../open-questions/q-002-prioritaet-bereiche.md)
- [Q-008: Wer nutzt das Tool?](../open-questions/q-008-nutzerkreis.md)
- [Q-020: Wie sieht dein idealer Montag aus?](../open-questions/q-020-idealer-montag.md)
- [Q-091: Sind Variante 3 und 4 richtig verstanden?](../open-questions/q-091-varianten-3-und-4-vollstaendig.md)

## Verwandte Seiten

- [Anforderungen](index.md)
- [Roadmap](../plan/roadmap.md)
- [Zielkonflikt Ausverkauf vs. Überbestand](../business/zielkonflikt-ausverkauf-ueberbestand.md)
- [Quelle: Chat mit Daniel](../sources/chat-daniel.md)
- [Workshop 04.11.2026](../plan/workshop-2026-11-04.md)
