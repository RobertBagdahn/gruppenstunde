---
type: observation
title: "Learnings aus Version 1"
description: "Was der Prototyp fachlich, methodisch und technisch gelehrt hat und welche Folgen das für Version 2 hat."
tags: [v1, learnings, retrospektive]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, v1-datenbank-und-specs, export-warenbewegungen]
---

# Learnings aus Version 1

## Kurzfassung

Version 1 hat in fünf Tagen gezeigt, dass ein Tool Daniels Excel-Planung erreichen und übertreffen kann.
Sie hat aber auch gezeigt, wo es hakt: Die Daten waren nicht verstanden (Sammelbuchungen, Bestandsspalte),
Rundung und Rasterregeln waren fehlerhaft, Erklärungen fehlten bei überraschenden Zahlen, und der
Zustand lag in einer eingebackenen Datenbank. Version 2 setzt genau dort an.

## Inhalt

- [Was gut funktioniert hat](#was-gut-funktioniert-hat)
- [Was nicht funktioniert hat](#was-nicht-funktioniert-hat)
- [Folgen für Version 2](#folgen-für-version-2)

## Was gut funktioniert hat

- Schnelles Feedback mit echten Daten: „Das Tool gibt ja schon viel mehr her, wie ich erwartet habe“ (Daniel, 19.05.2026).
- Bestellplaner und Excel-Planung deckten sich bei den allermeisten Artikeln (20.05.2026).
- Median-Ensemble war stabil; LightGBM verbesserte die CV-Güte.
- Kumulative Reichweite und Ampel waren für Daniel verständlich und weckten den Wunsch nach der Live-Ampel.
- OpenSpec hat jede Änderung dokumentiert; das ist jetzt die Grundlage der Übernahme-Matrix.

## Was nicht funktioniert hat

| Problem | Ursache | Quelle |
|---|---|---|
| Unzulässige Bestellmenge 6.000 bei DGW097 | Rasterregel nicht als Invariante getestet | Chat 19.05.2026 |
| Zu häufiges Aufrunden | Schwelle bezog sich auf Gesamtmenge | Chat 22.05.2026 |
| DGW042: 7.000 statt 2.000 ohne erkennbaren Grund | keine Erklärung je Artikel; vermutlich Datenartefakte | Chat 20.05.2026 |
| Wachstum überschätzt | Sammelbuchungen 2021/22 als Verkauf gezählt; Jahre pauschal ausgeschlossen | [Befund](../data/befund-sammelbuchungen-vor-2023.md) |
| Bestand und Ausverkauf unsicher | „Bestand danach“ ist kein Saldo | [Befund](../data/befund-bestand-danach.md) |
| Nebensaison mit größten Fehlern | wenig Signal, keine Treiber | Chat 19.05.2026 |
| `is_set` überall falsch | Synchronisationsschritt fehlerhaft | [Anomalieerkennung](../data/anomalieerkennung.md) |
| Zustand nicht reproduzierbar | DuckDB ins Image eingebacken, Entscheidungen nur in der DB | v1-Spec `cloud-deploy` |
| Viele kleine Specs zu Darstellungsdetails | schnelles Iterieren ohne Design-System | `openspec/specs/` |

## Folgen für Version 2

1. Datenverständnis zuerst: Klassifikation, Anomalieerkennung, Fall-Inbox vor neuen Modellen.
2. Fachregeln als Invarianten mit Tests (Raster, Rundung, Reichweite).
3. Erklärung als Pflichtbestandteil jedes Prognoselaufs.
4. Nukebare Pipeline und Entscheidungs-Journal statt eingebackener Datenbank.
5. Design-System aus dem Food-Frontend, damit Darstellungsfragen nicht jedes Mal neu entschieden werden.

## Offene Fragen

- [Q-057: Was war bei DGW042 los?](../open-questions/q-057-fall-dgw042.md)
- [Q-024: Was sind große Versandbuchungen 2020–2022?](../open-questions/q-024-sammelbuchungen-versand.md)

## Verwandte Seiten

- [Altsystem Version 1](index.md)
- [Übernahme-Matrix](uebernahme-matrix.md)
- [Modellstrategie](../forecasting/modellstrategie.md)
- [Einkauf Eigenmarke](../business/einkauf-eigenmarke.md)
- [Risiken](../plan/risiken.md)
