## ADDED Requirements

### Requirement: Deutsche UI-Strings verwenden korrekte Umlaute

Alle deutschen Textstrings im Backend (Fehlermeldungen, Admin-Labels, AI-Prompts, Choice-Labels, verbose_name) MÜSSEN korrekte Unicode-Umlaute (ä, ö, ü, Ä, Ö, Ü) und ß verwenden. ASCII-Ersetzungen (ae, oe, ue) DÜRFEN NICHT für deutsche Wörter in String-Literalen verwendet werden.

#### Scenario: Fehlermeldung mit Umlaut wird korrekt angezeigt

- **WHEN** ein API-Endpunkt eine deutsche Fehlermeldung zurückgibt
- **THEN** MUSS die Meldung korrekte Umlaute enthalten (z.B. "Ungültiger Content-Typ" statt "Ungueltiger Content-Typ")

#### Scenario: Admin-Label mit Umlaut wird korrekt angezeigt

- **WHEN** ein Django-Admin-Action angezeigt wird
- **THEN** MUSS das Label korrekte Umlaute enthalten (z.B. "Ausgewählte genehmigen" statt "Ausgewaehlte genehmigen")

#### Scenario: AI-Prompt mit Umlaut wird korrekt gesendet

- **WHEN** ein AI-Prompt an das LLM gesendet wird
- **THEN** MÜSSEN alle deutschen Wörter im Prompt korrekte Umlaute verwenden (z.B. "Wölflinge" statt "Woelflinge")

#### Scenario: Englische Variablennamen bleiben unverändert

- **WHEN** Code englische Variablennamen, Funktionsnamen oder Kommentare enthält
- **THEN** DÜRFEN diese NICHT verändert werden, auch wenn sie Buchstabenkombinationen wie "ue", "ae", "oe" enthalten (z.B. `value`, `true`, `queue`)

### Requirement: OpenSpec-Dokumentation verwendet korrekte Umlaute

Alle OpenSpec-Spec-Dateien, Proposals, Design-Docs und die Components-Datei MÜSSEN korrekte Unicode-Umlaute verwenden.

#### Scenario: Spec-Datei enthält korrekte Umlaute

- **WHEN** eine OpenSpec-Spec-Datei deutschen Text enthält
- **THEN** MUSS dieser Text korrekte Umlaute verwenden (z.B. "können" statt "koennen", "führt" statt "fuehrt")

### Requirement: AGENTS.md verwendet korrekte Umlaute

Alle AGENTS.md-Dateien (Root, Backend, Frontend) MÜSSEN korrekte Unicode-Umlaute in deutschen Textpassagen verwenden.

#### Scenario: AGENTS.md-Kontext enthält korrekte Umlaute

- **WHEN** eine AGENTS.md-Datei deutschen Projektkontext beschreibt
- **THEN** MUSS dieser Text korrekte Umlaute verwenden (z.B. "Gruppenführer" statt "Gruppenfuehrer")

### Requirement: Tests spiegeln die korrekten Umlaute wider

Alle Test-Assertions und Testdaten MÜSSEN die aktualisierten Strings mit korrekten Umlauten verwenden.

#### Scenario: Test prüft Fehlermeldung mit Umlaut

- **WHEN** ein Test eine Fehlermeldung validiert
- **THEN** MUSS der erwartete String korrekte Umlaute enthalten (z.B. `match="Entwürfe"` statt `match="Entwuerfe"`)
