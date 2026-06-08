# change-audit-log Specification

## Purpose
Defines field-level audit logging for ingredient and recipe changes, tracking who changed what field, when, and the old/new values.

## ADDED Requirements

### Requirement: ChangeAuditLog Modell
Das System SHALL ein `ChangeAuditLog` Modell bereitstellen, das Feld-Änderungen an Zutaten und Rezepten protokolliert.

#### Scenario: Audit-Log Felder
- **WHEN** das `ChangeAuditLog` Modell inspiziert wird
- **THEN** SHALL es folgende Felder haben:
  - `content_type` (ForeignKey zu ContentType, für GFK)
  - `object_id` (PositiveIntegerField)
  - `field_name` (CharField, max 100)
  - `old_value` (TextField, nullable)
  - `new_value` (TextField, nullable)
  - `changed_by` (ForeignKey zu User, SET_NULL, nullable)
  - `changed_at` (DateTimeField, auto_now_add)

#### Scenario: GenericForeignKey
- **WHEN** das Audit-Log für Zutaten und Rezepte verwendet wird
- **THEN** SHALL es über `ContentType` und `object_id` generisch auf beide Modelle verweisen

### Requirement: Automatisches Audit-Logging via Signal
Das System SHALL Änderungen an Zutaten und Rezepten automatisch protokollieren.

#### Scenario: Feld-Änderung an Zutat wird geloggt
- **WHEN** eine Zutat via `save()` aktualisiert wird und sich `name` von "Tomate" zu "Tomaten" ändert
- **THEN** SHALL ein `ChangeAuditLog` Eintrag mit `field_name="name"`, `old_value="Tomate"`, `new_value="Tomaten"` erstellt werden
- **THEN** SHALL `changed_by` auf den aktuellen User gesetzt werden

#### Scenario: Mehrere Feld-Änderungen
- **WHEN** eine Zutat mit geändertem `name`, `price_per_kg` und `description` gespeichert wird
- **THEN** SHALL für jedes geänderte Feld ein separater `ChangeAuditLog` Eintrag erstellt werden

#### Scenario: Unveränderte Felder werden nicht geloggt
- **WHEN** eine Zutat gespeichert wird und sich nur `name` geändert hat, aber `description` gleich bleibt
- **THEN** SHALL nur ein Log-Eintrag für `name` erstellt werden
- **THEN** SHALL KEIN Log-Eintrag für `description` erstellt werden

#### Scenario: Neuerstellung wird nicht geloggt
- **WHEN** eine neue Zutat erstellt wird (INSERT, nicht UPDATE)
- **THEN** SHALL KEIN Audit-Log erstellt werden (nur Änderungen, keine Erstellungen)

#### Scenario: Änderung durch nicht authentifizierten Kontext
- **WHEN** eine Zutat z.B. durch ein Management Command oder Script gespeichert wird
- **THEN** SHALL `changed_by` NULL sein

### Requirement: Audit-Log API für Staff
Das System SHALL eine API bereitstellen, mit der Staff-User die Änderungshistorie einsehen können.

#### Scenario: Audit-Log für eine Zutat abrufen
- **WHEN** Staff-User `GET /api/admin/audit-log/?content_type=ingredient&object_id=42` aufruft
- **THEN** SHALL eine paginierte Liste von `ChangeAuditLog` Einträgen zurückgegeben werden
- **THEN** SHALL jeder Eintrag `{field_name, old_value, new_value, changed_by_name, changed_at}` enthalten
- **THEN** SHALL die Liste nach `changed_at` absteigend sortiert sein

#### Scenario: Audit-Log für ein Rezept abrufen
- **WHEN** Staff-User `GET /api/admin/audit-log/?content_type=recipe&object_id=7` aufruft
- **THEN** SHALL die Änderungshistorie des Rezepts zurückgegeben werden

#### Scenario: Audit-Log nur für Staff
- **WHEN** ein nicht-Staff-User den Audit-Log-Endpoint aufruft
- **THEN** SHALL ein 403-Fehler zurückgegeben werden

### Requirement: Audit-Log Timeline in der UI
Die Zutaten- und Rezept-Detailseiten SHALL eine Änderungshistorie-Komponente für Staff-User anzeigen.

#### Scenario: Timeline auf Zutatenseite
- **WHEN** Staff-User die Zutaten-Detailseite aufruft
- **THEN** SHALL eine Timeline-Komponente die letzten Änderungen anzeigen (maximal 20 Einträge)
- **THEN** SHALL jeder Eintrag Feldname, alter Wert, neuer Wert, Bearbeiter und Zeitstempel zeigen

#### Scenario: Timeline für Nicht-Staff nicht sichtbar
- **WHEN** ein normaler User die Zutaten-Detailseite aufruft
- **THEN** SHALL die Timeline-Komponente NICHT sichtbar sein

#### Scenario: Keine Änderungen
- **WHEN** eine Zutat noch nie geändert wurde (keine Audit-Log-Einträge)
- **THEN** SHALL die Timeline "Keine Änderungen" anzeigen

### Requirement: Audit-Log Bereinigung
Das System SHALL alte Audit-Log-Einträge automatisch bereinigen.

#### Scenario: Bereinigung via Management Command
- **WHEN** `uv run python manage.py cleanup_audit_logs --days 90` ausgeführt wird
- **THEN** SHALL alle `ChangeAuditLog` Einträge älter als 90 Tage gelöscht werden

#### Scenario: Default Retention
- **WHEN** kein `--days` Parameter angegeben wird
- **THEN** SHALL der Default von 90 Tagen verwendet werden
