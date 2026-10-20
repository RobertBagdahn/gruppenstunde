---
type: concept
title: "Widersprüche"
description: "Stellen, an denen Quellen sich widersprechen – nicht geglättet, sondern mit beiden Ständen und der zugehörigen offenen Frage."
tags: [quellen, widersprueche, qualitaet]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Widersprüche

## Kurzfassung

Widersprüche zwischen Quellen werden nie stillschweigend vereinheitlicht. Hier steht jeder bekannte
Widerspruch mit beiden Ständen, ihren Quellen und der offenen Frage, die ihn auflöst. Bis zur Klärung
gilt die in der Frage genannte Annahme.

## Inhalt

- [Liste](#liste)

## Liste

| Nr. | Thema | Stand A | Stand B | Klärung |
|---|---|---|---|---|
| W1 | Bestellstruktur Eigenmarke | 60.000 Tüten optimal auf Sorten verteilen (v1 `Project.md`, Chat 16.05.) | keine Allokation, jede Sorte nach Bedarf, Budget nur Warnung (v1-Spec `weekly-order-planning`) | entschieden: exakt 60k-Vielfaches, Allokation ([Q-044](../open-questions/q-044-60k-stufe.md)) |
| W2 | Manuelle Prognosekorrektur | gewünscht (v1 `Project.md`, `Architecture.md`) | entfernt (v1-Spec `demand-forecast`) | entschieden: Korrektur mit Grund und Ablauf ([Q-078](../open-questions/q-078-prognose-korrektur.md)) |
| W3 | Bestand | „nur aktueller Bestand, keine Historie“ (v1 `Project.md`) | Historie über „Bestand danach“ in jeder Buchung vorhanden, aber kein Saldo (Datenscan) | [Q-101](../open-questions/q-101-bestand-danach-semantik.md) |
| W4 | Datenimport | CSV-Upload je Kanal mit Spalten-Mapping (Chat 16.05., v1-Spec `multi-channel-import`) | kein UI-Import, nur Skript (v1-Spec `script-only-data-pipeline`); Daniel liefert einheitlich aus dem ERP (Chat 16.05.) | entschieden: ERP-API, CSV nur Fallback (DAT-02, DAT-03) |
| W5 | Wachstum 2026 | „quasi das doppelte“ (Robert, 17.05.) | „wird auch nicht doppelt so viel“ (Daniel, 17.05.) | entschieden: Daniel (Hauptsaison vorbei) |
| W6 | Reserve-Aufschlag | Standard 10 % (v1) | Daniel rechnet mit 0 % (Chat 20.05.) | [Q-051](../open-questions/q-051-reserve-servicegrad.md) |
| W7 | Training ab 2023 | 2018–2022 ausgeschlossen (v1 `config.py`) | 2021/22 nach Bereinigung nutzbar (Befund) | Backtest in Phase 4 |

## Offene Fragen

- [Q-044: Was bedeutet die 60k-Stufe genau?](../open-questions/q-044-60k-stufe.md)
- [Q-051: Reserve-Prozent oder Servicegrad?](../open-questions/q-051-reserve-servicegrad.md)
- [Q-078: Willst du Prognosen korrigieren?](../open-questions/q-078-prognose-korrektur.md)
- [Q-101: Was bedeutet „Bestand danach“?](../open-questions/q-101-bestand-danach-semantik.md)

## Verwandte Seiten

- [Quellen](index.md)
- [Quelle: v1-Datenbank und Specs](v1-datenbank-und-specs.md)
- [Offene Fragen](../open-questions/index.md)
- [Einkauf Eigenmarke](../business/einkauf-eigenmarke.md)
