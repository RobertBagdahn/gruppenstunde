---
type: decision
title: "Ansichten von Version 2 – Entscheidungen"
description: "Robert und Daniel: welche Ansichten das Tool braucht (Start, Liste, Artikel, Kanäle, Sets, Güte, Monitoring)."
tags: [plan, frontend, ansichten]
status: stable
visibility: public
retrieved: 2026-10-10
---

# Ansichten von Version 2 – Entscheidungen

## Kurzfassung

Entschiedene Struktur der Ansichten: Startseite mit Datenaktualität, filterbare Gesamtliste, Artikel-Drill-down mit Nachfrageherkunft und Kanälen, Set-/Bundle-Übersicht, getrennte Backtest- und Unsicherheitssicht, gestuftes Monitoring, Anomalien nur markieren.

## Inhalt

- [Bestätigte Struktur](#bestätigte-struktur)
- [Von Daniel entschieden](#von-daniel-entschieden)

**Quelle:** Roberts Antworten auf den Entwurf der Ansichten für das Rübert-Dashboard. Dies sind Roberts Produktentscheidungen; Punkte, die an Daniel delegiert wurden, bleiben offen.

## Bestätigte Struktur

1. **Startseite:** Datenaktualität und letzter Forecast sollen in der ersten Version sichtbar sein. Eine weitergehende Management-Zusammenfassung mit Risiken/Chancen kommt später.
2. **Bestell-/Artikelliste:** Alle Artikel bleiben auffindbar; die Liste ist sortier- und filterbar, insbesondere nach Eigen-/Fremdmarke. Dringende Fälle sollen priorisiert werden, ohne die vollständige Liste zu verstecken.
3. **Detailansicht pro Artikel:** Schwerpunkt auf der Herkunft des Bedarfs (Direktverkauf, Set-/Bundle-Beitrag und Kanalbeitrag).
4. **Kanäle:** Kanal-Drill-down innerhalb der Artikelansicht; keine separate Kanalübersicht als erste Priorität.
5. **Sets und Bundles:** Zusätzlich zur Komponenten-Zuordnung soll eine Übersicht zeigen, welche Sets/Bundles besonders viele Komponenten binden.
6. **Forecast-Güte:** Backtest-Güte vergangener Forecasts und Unsicherheit der aktuellen Zukunftsprognose getrennt, aber beide sichtbar.
7. **Anomalien:** Auffällige Daten markieren und Daniel entscheiden lassen, ob die Sales verwendet oder ausgeschlossen werden; keine automatische fachliche Bereinigung.
8. **Technisches Monitoring:** gestuft darstellen: verständliche Hinweise auf der Startseite, eigene Statusansicht für Daten-/Forecast-Läufe, detaillierte technische Logs getrennt. Fehler, die Daniels Entscheidungen beeinflussen, müssen aber sichtbar werden.
9. **Management-Zusammenfassung:** strategische Risiken/Chancen und Empfehlungen erst als spätere Ausbaustufe.

## Von Daniel entschieden

- **Fremdmarken-Bestellungen:** Lieferantenübersicht mit Drill-down bis zum Artikel. Liegt ein Lieferant unter 100 € netto EK, wird gewartet und gebündelt.
- **Mengenänderung:** nur neue Menge und Abweichung zum Vorschlag anzeigen – keine Szenario-Rechnung.

## Offene Fragen

Keine offenen Fragen.

## Verwandte Seiten

- [Plan](index.md)
- [Frontend](frontend.md)
- [Folgeantworten Daniel](../sources/daniel-followup.md)
