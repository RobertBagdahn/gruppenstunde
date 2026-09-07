## Why

Die Agent-Regeln enthalten inzwischen umfangreiche Feature-Dokumentation, veraltete Aussagen und teilweise widersprüchliche Projektinformationen. Dadurch wird bei jeder Aufgabe unnötiger Kontext geladen und Agenten können falsche Implementierungsentscheidungen treffen.

Die dauerhaften Regeln sollen von den fachlichen Anforderungen getrennt werden: `AGENTS.md` beschreibt, wie implementiert wird; OpenSpec beschreibt, was das System fachlich leisten soll.

## What Changes

- `AGENTS.md`, `backend/AGENTS.md`, `frontend/AGENTS.md` und `frontend-food/AGENTS.md` auf kurze, dauerhafte Implementierungsregeln reduzieren.
- Aktuelle, weiterhin gültige Feature-Anforderungen aus den Agent-Dateien prüfen und in passende OpenSpec-Spezifikationen übertragen.
- Veraltete oder bereits anderweitig dokumentierte Feature-Details aus den Agent-Dateien entfernen.
- **BREAKING** `INSTRUCTIONS.md` löschen, da die Datei veraltete und widersprüchliche Projektregeln enthält.
- **BREAKING** `CONTRIBUTING.md`, `SECURITY.md` und `CODE_OF_CONDUCT.md` aus dem Root entfernen; `README.md` bleibt bestehen.
- Große Beispiele, Modellinventare, historische Hinweise und doppelte Abläufe aus den Agent-Dateien entfernen.

## Capabilities

### New Capabilities

- `agent-documentation`: Beschreibt die Trennung zwischen dauerhaften Implementierungsregeln in `AGENTS.md` und fachlichen Anforderungen in OpenSpec.

### Modified Capabilities

Keine bestehenden Produktanforderungen werden geändert.

## Impact

- Betroffene Dokumentation: Root-, Backend- und beide Frontend-`AGENTS.md` sowie Root-Markdown-Dateien.
- OpenSpec-Spezifikationen müssen vor dem Löschen der bisherigen Feature-Dokumentation gegen den aktuellen Code und bestehende Specs geprüft werden.
- Keine Änderungen an Django-Modellen, APIs, Pydantic-Schemas, Zod-Schemas, React-Komponenten oder Abhängigkeiten.
- Entwickler- und Agenten-Workflows ändern sich insofern, dass fachliche Fragen über OpenSpec und Implementierungsfragen über die zuständige `AGENTS.md` beantwortet werden.
