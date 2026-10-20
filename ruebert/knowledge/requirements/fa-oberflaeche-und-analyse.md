---
type: requirements
title: "Anforderungen Oberfläche und Analyse"
description: "Fachliche Anforderungen an Seiten, Artikelanalyse, Prognosegüte, Darstellung und Bedienung der Weboberfläche."
tags: [anforderungen, oberflaeche, ui, analyse]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [v1-datenbank-und-specs, food-frontend]
---

# Anforderungen Oberfläche und Analyse

## Kurzfassung

Die Oberfläche ist eine selbst gebaute TypeScript-Webanwendung nach dem Vorbild des Food-Frontends:
ruhiges Design, klare Seitenköpfe, Karten statt Rahmen, deutsche Texte mit echten Umlauten. Sie
bündelt Ampel, Bestellplanung, Fremdmarken-Vorschläge, Artikelanalyse, Prognosegüte und
Datenqualität mit Fall-Inbox. Die guten Analyseansichten aus v1 werden übernommen und um
Erklärung und Rückverfolgbarkeit ergänzt.

## Inhalt

- [Seiten](#seiten)
- [Artikelanalyse](#artikelanalyse)
- [Darstellung und Bedienung](#darstellung-und-bedienung)

## Seiten

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| UI-01 | Seiten: Start/Ampel, Bestellplaner Eigenmarke, Bestellvorschläge Fremdmarke, Artikel, Prognosegüte, Daten (Importe, Qualität, Fall-Inbox, Ereignisse), Übersicht, Erklärungen, Einstellungen | Muss | v1:`navigation-sidebar`, Robert | erweitert |
| UI-10 | Übersicht: Jahresschätzung (bisher + Prognose), Vorjahresvergleich je KW, Top/Flop, Kategorie-Saisonalität, Prognose-Ausblick | Soll | v1:`yearly-forecast-overview`, v1:`dashboard-overview`, v1:`category-analytics` | übernommen |
| UI-03 | Prognosegüte: Kennzahlen je Modell, Kategorie, Saisonphase, Lauf; schlechteste Artikel mit Problemkategorie; Fehlerverteilung | Muss | v1:`error-analysis`, v1:`category-dashboard` | übernommen |
| UI-08 | Erklärseite für alle Kennzahlen und Algorithmen mit Zahlenbeispiel | Muss | v1:`kpi-explanation-page` | übernommen |
| UI-11 | Fall-Inbox als eigene Arbeitsansicht mit Tastaturbedienung | Muss | Robert | abgeleitet |
| UI-18 | OOS-Monitor als eigene Ansicht (siehe MON-15) | Muss | [Q-037](../open-questions/q-037-ausverkauf-historie.md) | bestätigt |
| UI-15 | Bestellsimulator: Bestellung zu einem vergangenen Stichtag gegen echte Verkäufe prüfen | Soll | v1:`sim-weekly-simulation`, v1:`sim-report` | übernommen |

## Artikelanalyse

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| UI-02 | Artikelseite: Historie (Absatz, Nachfrage, zensierte Wochen), Prognose mit Bändern, Wasserfall-Erklärung, Modellvergleich, Bestand und Reichweite, Set-/Bundle-Anteile, Ereignisse, Fälle, Korrekturen | Muss | v1:`artikel-analyse-dashboard`, v1:`set-contribution-chart` | erweitert |
| UI-04 | Diagramme mit KW-Achse, Jahreswechsel, Ostern und Frühlingsanfang als Markierungen; Saisonüberlagerung KW 1–52 je Jahr | Muss | v1:`chart-event-markers`, v1:`weekly-charts` | übernommen |
| UI-05 | Gekappte Prognosewerte sichtbar markiert | Muss | v1:`cap-visualization` | übernommen |

## Darstellung und Bedienung

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| UI-06 | Artikel immer als „Name (SKU)“ und verlinkt zur Artikelseite; Deep-Links per URL | Muss | v1:`table-link-navigation`, v1:`product-deep-link` | übernommen |
| UI-07 | Deutsche Zahlenformate, Mengen und Prozente ganzzahlig, Tausenderpunkt | Muss | v1:`german-number-format`, v1:`integer-display` | übernommen |
| UI-09 | Design-System und Komponenten nach Food-Frontend (Tokens, fünf Schriftgrößen, drei Radien, Lucide-Icons, Skeletons, `ErrorDisplay`, `ConfirmDialog`, `notify`); Erscheinungsbild Layout D „Triage Nacht“ mit Sidebar für Navigation, Filter und Einstellungen ([ADR-09](../sources/arbeitsentscheidungen.md#adr-09-layout-d-triage-nacht)) | Muss | Robert | bestätigt |
| UI-12 | Filter, Suche, Sortierung und Tabs im URL-Zustand | Muss | Food-Frontend | übernommen |
| UI-13 | Tabellen exportierbar (CSV/Excel) | Soll | v1:`order-optimization` | abgeleitet |
| UI-14 | Desktop-optimiert für Daniels Arbeitsplatz, ab 320 px nutzbar (Ampel mobil lesbar) | Soll | Food-Frontend | abgeleitet |
| UI-16 | Lese-Modus ohne Schreibrechte (Demo, Gäste) | Kann | v1:`read-only-mode` | übernommen |
| UI-17 | LLM-Funktionen im Tool (Fragen in natürlicher Sprache, Erklärtexte, Unterstützung der Fall-Inbox) in einer späteren Phase; nur mit freigegebenem Anbieter | Kann | [Q-097](../open-questions/q-097-llm-im-tool.md) | bestätigt (später) |

Umsetzung: [Frontend](../plan/frontend.md).

## Offene Fragen

- [Q-011: Was kann das bestehende Cockpit?](../open-questions/q-011-cockpit-bestehend.md)
- [Q-020: Wie sieht dein idealer Montag aus?](../open-questions/q-020-idealer-montag.md)
- [Q-077: Wie soll Unsicherheit aussehen?](../open-questions/q-077-unsicherheit-darstellung.md)
- [Q-099: Reicht eine deutsche Oberfläche?](../open-questions/q-099-sprache-ui.md)

## Verwandte Seiten

- [Frontend](../plan/frontend.md)
- [Erklärbarkeit](../forecasting/erklaerbarkeit.md)
- [Übernahme-Matrix](../system-v1/uebernahme-matrix.md)
- [Quelle: Food-Frontend](../sources/food-frontend.md)
- [Anforderungen](index.md)
