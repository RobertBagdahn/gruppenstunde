## ADDED Requirements

### Requirement: Management-Command zur Analytics-Bereinigung

Das System MUSS einen Django Management-Command `cleanup_analytics` bereitstellen, der veraltete Analytics-Daten automatisch löscht.

Der Command MUSS folgende Daten löschen:
- `content.ContentView`-Einträge älter als 12 Monate
- `content.SearchLog`-Einträge älter als 12 Monate

Der Retention-Zeitraum MUSS über ein Command-Argument `--retention-months` konfigurierbar sein (Standard: 12).

Der Command MUSS die Anzahl der gelöschten Einträge pro Model ausgeben.

#### Scenario: Cleanup mit Standard-Retention
- **WHEN** der Command `uv run python manage.py cleanup_analytics` ausgeführt wird
- **THEN** werden alle `ContentView`- und `SearchLog`-Einträge gelöscht, die älter als 12 Monate sind, und die Anzahl der gelöschten Einträge wird ausgegeben

#### Scenario: Cleanup mit benutzerdefinierter Retention
- **WHEN** der Command mit `--retention-months 6` ausgeführt wird
- **THEN** werden alle Einträge gelöscht, die älter als 6 Monate sind

#### Scenario: Kein Datenverlust bei aktuellen Einträgen
- **WHEN** der Command ausgeführt wird und alle Einträge jünger als der Retention-Zeitraum sind
- **THEN** werden 0 Einträge gelöscht und der Command gibt "0 ContentView-Einträge gelöscht, 0 SearchLog-Einträge gelöscht" aus

### Requirement: Batch-Löschung für große Datenmengen

Der Cleanup-Command MUSS Batch-Löschung verwenden (max. 10.000 Einträge pro Batch), um Lock-Contention auf der Datenbank zu vermeiden.

#### Scenario: Große Datenmenge wird in Batches gelöscht
- **WHEN** 50.000 veraltete ContentView-Einträge existieren
- **THEN** werden die Einträge in Batches von maximal 10.000 gelöscht, ohne die Datenbank für andere Operationen zu blockieren

### Requirement: Dry-Run-Modus

Der Command MUSS einen `--dry-run`-Modus unterstützen, der die Anzahl der zu löschenden Einträge anzeigt, ohne tatsächlich zu löschen.

#### Scenario: Dry-Run zeigt Vorschau
- **WHEN** der Command mit `--dry-run` ausgeführt wird
- **THEN** wird die Anzahl der betroffenen Einträge pro Model angezeigt, aber keine Daten gelöscht
