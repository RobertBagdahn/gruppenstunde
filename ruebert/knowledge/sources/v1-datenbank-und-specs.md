---
type: source
title: "Quelle: v1-Datenbank und Specs"
description: "Code, DuckDB-Sicherung, Projektdokumente und 102 OpenSpec-Specs des Streamlit-Prototyps aus Mai 2026."
tags: [quelle, v1, specs, duckdb]
status: historical
retrieved: 2026-10-10
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Quelle: v1-Datenbank und Specs

## Kurzfassung

Dieses Repository enthält den Stand von Version 1: `Project.md`, `Architecture.md`, `legacy/src/`, `legacy/scripts/`,
`legacy/tests/` (seit 17.10.2026 unter `legacy/`), `openspec/specs/` (102 Specs), `openspec/changes/archive/` und die Datenbanksicherung
`data/seed_demand.duckdb.bak` (Daten bis 16.05.2026). Ausgewertet am 10.10.2026.

## Inhalt

- [Was daraus übernommen wurde](#was-daraus-übernommen-wurde)
- [Geltungsgrenze](#geltungsgrenze)

## Was daraus übernommen wurde

| Teil | Verwendet in |
|---|---|
| `Project.md` (Bestellregeln, MHD, Kanäle, Saison) | [Geschäftsmodell](../business/index.md) |
| `legacy/src/config.py` (Schwellen, Modelle, Parameter) | [Modellstrategie](../forecasting/modellstrategie.md), [Kennzahlen](../forecasting/kennzahlen-und-bewertung.md) |
| 102 Specs | [Übernahme-Matrix](../system-v1/uebernahme-matrix.md), Anforderungen mit Quelle „v1:…“ |
| DuckDB-Sicherung | [Datenscan](../data/anomalieerkennung.md) |

## Geltungsgrenze

- `Project.md` mischt Daniels Aussagen mit Roberts Annahmen (z. B. „Peak Herbst“, „ca. 1.300 Produkte“,
  Preissegmente). Solche Punkte gelten als unbestätigt.
- Einige Specs widersprechen sich, weil sie nacheinander entstanden sind (z. B. manuelle Überschreibung
  erst gefordert, dann entfernt). Maßgeblich ist der letzte Stand bzw. die Übernahme-Matrix.
- Die Sicherung zeigt den Stand nach v1-Transformationen, nicht die Rohdaten.

## Offene Fragen

- [Q-078: Willst du Prognosen korrigieren?](../open-questions/q-078-prognose-korrektur.md)

## Verwandte Seiten

- [Altsystem Version 1](../system-v1/index.md)
- [Übernahme-Matrix](../system-v1/uebernahme-matrix.md)
- [Widersprüche](widersprueche.md)
- [Quellen](index.md)
