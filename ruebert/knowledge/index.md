---
type: index
title: "Flower-Demand – LLM-Wiki"
description: "Einstieg in das fachliche und technische Wissen zu Bedarfsprognose und Bestellplanung für DeineGartenwelt."
tags: [index, einstieg, flower-demand]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Flower-Demand – LLM-Wiki

## Kurzfassung

Flower-Demand ist ein internes Werkzeug für **DeineGartenwelt** (Online-Saatguthandel,
80–90 % des Absatzes über Amazon). Es berechnet aus Verkaufs- und Bestandsdaten
Bedarfsprognosen, zeigt Engpässe live in einer Ampel an und schlägt Bestellungen für
Eigenmarke (langfristig, Großbestellung) und Fremdmarken (kurzfristig) vor – bis hin zur
Bestellung direkt im ERP. Version 1 war ein Streamlit-Prototyp (Mai 2026). Version 2 wird mit
FastAPI, PostgreSQL und einem TypeScript-Frontend nach dem Vorbild des Food-Frontends neu gebaut
und soll von Daniel agentisch (Codex) gewartet und erweitert werden können.

## Inhalt

- [Lesepfad für LLMs](#lesepfad-für-llms)
- [Bereiche](#bereiche)
- [Personen und Rollen](#personen-und-rollen)
- [Regeln für die Nutzung als Kontext](#regeln-für-die-nutzung-als-kontext)

## Lesepfad für LLMs

1. [Glossar](glossary.md) – Begriffe wie Puffer, Reichweite, 60k-Stufe, Bundle.
2. [Geschäftsmodell](business/index.md) – wie DeineGartenwelt verkauft und einkauft.
3. [Daten](data/index.md) – woher die Daten kommen und wie jede Zeile eingeordnet wird.
4. [Prognose](forecasting/index.md) – Nachfrage statt Absatz, Modelle, Quantile, Erklärbarkeit.
5. [Anforderungen](requirements/index.md) – alle fachlichen und nichtfunktionalen Anforderungen.
6. [Plan für Version 2](plan/index.md) – Architektur, Datenmodell, Roadmap, Spec-Driven Development.
7. [Offene Fragen](open-questions/index.md) – **vor** jeder Annahme prüfen.

## Bereiche

| Ordner | Inhalt | Verantwortlich |
|---|---|---|
| [business/](business/index.md) | Geschäftsmodell, Sortiment, Kanäle, Einkauf, Lager | Daniel (fachlich) |
| [data/](data/index.md) | Datenquellen, Buchungsarten, Klassifikation, Befunde | Robert |
| [forecasting/](forecasting/index.md) | Prognosemethodik, Kennzahlen, Erklärbarkeit | Robert |
| [requirements/](requirements/index.md) | Anforderungen mit IDs, Priorität, Quelle | Robert + Daniel |
| [system-v1/](system-v1/index.md) | Was der Prototyp konnte und was übernommen wird | Robert |
| [plan/](plan/index.md) | Zielarchitektur, Datenmodell, Roadmap, Workshop | Robert |
| [open-questions/](open-questions/index.md) | 100 Fragen an Daniel mit Annahmen | Daniel beantwortet |
| [input/](input/index.md) | Wortgetreue Rohquellen (Chat, Gespräche) | – |

Konventionen für dieses Wiki: [Wiki-Konventionen](wiki-konventionen.md).

## Personen und Rollen

- **Daniel** – Geschäftsführung und Einkauf bei DeineGartenwelt. Fachlicher Owner, erkennt
  Datenfälle schnell, betreibt das System später intern und entwickelt es mit Codex weiter.
- **Elena** – arbeitet bei DeineGartenwelt an der Bedarfsplanung mit (Excel-Abgleich Mai 2026).
- **Robert** – Data Scientist. Verantwortlich für Prognose und Technik, baut Version 2 auf.

## Regeln für die Nutzung als Kontext

- Seiten mit `status: stable` sind bestätigt. `draft` ist Arbeitsstand und nicht verbindlich.
- Aussagen mit Quelle „Chat“ stammen von Daniel und sind fachlich belastbar.
  Aussagen mit „Hypothese“ sind Ableitungen aus Daten und müssen bestätigt werden.
- Was nicht belegt ist, steht in [Offene Fragen](open-questions/index.md). Nicht mit
  allgemeinem Modellwissen über Saatgut, Amazon oder ERP-Systeme auffüllen.
- Neue Erkenntnisse aus Gesprächen zuerst wortgetreu nach [input/](input/index.md), dann in
  die Fachseiten destillieren.

## Offene Fragen

Siehe [Offene Fragen](open-questions/index.md) – 100 Fragen in fünf Themenblöcken, die wichtigsten
15 für den Workshop am 04.11.2026 in [Workshop 04.11.2026](plan/workshop-2026-11-04.md).

## Verwandte Seiten

- [Glossar](glossary.md)
- [Anforderungen](requirements/index.md)
- [Plan für Version 2](plan/index.md)
- [Stakeholder-Chat mit Daniel](input/2026-chat-daniel.md)
- [Altsystem Version 1](system-v1/index.md)
