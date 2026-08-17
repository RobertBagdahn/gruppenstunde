## Context

Das gesamte Backend und die OpenSpec-Dokumentation verwenden ASCII-Ersetzungen für deutsche Umlaute (ae→ä, oe→ö, ue→ü). Das Frontend ist bereits korrekt. Die Änderung betrifft ausschließlich String-Literale — keine Variablennamen, Funktionsnamen oder Datenbank-Feldnamen.

Betroffene Bereiche:
- **Backend Python (~25 Dateien)**: Fehlermeldungen, Admin-Labels, AI-Prompts, Choice-Labels, verbose_name, Testdaten
- **OpenSpec Docs (~20 Dateien)**: Spec-Beschreibungen, Proposals, Design-Docs, Components
- **AGENTS.md Dateien**: Projekt-Kontext in Projektroot, Backend und Frontend

## Goals / Non-Goals

**Goals:**
- Alle deutschen UI-Strings im Backend verwenden korrekte Umlaute (ä, ö, ü, Ä, Ö, Ü, ß)
- Alle OpenSpec-Dokumentationsdateien verwenden korrekte Umlaute
- Tests passen zu den geänderten Strings
- Django-Migrations für geänderte `verbose_name` und Choice-Werte werden erstellt

**Non-Goals:**
- Variablennamen, Funktionsnamen, Klassennamen bleiben auf Englisch (ASCII) — keine Änderung
- Datenbank-Feldnamen und Tabellennamen bleiben unverändert
- Frontend-Code wird nicht angefasst (bereits korrekt)
- URL-Pfade und Query-Parameter bleiben Englisch (keine Umlaute)
- Kommentare im Code bleiben Englisch (keine Umlaute)
- `ß` wird nur dort eingesetzt, wo es korrekt ist (z.B. `Größe`, nicht `Groesse`)

## Decisions

### 1. Datei-für-Datei-Ansatz statt globalem Search-and-Replace

**Entscheidung**: Jede Datei wird einzeln bearbeitet mit kontextbezogener Prüfung.

**Begründung**: Ein globales Suchen-und-Ersetzen von z.B. `ue`→`ü` würde auch englische Wörter treffen (`true`, `value`, `queue`, `blue`). Jede Ersetzung muss im Kontext eines deutschen Wortes erfolgen.

**Alternativen verworfen**:
- Globales sed/regex: Zu fehleranfällig wegen englischer Wörter
- Nur Backend zuerst, Docs später: Unnötige Aufteilung, besser alles auf einmal

### 2. Migrations für verbose_name und Choice-Änderungen

**Entscheidung**: Neue Migrations erstellen für `event/models/day_slots.py` und `game/choices.py`.

**Begründung**: Django generiert Migrations für `verbose_name`/`verbose_name_plural`-Änderungen und für Choice-Werte. Diese Migrations sind rein kosmetisch (betreffen nur Admin-Oberfläche), müssen aber erstellt werden damit `makemigrations --check` weiterhin sauber durchläuft.

### 3. Test-Assertions werden synchron angepasst

**Entscheidung**: Alle `assert`-Statements und `match=`-Parameter in Tests, die auf die geänderten Strings prüfen, werden gleichzeitig angepasst.

**Begründung**: Tests würden sonst fehlschlagen, da sie auf die alten ASCII-Strings matchen.

### 4. AGENTS.md-Dateien werden mit aktualisiert

**Entscheidung**: Die AGENTS.md-Dateien (Root, Backend, Frontend) werden ebenfalls auf Umlaute umgestellt.

**Begründung**: Diese Dateien enthalten den Projekt-Kontext und werden von AI-Agents gelesen. Korrekte Umlaute verbessern die Lesbarkeit und Konsistenz.

## Risks / Trade-offs

**[Versehentliche Änderung englischer Wörter]** → Manuelle Prüfung jeder Datei; nur deutsche Wörter innerhalb von String-Literalen werden geändert. Variablen und englischer Code bleiben unberührt.

**[Migration-Konflikte]** → Unwahrscheinlich, da nur `verbose_name` betroffen. Falls Konflikte: Migrations mergen.

**[AI-Prompt-Änderungen beeinflussen LLM-Output]** → Minimales Risiko. Die semantische Bedeutung bleibt identisch; LLMs verstehen Umlaute einwandfrei.

**[Encoding-Probleme]** → Alle Dateien sind bereits UTF-8. Python 3.13 und alle verwendeten Tools unterstützen UTF-8 nativ.

## Migration Plan

1. Backend-Python-Dateien ändern (App für App)
2. `uv run python manage.py makemigrations` ausführen
3. `uv run python manage.py migrate` ausführen
4. Backend-Tests anpassen und `uv run pytest` bestätigen
5. OpenSpec-Dokumentation ändern
6. AGENTS.md-Dateien ändern

Kein Rollback-Plan nötig — reine Textänderungen ohne funktionale Auswirkungen.

## Open Questions

Keine offenen Fragen. Die Änderung ist technisch trivial und erfordert keine weiteren Entscheidungen.
