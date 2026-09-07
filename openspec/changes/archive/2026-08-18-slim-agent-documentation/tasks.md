## 1. Bestandsaufnahme und Spec-Abgleich

- [x] 1.1 Alle vier `AGENTS.md`-Dateien und Root-Markdown-Dateien auf aktuelle, veraltete und widersprüchliche Inhalte prüfen.
- [x] 1.2 Feature-Anforderungen gegen `openspec/specs/` und den aktuellen Code abgleichen.
- [x] 1.3 Fehlende aktuelle Anforderungen als OpenSpec-Specs ergänzen und obsolete Anforderungen verwerfen.

## 2. Agent-Regeln kürzen

- [x] 2.1 Root-`AGENTS.md` auf projektweite Implementierungsregeln, Tooling, Sprache und Architekturgrenzen reduzieren.
- [x] 2.2 `backend/AGENTS.md` auf Backend-Implementierung, API-, Schema-, Test- und Migrationsregeln reduzieren.
- [x] 2.3 `frontend/AGENTS.md` auf Frontend-Implementierung, State-, UI-, Schema- und Testregeln reduzieren.
- [x] 2.4 `frontend-food/AGENTS.md` auf Food-Frontend-Implementierung und Design-System-Regeln reduzieren.
- [x] 2.5 Große Beispiele, Feature-Inventare, historische Hinweise und doppelte Regeln entfernen.

## 3. Root-Dokumente bereinigen

- [x] 3.1 `INSTRUCTIONS.md` löschen.
- [x] 3.2 `CONTRIBUTING.md` löschen.
- [x] 3.3 `SECURITY.md` löschen.
- [x] 3.4 `CODE_OF_CONDUCT.md` löschen.
- [x] 3.5 `README.md` behalten und auf verbliebene Root-Dokumentverweise prüfen.

## 4. Prüfung

- [x] 4.1 Nach veralteten oder widersprüchlichen Regelbegriffen suchen, insbesondere `idea`, JWT, Docker und alte Python-Versionen.
- [x] 4.2 Prüfen, dass jede dauerhaft geltende Regel nur im passenden `AGENTS.md`-Scope dokumentiert ist.
- [x] 4.3 `openspec validate` ausführen und die resultierenden Änderungen sowie den finalen Tokenumfang prüfen.
