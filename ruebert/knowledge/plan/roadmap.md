---
type: plan
title: "Roadmap"
description: "Phasen des Neubaus von Flower-Demand mit Ergebnissen, Abnahmekriterien und Abhängigkeiten von offenen Fragen."
tags: [plan, roadmap, phasen, meilensteine]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Roadmap

## Kurzfassung

Der Neubau läuft in neun Phasen. Zuerst werden Wissen, Daten und Fundament sauber gelegt, dann
Prognose, Live-Ampel, Bestellplaner Eigenmarke, Fremdmarke, Bestellungen im ERP und die Übergabe an
Daniel. Jede Phase endet mit prüfbaren Abnahmekriterien. Die Reihenfolge ab Phase 4 hängt von
Daniels Prioritäten ([Q-002](../open-questions/q-002-prioritaet-bereiche.md)) und vom Termin der
nächsten Großbestellung ab ([Q-003](../open-questions/q-003-naechste-grossbestellung.md)). Dauern
sind Schätzungen in Arbeitswochen und keine Zusagen.

## Inhalt

- [Phasenübersicht](#phasenübersicht)
- [Phasen im Detail](#phasen-im-detail)
- [Kritischer Pfad](#kritischer-pfad)

## Phasenübersicht

| Phase | Ergebnis | Schätzung | Hängt an |
|---|---|---|---|
| 0 Wissen | LLM-Wiki, Anforderungen, Fragen, Datenscan | erledigt (10.10.2026) | – |
| 1 Workshop | Antworten auf Top-Fragen, Prioritäten, Datenlieferung vereinbart | 04.11.2026 | Daniel |
| 2 Fundament | Repo, CI, Docker, Auth, Pipeline-Runner, Journal, Wiki-Linter | 2 | Q-093, Q-090 |
| 3 Daten | Archiv-Import, ERP-Lesen, Klassifikation, Anomalien, Fall-Inbox, Rebuild | 3–4 | Q-021, Q-023, Q-085 |
| 4 Prognose v2 | Nachfrage mit Zensur, Modelle, Quantile, Backtests, Erklärung | 3–4 | Phase 3 |
| 5 Live-Ampel | Startseite, Reichweite, Risiko, Nachsteuern, Wochenüberblick | 2 | Phase 4 |
| 6 Bestellplaner Eigenmarke | Raster, Risiko je Menge, Budget, Szenarien, Export | 2–3 | Q-044, Q-050, Q-051 |
| 7 Fremdmarke | Bestellvorschläge je Lieferant | 2 | Q-059, Q-060 |
| 8 ERP-Schreiben | Bestellentwürfe im ERP nach Freigabe | 1–2 | Q-087, Q-088 |
| 9 Übergabe | Schulung Codex/OpenSpec, Betriebshandbuch, erste eigene Änderung von Daniel | 1 | Q-095 |

## Phasen im Detail

### Phase 2 – Fundament

- Monorepo mit `backend/`, `frontend/`, `knowledge/`, `openspec/`; Journal-Repository.
- Docker Compose (db, api, worker, web), Make-Ziele, CI mit Prüfkette.
- Frontend-Grundgerüst aus Food: Layout, Tokens, Styleguide, Login.
- Abnahme: `make dev` startet alles; `make nuke && make rebuild` läuft auf Testdaten grün.

### Phase 3 – Daten

- Altdaten-Archiv mit Manifest, Legacy-Adapter, ERP-Adapter (lesen), Shop-Abgleich.
- Klassifikation mit Startregeln aus [Buchungsarten](../data/warenbewegungen-buchungsarten.md).
- Prüfkatalog A-01 … A-18, Datenqualitätsbericht, Fall-Inbox.
- Abnahme: Daniel entscheidet die Sammelbuchungs-Fälle; bereinigte Jahressummen bestätigt;
  Schatten-Rebuild liefert identische Prüfsummen.

### Phase 4 – Prognose v2

- Nachfrage mit Zensur-Korrektur, Referenzmodelle, Statistik, LightGBM, Ensemble, Quantile.
- Backtests auf Stichtagen Mai 2024 und Mai 2025, entscheidungsorientiert.
- Erklärung je Artikel (Wasserfall).
- Abnahme: besser als Excel-Methode auf Entscheidungskennzahlen; DGW042/DGW054 erklärbar;
  Coverage des 80-%-Bands zwischen 70 und 90 %.

### Phase 5 – Live-Ampel

- Täglicher Lauf, Startseite, Artikelseite, Nachsteuer-Signale, Wochenüberblick.
- Abnahme: Daniel nutzt die Ampel zwei Wochen lang montags; Feedback eingearbeitet.

### Phase 6 – Bestellplaner Eigenmarke

- Zieltermin frei, Raster, Rundung (korrigiert), Risiko je Menge, Budget, Szenarien, Excel-Vergleich.
- Abnahme: Abnahmekriterien aus [Anforderungen Eigenmarke](../requirements/fa-bestellplanung-eigenmarke.md#abnahmekriterien).

### Phase 7 bis 9

- Fremdmarke: Bestellpunkt je Artikel, Vorschlagsliste je Lieferant.
- ERP-Schreiben: zuerst Testmandant, dann produktiv mit Schalter.
- Übergabe: Daniel setzt eine kleine Änderung selbst mit Codex um (Ziel Z5).

## Kritischer Pfad

```text
Workshop ─▶ Datenlieferung (Altdaten + ERP-Zugang) ─▶ Klassifikation ─▶ Prognose v2 ─▶ Bestellplaner
```

Wenn die nächste Großbestellung früh im Jahr 2027 liegt, wird Phase 6 vor Phase 5 gezogen; die Ampel
kann dann zunächst in einfacher Form laufen.

## Offene Fragen

- [Q-002: Welcher Bereich zuerst?](../open-questions/q-002-prioritaet-bereiche.md)
- [Q-003: Wann ist die nächste Großbestellung?](../open-questions/q-003-naechste-grossbestellung.md)
- [Q-023: Welche Altdaten gibt es?](../open-questions/q-023-altdaten-umfang.md)
- [Q-085: Gibt es API-Doku und Testzugang?](../open-questions/q-085-erp-api-doku.md)
- [Q-095: Wie viel Erfahrung mit Codex, Git, Docker?](../open-questions/q-095-codex-erfahrung.md)

## Verwandte Seiten

- [Workshop 04.11.2026](workshop-2026-11-04.md)
- [Risiken](risiken.md)
- [Anforderungen](../requirements/index.md)
- [Vision, Ziele und Rollen](../requirements/vision-ziele-rollen.md)
- [Plan für Version 2](index.md)
