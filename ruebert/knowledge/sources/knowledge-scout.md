---
type: source
title: "Quelle: Knowledge-Scout"
description: "Das Projekt knowledge-scout als Vorlage für LLM-Wiki, Open Knowledge Format, Wiki-Skills, Linter und Agent-Regeln."
tags: [quelle, wiki, okf, skills, agents]
status: historical
retrieved: 2026-10-10
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
---

# Quelle: Knowledge-Scout

## Kurzfassung

Robert hat vorgegeben, viele Best Practices aus `~/code/knowledge-scout` zu übernehmen. Das Projekt
betreibt ein LLM-Wiki im Open Knowledge Format (OKF v0.1) mit Seitenrahmen, offenen Fragen als
eigene Dateien, Quellenseiten mit Abrufdatum, sieben Wiki-Skills, einem Linter und strengen
Agent-Regeln. Gesichtet am 10.10.2026.

## Inhalt

- [Was daraus übernommen wurde](#was-daraus-übernommen-wurde)
- [Geltungsgrenze](#geltungsgrenze)

## Was daraus übernommen wurde

| Praxis | Umsetzung in Flower-Demand |
|---|---|
| Frontmatter `type/title/description/status/visibility/generated` | alle Seiten |
| Seitenrahmen Kurzfassung → Inhalt → … → Offene Fragen → Verwandte Seiten | alle Seiten außer `input/` und Glossar |
| 300/400-Zeilen-Regel, Aufteilen in Ordner mit `index.md` | [Wiki-Konventionen](../wiki-konventionen.md) |
| Eine Datei je offener Frage mit Annahme und Entscheider | [Offene Fragen](../open-questions/index.md) |
| `input/` wortgetreu und unantastbar | [Rohquellen](../input/index.md) |
| Quellenseiten mit `retrieved` und Geltungsgrenze | [Quellen](index.md) |
| `type: observation` / `hypothesis` für Befunde | [Datenbefunde](../data/index.md) |
| Arbeitsentscheidungen und Widersprüche als eigene Seiten | [Arbeitsentscheidungen](arbeitsentscheidungen.md), [Widersprüche](widersprueche.md) |
| Linter (Frontmatter, Rahmen, Links, Länge, Waisen) | `scripts/wiki_lint.py`, `make wiki-lint` |
| Skills `wiki-page/-split/-index/-link/-research/-questions/-audit` + `REGELN.md` | `.opencode/skills/wiki/`, gespiegelt nach `.claude/skills/` |
| AGENTS.md: Rückfragen statt Raten, Knowledge-First, Prüfkette, Living Document, „Was NICHT tun“ | `AGENTS.md`, [Spec-Driven Development](../plan/spec-driven-development.md) |

## Geltungsgrenze

- Knowledge-Scout ist ein reines Wiki ohne Datenbank; seine Regel „keine Datenbank“ gilt hier nicht.
- Der Linter ist dort in TypeScript; hier wurde er nach Python portiert und hat (noch) keinen `--fix`-Modus.
- Pfadfinder-spezifische Regeln (Crismeke, Führung statt Leitung) sind nicht übertragen.

## Offene Fragen

Keine offenen Fragen.

## Verwandte Seiten

- [Wiki-Konventionen](../wiki-konventionen.md)
- [Spec-Driven Development](../plan/spec-driven-development.md)
- [Quelle: Food-Frontend](food-frontend.md)
- [Quellen](index.md)
