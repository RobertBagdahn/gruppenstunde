---
type: plan
title: "Spec-Driven Development"
description: "Wie Flower-Demand mit OpenSpec, AGENTS.md, LLM-Wiki, Skills und einer festen Prüfkette entwickelt wird, damit Daniel es mit Codex weiterbauen kann."
tags: [plan, openspec, agents, codex, vibe-coding, prozess]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [knowledge-scout, food-frontend, chat-daniel]
---

# Spec-Driven Development

## Kurzfassung

Daniel will das System „agentisch warten und bei Bedarf erweitern/anpassen“ (Chat 09.10.2026) und
hat einen Codex-Plan. Damit ein Agent sicher ändern kann, braucht er drei Dinge: Wissen, warum etwas
so ist (dieses Wiki), was genau gelten muss (OpenSpec-Specs) und wie gearbeitet wird (`AGENTS.md`,
Skills, Prüfkette). Jede Änderung läuft durch Propose → Apply → Archive. Die Regeln stammen aus den
Projekten Knowledge-Scout und Food und haben sich dort mit Claude Code und opencode bewährt.

## Inhalt

- [Drei Wissensebenen](#drei-wissensebenen)
- [OpenSpec-Zyklus](#openspec-zyklus)
- [AGENTS.md-Hierarchie](#agentsmd-hierarchie)
- [Harte Regeln für Agents](#harte-regeln-für-agents)
- [Prüfkette](#prüfkette)
- [So baut Daniel eine Funktion mit Codex](#so-baut-daniel-eine-funktion-mit-codex)
- [Skills](#skills)

## Drei Wissensebenen

| Ebene | Ort | Frage | Ändert sich |
|---|---|---|---|
| Fachwissen | `knowledge/` | Warum? Was weiß Daniel? Was ist offen? | bei neuen Erkenntnissen |
| Verhalten | `openspec/specs/` | Was MUSS das System tun (Szenarien)? | mit jeder archivierten Änderung |
| Arbeitsweise | `AGENTS.md`, Skills | Wie arbeitet ein Agent hier? | bei neuen Konventionen |

## OpenSpec-Zyklus

```text
Explore ──▶ Propose ──────────▶ Apply ─────────▶ Archive
(klären)    proposal.md          Tasks abhaken     Specs übernehmen,
            design.md            Prüfkette grün    Wiki aktualisieren,
            specs/*.md           nach jedem Task   commit „archive: <name>“
            tasks.md
```

- Jede Änderung nennt die Anforderungs-IDs aus [Anforderungen](../requirements/index.md).
- Specs auf Deutsch mit `MUSS/SOLL` und Szenarien „WENN … DANN …“; Code-Bezeichner englisch.
- Tasks klein (ein Task = eine prüfbare Einheit), mit Testhinweis.
- Nach Archive: betroffene Wiki-Seiten aktualisieren, Wiki-Linter grün.

## AGENTS.md-Hierarchie

| Datei | Inhalt |
|---|---|
| `AGENTS.md` (Root) | Projekt, Sprachen, harte Regeln, Ablauf, Prüfkette, Zuständigkeiten, „Was NICHT tun“ |
| `backend/AGENTS.md` | FastAPI, Services, Pydantic, Pipeline-Schritte, Journal, Tests, `uv run` |
| `frontend/AGENTS.md` | Design-System, Komponentenregeln, Laden/Fehler/Feedback (aus Food) |
| `knowledge/` Regeln | Seitenrahmen, Fragen statt Raten, Linter (aus Knowledge-Scout) |

`AGENTS.md` ist ein lebendes Dokument: Neue Konventionen werden sofort dort eingetragen.
Feature-Dokumentation gehört in OpenSpec, nicht in `AGENTS.md`. Codex liest `AGENTS.md` automatisch.

## Harte Regeln für Agents

1. **Rückfragen statt Raten.** Unklares wird gefragt oder als offene Frage im Wiki abgelegt.
2. **Knowledge-First.** Vor fachlichen Änderungen die passende Wiki-Seite und offene Fragen lesen.
3. **Stammsystem und Nukebarkeit nie brechen.** Kein Zustand nur in der DB; Entscheidungen ins Journal.
4. **Keine Fachlogik im Endpunkt oder in der Oberfläche.** Fachlogik in `demand/`, `forecast/`, `planning/`.
5. **Prognose- und Datenmodelländerungen** brauchen einen Backtest-Vergleich im Proposal und Roberts Review.
6. **Keine Secrets, keine personenbezogenen Daten, keine öffentlichen Links** auf Unternehmensdaten.
7. **Was NICHT tun:** keine zusätzlichen Infrastrukturdienste ohne Proposal, keine manuelle Bestandspflege
   im Tool, keine stille Kürzung von Bestellmengen, kein `use_container_width`-Erbe aus v1.

## Prüfkette

Nach jeder Code-Änderung in dieser Reihenfolge, bei Fehlern Auto-Fix und höchstens drei Versuche:

```text
make lint ──▶ make typecheck ──▶ make test ──▶ make wiki-lint
```

Im Archive-Schritt zusätzlich `make rebuild-test` (Determinismus) und Playwright-Tests. CI auf jedem
Push blockiert bei Fehlern. Qualitäts-Checkliste vor dem Commit: keine `print`/`console.log`, keine
Secrets, Anforderungs-IDs genannt, Wiki aktualisiert.

## So baut Daniel eine Funktion mit Codex

1. Idee in Codex beschreiben: „Ich möchte …“. Codex liest `AGENTS.md`, sucht im Wiki und stellt Rückfragen.
2. Codex legt mit dem Skill `openspec-propose` ein Proposal an. Daniel liest `proposal.md` und die Szenarien.
3. Daniel bestätigt oder korrigiert. Erst dann `openspec-apply`.
4. Codex setzt Task für Task um, führt die Prüfkette aus und zeigt das Ergebnis lokal (`make dev`).
5. `openspec-archive`: Specs übernehmen, Wiki aktualisieren, Commit, Pull Request.
6. Robert reviewt Änderungen an Prognose, Datenmodell und Pipeline ([Q-096](../open-questions/q-096-zusammenarbeit-nach-uebergabe.md)).
7. Deployment per `make deploy` nach grüner CI.

## Skills

| Skill | Wofür | Herkunft |
|---|---|---|
| `openspec-explore`, `-propose`, `-apply`, `-archive` | OpenSpec-Zyklus | bereits in v1 unter `.opencode/` |
| `wiki-page`, `wiki-split`, `wiki-index`, `wiki-link` | Wiki-Seiten anlegen und pflegen | Knowledge-Scout |
| `wiki-research`, `wiki-questions`, `wiki-audit` | belegtes Wissen, offene Fragen, Aufräumen | Knowledge-Scout |

Kanonisch unter `.opencode/skills/`, gespiegelt nach `.claude/skills/`; gemeinsame Regeln in
`.opencode/skills/wiki/REGELN.md`.

## Offene Fragen

- [Q-093: Wo liegt der Code?](../open-questions/q-093-git-hosting.md)
- [Q-095: Wie viel Erfahrung mit Codex, Git, Docker?](../open-questions/q-095-codex-erfahrung.md)
- [Q-096: Wie arbeiten wir nach der Übergabe?](../open-questions/q-096-zusammenarbeit-nach-uebergabe.md)
- [Q-086: Was kann der MCP-Server des ERP?](../open-questions/q-086-erp-mcp.md)

## Verwandte Seiten

- [Wiki-Konventionen](../wiki-konventionen.md)
- [Nichtfunktionale Anforderungen](../requirements/nfa.md)
- [Quelle: Knowledge-Scout](../sources/knowledge-scout.md)
- [Roadmap](roadmap.md)
- [Plan für Version 2](index.md)
