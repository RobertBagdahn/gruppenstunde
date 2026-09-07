## MODIFIED Requirements

### Requirement: norm_portions aus GroupMembers

Das System SHALL `norm_portions` aus den Norm-Faktoren aller `MealPlanGroupMember`s berechnen,
sobald Mitglieder vorhanden sind und kein manueller Normportionen-Override aktiv ist. Der letzte manuelle Wert wird in
`previous_norm_portions` gesichert und nach dem Löschen aller Mitglieder wiederhergestellt.
Bei aktivem `norm_portions_manual`-Override SHALL der gespeicherte manuelle Wert unverändert bleiben.
`norm_portions` SHALL ein Float sein.

#### Scenario: Normportionen aktualisieren
- **WHEN** GroupMembers vorhanden sind und kein manueller Override aktiv ist
- **THEN** entspricht `norm_portions` ihrer Normfaktor-Summe

#### Scenario: Manuelle Normportionen bewahren
- **WHEN** GroupMembers hinzugefügt, geändert, gelöscht oder synchronisiert werden und der manuelle Override aktiv ist
- **THEN** bleibt `norm_portions` auf dem gespeicherten manuellen Wert

### Requirement: activity_factor am MealPlan

Das `MealPlan`-Modell SHALL ein Float-Feld `activity_factor` mit Default `1.5` bereitstellen,
es in Detail-Responses ausgeben und per Update änderbar machen. Bei vorhandenen GroupMembers
ist `norm_portions` danach neu zu berechnen, sofern kein manueller Normportionen-Override aktiv ist.

#### Scenario: Aktivitätsfaktor ändern
- **WHEN** ein Nutzer `activity_factor` aktualisiert
- **THEN** wird der Wert gespeichert und die automatischen Normportionen werden neu berechnet

#### Scenario: Aktivitätsfaktor bei manuellem Override ändern
- **WHEN** ein Nutzer `activity_factor` aktualisiert und `norm_portions_manual` aktiv ist
- **THEN** wird der Aktivitätsfaktor gespeichert
- **AND** der manuelle `norm_portions`-Wert bleibt unverändert
