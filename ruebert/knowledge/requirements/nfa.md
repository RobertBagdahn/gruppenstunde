---
type: requirements
title: "Nichtfunktionale Anforderungen"
description: "Anforderungen an Betrieb, Sicherheit, Datenschutz, Leistung, Qualität und agentische Wartbarkeit von Flower-Demand Version 2."
tags: [anforderungen, nfa, betrieb, sicherheit, wartbarkeit]
status: draft
visibility: public
generated: { by: agent:claude-opus-5-5, at: 2026-10-10T00:00:00Z }
sources: [chat-daniel, arbeitsentscheidungen]
---

# Nichtfunktionale Anforderungen

## Kurzfassung

Flower-Demand läuft intern bei DeineGartenwelt als Docker-Container auf einer Ubuntu-VM unter
Windows Server (Chat 09.10.2026). Architektur ist von Robert vorgegeben: FastAPI, PostgreSQL,
selbst gebautes TypeScript-Frontend. Das System muss nukebar, sicher, schnell genug und vor allem
für Daniel mit Codex wartbar sein. Dafür gelten Spec-Driven Development, ein LLM-Wiki, strenge Typen
und automatische Prüfungen.

## Inhalt

- [Betrieb und Plattform](#betrieb-und-plattform)
- [Sicherheit und Datenschutz](#sicherheit-und-datenschutz)
- [Leistung](#leistung)
- [Wartbarkeit durch Agents](#wartbarkeit-durch-agents)

## Betrieb und Plattform

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| NFA-01 | Betrieb intern per Docker Compose auf Ubuntu-VM; kein Cloud-Zwang | Muss | Chat 09.10. | bestätigt |
| NFA-02 | Stack: FastAPI (Python), PostgreSQL, React/TypeScript-Frontend nach Food-Frontend | Muss | Robert | bestätigt |
| NFA-03 | Datenbank nukebar; Entscheidungs-Journal und Altdaten-Archiv getrennt gesichert | Muss | Robert 10.10. | bestätigt |
| NFA-04 | Tägliche Backups von Journal-Repository und Datenbank (Datenbank nur zur Beschleunigung, Journal kritisch); Restore getestet | Muss | Robert | offen ([Q-094](../open-questions/q-094-backups.md)) |
| NFA-05 | Automatische Updates nachts nach grüner CI (inkl. Rebuild-Test); Sicherung vor dem Update, Rückrollen per Befehl, automatisches Zurückrollen bei fehlgeschlagenem Start | Muss | Robert, [Q-100](../open-questions/q-100-updates-deployment.md) | bestätigt |
| NFA-06 | Zeitzone Europe/Berlin, ISO-Kalenderwochen, deutsches Locale | Muss | v1:`german-locale-setup` | übernommen |
| NFA-07 | Status-Seite für Jobs (Import, Prüfungen, Prognose) mit Logs | Soll | Robert | abgeleitet |

## Sicherheit und Datenschutz

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| NFA-08 | Anmeldung mit Session-Cookie (HTTP-only), kein JWT; zunächst ein Nutzer (Daniel), Rollen technisch vorbereitet | Muss | Food-Frontend-Regeln, [Q-008](../open-questions/q-008-nutzerkreis.md) | bestätigt |
| NFA-13 | Keine Secrets im Repository; ERP-Zugang nur über Umgebungsvariablen | Muss | Robert | bestätigt |
| NFA-14 | Keine personenbezogenen Daten importieren; keine öffentlichen Links auf Unternehmensdaten | Muss | Chat 17.05. | bestätigt |
| NFA-15 | Zugriff nur aus dem internen Netz/VPN, HTTPS über Reverse Proxy | Muss | Robert, [Q-092](../open-questions/q-092-netzwerkzugriff.md) | bestätigt |
| NFA-16 | Audit-Log für Freigaben, ERP-Schreibzugriffe und Einstellungsänderungen | Muss | Robert | abgeleitet |

## Leistung

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| NFA-17 | Ampel und Bestellplaner antworten in unter 1 s (vorberechnete Ergebnisse) | Soll | Robert | abgeleitet |
| NFA-18 | Vollständiger Rebuild inklusive Prognose unter 60 Minuten auf der Ziel-VM; Mindestanforderung VM: 4 Kerne, 16 GB RAM, 100 GB frei | Soll | Robert, [Q-090](../open-questions/q-090-vm-ressourcen.md) | bestätigt |

## Wartbarkeit durch Agents

| ID | Anforderung | Prio | Quelle | Status |
|---|---|---|---|---|
| NFA-09 | Spec-Driven Development mit OpenSpec: jede Änderung als Proposal, Design, Specs, Tasks mit Anforderungs-IDs | Muss | Robert | bestätigt |
| NFA-10 | `AGENTS.md` je Ebene (Root, Backend, Frontend, Wiki) als lebendes Dokument; funktioniert mit Codex und Claude Code | Muss | Chat 09.10. (Codex), Knowledge-Scout | bestätigt |
| NFA-11 | LLM-Wiki unter `knowledge/` nach OKF mit Linter; Pflicht-Prüfung bei jeder Wiki-Änderung | Muss | Robert | bestätigt |
| NFA-12 | Automatische Prüfkette nach jeder Änderung: Lint → Typen → Tests → Wiki-Lint; CI blockiert bei Fehlern | Muss | Knowledge-Scout | abgeleitet |
| NFA-19 | Fachlogik (Rundung, Reichweite, Klassifikation, Auflösung, Rebuild) mit szenariobasierten Tests aus den Specs abgedeckt | Muss | Robert | abgeleitet |
| NFA-20 | Typen durchgängig: Python mit Type Hints und mypy/pyright, TypeScript strict, Schemas aus OpenAPI generiert | Muss | Food-Frontend | abgeleitet |
| NFA-21 | Kleine Module mit klaren Grenzen, damit ein Agent eine Änderung lokal versteht | Soll | Robert | abgeleitet |
| NFA-22 | Sprache: Code, Kommentare, Commits, URLs englisch; Oberfläche und Fachdoku deutsch mit echten Umlauten | Muss | AGENTS.md | übernommen |

## Offene Fragen

- [Q-090: Welche Ressourcen hat die VM?](../open-questions/q-090-vm-ressourcen.md)
- [Q-092: Wie wird auf das Tool zugegriffen?](../open-questions/q-092-netzwerkzugriff.md)
- [Q-093: Wo liegt der Code?](../open-questions/q-093-git-hosting.md)
- [Q-095: Wie viel Erfahrung mit Codex, Git, Docker?](../open-questions/q-095-codex-erfahrung.md)
- [Q-100: Wer spielt Updates ein?](../open-questions/q-100-updates-deployment.md)

## Verwandte Seiten

- [Zielarchitektur](../plan/zielarchitektur.md)
- [Spec-Driven Development](../plan/spec-driven-development.md)
- [Datenpipeline und Neuaufbau](../data/datenpipeline-und-neuaufbau.md)
- [Arbeitsentscheidungen](../sources/arbeitsentscheidungen.md)
- [Anforderungen](index.md)
