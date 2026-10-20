---
type: guide
title: "Wiki-Konventionen"
description: "Regeln für Aufbau, Pflege und Nutzung dieses LLM-Wikis nach dem Open Knowledge Format (OKF v0.1)."
tags: [wiki, konventionen, okf]
status: stable
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Wiki-Konventionen

## Kurzfassung

Das Wiki folgt dem Open Knowledge Format (OKF v0.1) wie im Projekt `knowledge-scout`: Markdown mit
YAML-Frontmatter, vier Pflichtabschnitte, maximal 300 Zeilen pro Datei, relative Links. Es ist die
fachliche Quelle für Menschen und Coding-Agents. Code-Details gehören in OpenSpec und den Code,
nicht hierher. Wer das Wiki ändert, ändert zuerst die Quelle (input) und dann die Fachseite.

## Inhalt

- [Frontmatter](#frontmatter)
- [Seitenrahmen](#seitenrahmen)
- [Ordner und Dateinamen](#ordner-und-dateinamen)
- [Werkzeuge und Skills](#werkzeuge-und-skills)
- [Pflege-Ablauf](#pflege-ablauf)
- [Abgrenzung zu OpenSpec](#abgrenzung-zu-openspec)

## Frontmatter

Pflichtfelder: `type`, `title`, `description`. Optional: `tags`, `status`, `visibility`,
`source`, `generated`.

| `status` | Bedeutung |
|---|---|
| `stable` | Von Daniel bestätigt oder aus Daten belegt. Darf als Fakt verwendet werden. |
| `draft` | Arbeitsstand, Ableitungen, Vorschläge. Nicht verbindlich. |
| `historical` | Rohquelle oder überholter Stand. |

Gängige `type`-Werte: `index`, `glossary`, `concept`, `method`, `requirements`, `plan`, `decision`,
`observation`, `hypothesis`, `question`, `source`, `guide`.

## Seitenrahmen

Jede Seite außerhalb von `input/` hat diese Abschnitte in dieser Reihenfolge:

1. `## Kurzfassung` – drei bis sechs Sätze.
2. `## Inhalt` – Links auf die eigenen Abschnitte.
3. Fachinhalt.
4. `## Offene Fragen` – Links in `open-questions/` oder „Keine offenen Fragen.“
5. `## Verwandte Seiten` – vier bis sechs Links.

Längenlimit: bis 300 Zeilen. Darüber wird aus `thema.md` ein Ordner `thema/` mit `index.md`.

## Ordner und Dateinamen

- Ordnernamen englisch (`business/`, `data/`, `forecasting/`), Seitentitel deutsch.
- Dateinamen in Kleinbuchstaben mit Bindestrich, Umlaute als `ae/oe/ue` nur im Dateinamen.
  Im Text immer echte Umlaute.
- Rohquellen in `input/` mit Datum im Namen. Sie werden nie umgeschrieben, nur ergänzt.
- Offene Fragen: **eine Datei je Frage** unter `open-questions/q-NNN-slug.md` mit `type: question`,
  Annahme bis zur Antwort und Entscheider. Neue Fragen bekommen die nächste freie ID (derzeit ab `Q-105`).
- Quellenseiten unter `sources/` tragen `retrieved: JJJJ-MM-TT`, „Was daraus übernommen wurde“ und
  „Geltungsgrenze“. Ohne Datum ist eine Quelle nicht wiederverwendbar.
- Datenbefunde und Ableitungen tragen `type: observation` bzw. `type: hypothesis` und sind nicht normativ.
- Entscheidungen stehen in [Arbeitsentscheidungen](sources/arbeitsentscheidungen.md), Widersprüche in
  [Widersprüche](sources/widersprueche.md) – nie stillschweigend vereinheitlichen.

## Werkzeuge und Skills

```bash
make wiki-lint     # Frontmatter, Rahmen, Links, Länge, Waisen – muss null Fehler melden
```

Für die Pflege gibt es sieben Skills aus Knowledge-Scout unter `.opencode/skills/wiki/` (gespiegelt
nach `.claude/skills/`): `wiki-page`, `wiki-split`, `wiki-index`, `wiki-link`, `wiki-research`,
`wiki-questions`, `wiki-audit`. Gemeinsame Regeln: `.opencode/skills/wiki/REGELN.md`.

## Pflege-Ablauf

1. Gespräch oder Chat wortgetreu in `input/` ablegen (Links, Passwörter, Zugangsdaten schwärzen).
2. Neue Fakten in die passende Fachseite übernehmen, mit Quelle („Chat 17.05.2026“).
3. Beantwortete Fragen: in der Fragedatei Antwort und Datum ergänzen, Fachseite aktualisieren,
   betroffene Anforderungen von „offen“ auf „bestätigt“ setzen.
4. Anforderungen ändern sich nur über [Anforderungen](requirements/index.md), nie stillschweigend im Code.
5. Für die Umsetzung eine OpenSpec-Änderung anlegen, die auf die Anforderungs-ID verweist.

## Abgrenzung zu OpenSpec

| Wiki (`knowledge/`) | OpenSpec (`openspec/`) |
|---|---|
| Warum und Was aus Geschäftssicht | Was genau das System tun MUSS (Szenarien) |
| Stabil über Monate | Pro Änderung, wird archiviert |
| Deutsch, für Daniel lesbar | Deutsch/Englisch, für Agents ausführbar |
| Anforderungs-IDs (z. B. `BEM-04`) | Referenziert Anforderungs-IDs im Proposal |

Details: [Spec-Driven Development](plan/spec-driven-development.md).

## Offene Fragen

Keine offenen Fragen.

## Verwandte Seiten

- [Wiki-Startseite](index.md)
- [Glossar](glossary.md)
- [Rohquellen](input/index.md)
- [Quelle: Knowledge-Scout](sources/knowledge-scout.md)
- [Spec-Driven Development](plan/spec-driven-development.md)
- [Anforderungen](requirements/index.md)
