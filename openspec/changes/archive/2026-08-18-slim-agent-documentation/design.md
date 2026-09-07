## Context

Die vier `AGENTS.md`-Dateien werden als Arbeitskontext für Agenten verwendet. Aktuell enthalten sie neben Implementierungsregeln auch große Inventare, Beispiele, Feature-Anforderungen und historische Migrationshinweise. Zusätzlich ist `INSTRUCTIONS.md` veraltet und widerspricht dem aktuellen Projektstand.

## Goals / Non-Goals

**Goals:**

- Agent-Kontext auf kurze, dauerhafte Regeln zum Implementieren reduzieren.
- Fachliche Anforderungen in OpenSpec auffindbar und testbar dokumentieren.
- Widersprüchliche Root-Dokumentation entfernen.
- Die Zuständigkeit der vier `AGENTS.md`-Dateien klar nach Verzeichnisgrenze trennen.

**Non-Goals:**

- Keine Änderungen an Anwendungscode, APIs, Datenbanken oder UI.
- Keine automatische Übernahme historischer oder bereits überholter Anforderungen.
- Keine Entfernung von `README.md`.

## Decisions

1. **`AGENTS.md` beschreibt nur das Wie.**
   Dauerhafte Regeln zu Sprache, Architektur, Tooling, Validierung, Tests und relevanten Implementierungsmustern bleiben erhalten. Feature-Verhalten, Modellinventare und konkrete Produktanforderungen werden entfernt.
   Alternative: Die Dateien als vollständige Projekthandbücher behalten. Das würde den Agent-Kontext weiterhin unnötig vergrößern.

2. **OpenSpec beschreibt das Was.**
   Aktuelle Anforderungen werden vor der Bereinigung gegen bestehende Specs und den Code geprüft. Fehlende Anforderungen werden als testbare Requirements in `openspec/specs/` ergänzt.
   Alternative: Die Inhalte nur löschen. Das würde gültige Produktentscheidungen verlieren.

3. **Alle vier Agent-Dateien werden bereinigt.**
   Root-Regeln gelten projektweit. Backend-, Haupt-Frontend- und Food-Frontend-Regeln enthalten nur bereichsspezifische Implementierungskonventionen und verweisen für fachliche Details auf OpenSpec.

4. **Root-Dokumente werden auf Projektbedarf reduziert.**
   `INSTRUCTIONS.md`, `CONTRIBUTING.md`, `SECURITY.md` und `CODE_OF_CONDUCT.md` werden entfernt. `README.md` bleibt als Einstiegspunkt und öffentliche Projektdokumentation erhalten.

## Risks / Trade-offs

- **[Risk]** Eine noch nicht erkannte gültige Anforderung wird aus `AGENTS.md` entfernt. → Vor dem Löschen jeden Feature-Abschnitt gegen Code und bestehende OpenSpec-Specs prüfen.
- **[Risk]** Maintainer verlieren Community- oder Security-Hinweise im Repository. → Die Entfernung ist bewusst Teil der bestätigten Entscheidung; README und OpenSpec bleiben erhalten.
- **[Risk]** Ein Agent sucht eine entfernte Regel weiterhin an der alten Stelle. → Kurze Verweise auf OpenSpec und eine klare Zuständigkeitsregel in den gekürzten Agent-Dateien verwenden.

## Migration Plan

1. Bestehende Agent-Dateien und Root-Markdown-Inhalte inventarisieren.
2. Aktuelle Feature-Anforderungen in OpenSpec ergänzen oder bestehenden Specs zuordnen.
3. Die vier `AGENTS.md`-Dateien auf Implementierungsregeln kürzen.
4. Bestätigte Root-Dateien löschen.
5. Mit `openspec validate` und einer Suche nach veralteten Regelbegriffen prüfen, dass keine widersprüchlichen Agent-Anweisungen übrig bleiben.

## Open Questions

- Welche einzelnen Abschnitte aus den aktuellen Agent-Dateien sind noch fachlich gültig, aber in keiner bestehenden Spec abgebildet? Diese Frage wird während der Implementierung anhand von Code und Specs beantwortet.
