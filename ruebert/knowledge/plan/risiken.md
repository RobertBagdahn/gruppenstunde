---
type: plan
title: "Risiken"
description: "Die wichtigsten Risiken des Neubaus von Flower-Demand mit Wahrscheinlichkeit, Auswirkung und Gegenmaßnahmen."
tags: [plan, risiken]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Risiken

## Kurzfassung

Die größten Risiken liegen nicht in der Technik, sondern in Daten und Vertrauen. Altdaten können
anders gemeint sein als gedacht (die Sammelbuchungen sind ein Beispiel). Das Wachstum hat viele
Treiber, und die Prognose kann trotz aller Arbeit unsicher bleiben. Daniels Zeit ist knapp, und
agentische Weiterentwicklung kann ohne Leitplanken das System beschädigen. Jedes Risiko hat eine
konkrete Gegenmaßnahme im Plan.

## Inhalt

- [Risikoliste](#risikoliste)

## Risikoliste

| Nr. | Risiko | W | A | Gegenmaßnahme |
|---|---|---|---|---|
| R1 | Altdaten anders gemeint als angenommen (Sammelbuchungen, „Bestand danach“, FBA) | hoch | hoch | Klassifikation mit Fall-Inbox; Hypothesen als offene Fragen; nichts löschen, alles klassifizieren |
| R2 | Altdaten nach Migration nicht mehr vollständig exportierbar | mittel | hoch | Export-Liste im Workshop vereinbaren ([Q-023](../open-questions/q-023-altdaten-umfang.md)); Archiv mit Manifest |
| R3 | ERP-API kann nicht alles liefern oder nicht schreiben | mittel | mittel | Adapter-Schicht; CSV-Fallback; Schreiben als letzte Phase |
| R4 | Prognose bleibt in der Nebensaison ungenau | hoch | mittel | Quantile statt Scheingenauigkeit; Entscheidungen auf Saisonsummen; Nachsteuern |
| R5 | Daniel vertraut den Zahlen nicht | mittel | hoch | Erklärung je Zahl, Excel-Vergleich, Testfälle DGW042/DGW054, Fall-Inbox für sein Wissen |
| R6 | Termin der Großbestellung vor Fertigstellung | mittel | hoch | Phasen umsortieren; einfacher Modus wie v1 als Brücke |
| R7 | Agentische Änderungen beschädigen Fachlogik oder Datenmodell | mittel | hoch | OpenSpec-Pflicht, Prüfkette, Szenariotests, Rebuild-Test, Review durch Robert |
| R8 | Entscheidungs-Journal geht verloren | niedrig | hoch | Git-Remote, tägliches Backup, Restore-Test |
| R9 | VM zu klein für Prognoseläufe | mittel | mittel | Ressourcen klären ([Q-090](../open-questions/q-090-vm-ressourcen.md)); Läufe nachts; Modelle mit begrenztem Speicher |
| R10 | Zu viele Fälle in der Fall-Inbox überfordern Daniel | mittel | mittel | Bündelung, gute Vorschläge, Regeln aus Entscheidungen, Fälle nach Wirkung sortiert |
| R11 | Umfang wächst schneller als die Zeit | hoch | mittel | Endausbau im Blick, aber Phasen mit Abnahme; Nicht-Ziele festhalten |
| R12 | Unternehmensdaten gelangen nach außen | niedrig | hoch | keine öffentlichen Links, interner Betrieb, keine personenbezogenen Daten |

W = Wahrscheinlichkeit, A = Auswirkung.

## Offene Fragen

- [Q-003: Wann ist die nächste Großbestellung?](../open-questions/q-003-naechste-grossbestellung.md)
- [Q-023: Welche Altdaten gibt es?](../open-questions/q-023-altdaten-umfang.md)
- [Q-090: Welche Ressourcen hat die VM?](../open-questions/q-090-vm-ressourcen.md)

## Verwandte Seiten

- [Roadmap](roadmap.md)
- [Befund: Sammelbuchungen vor 2023](../data/befund-sammelbuchungen-vor-2023.md)
- [Erklärbarkeit](../forecasting/erklaerbarkeit.md)
- [Spec-Driven Development](spec-driven-development.md)
- [Plan für Version 2](index.md)
