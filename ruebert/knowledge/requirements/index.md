---
type: index
title: "Anforderungen"
description: "Alle fachlichen und nichtfunktionalen Anforderungen an Flower-Demand Version 2 mit ID, Priorität, Quelle und Status."
tags: [anforderungen, index, requirements]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Anforderungen

## Kurzfassung

Hier stehen alle Anforderungen an Flower-Demand Version 2, zusammengeführt aus dem Chat mit Daniel
(Mai–Oktober 2026), den 102 Specs von Version 1, dem Datenscan vom 10.10.2026 und Roberts
Architekturvorgaben. Jede Anforderung hat eine ID, eine Priorität (Muss/Soll/Kann), eine Quelle
und einen Status: **bestätigt** (Daniel hat es so gesagt), **abgeleitet** (Robert hat es aus
Kontext oder v1 abgeleitet) oder **offen** (hängt an einer Frage). OpenSpec-Änderungen verweisen
auf diese IDs.

## Inhalt

- [Bereiche](#bereiche)
- [Zählung](#zählung)
- [Konventionen](#konventionen)

## Bereiche

| Seite | Präfix | Inhalt |
|---|---|---|
| [Vision, Ziele und Rollen](vision-ziele-rollen.md) | `Z` | Zielbild, messbare Ziele, Nutzer, Nutzungsszenarien |
| [Daten](fa-daten.md) | `DAT` | Import, Herkunft, Klassifikation, Fall-Inbox, Rebuild, Anomalien |
| [Prognose](fa-prognose.md) | `PRG` | Nachfrage, Quantile, Modelle, Backtests, Korrekturen |
| [Monitoring und Ampel](fa-monitoring-ampel.md) | `MON` | Live-Ampel, Reichweite, Nachsteuern, Hinweise |
| [Bestellplanung Eigenmarke](fa-bestellplanung-eigenmarke.md) | `BEM` | Jahresplanung, Raster, Rundung, Szenarien, Freigabe |
| [Bestellplanung Fremdmarke](fa-bestellplanung-fremdmarke.md) | `BFM` | Bestellvorschläge je Lieferant |
| [ERP-Integration](fa-erp-integration.md) | `ERP` | Lesen, Bestellungen anlegen, Adapter, MCP |
| [Oberfläche und Analyse](fa-oberflaeche-und-analyse.md) | `UI` | Seiten, Artikelanalyse, Formate, Design |
| [Nichtfunktionale Anforderungen](nfa.md) | `NFA` | Betrieb, Sicherheit, Wartbarkeit durch Agents, Qualität |

## Zählung

| Bereich | Muss | Soll | Kann |
|---|---:|---:|---:|
| DAT | 26 | 4 | 1 |
| PRG | 17 | 4 | 1 |
| MON | 10 | 4 | 1 |
| BEM | 16 | 5 | 1 |
| BFM | 6 | 3 | 1 |
| ERP | 7 | 1 | 2 |
| UI | 12 | 4 | 2 |
| NFA | 18 | 4 | 0 |
| **Summe** | **112** | **29** | **9** |

Insgesamt 150 Anforderungen. Die Lücken in der Nummerierung sind Absicht: IDs werden nie neu vergeben.

## Konventionen

- IDs sind stabil und werden nie neu vergeben. Gestrichene Anforderungen bleiben mit Status
  „verworfen“ stehen.
- Quelle „Chat TT.MM.“ verweist auf [Chat mit Daniel](../sources/chat-daniel.md), „v1:`name`“ auf
  eine Spec in `openspec/specs/`, „Scan“ auf den [Datenscan](../data/anomalieerkennung.md),
  „Robert“ auf eine Vorgabe von Robert ([Arbeitsentscheidungen](../sources/arbeitsentscheidungen.md)).
- Welche v1-Specs übernommen, geändert oder verworfen werden, steht in der
  [Übernahme-Matrix](../system-v1/uebernahme-matrix.md).

## Offene Fragen

- [Q-002: Welcher Bereich zuerst?](../open-questions/q-002-prioritaet-bereiche.md)
- [Q-091: Sind Variante 3 und 4 richtig verstanden?](../open-questions/q-091-varianten-3-und-4-vollstaendig.md)

## Verwandte Seiten

- [Plan für Version 2](../plan/index.md)
- [Offene Fragen](../open-questions/index.md)
- [Übernahme-Matrix](../system-v1/uebernahme-matrix.md)
- [Spec-Driven Development](../plan/spec-driven-development.md)
- [Wiki-Startseite](../index.md)
