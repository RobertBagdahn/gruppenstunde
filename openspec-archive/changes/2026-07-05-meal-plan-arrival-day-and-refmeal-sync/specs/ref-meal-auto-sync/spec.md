## ADDED Requirements

### Requirement: Auto-Sync verlinkter Mahlzeiten beim Speichern eines RefMeals
Das System SHALL beim Speichern (Aktualisieren) eines RefMeals dessen Items in alle verlinkten Mahlzeiten mit `is_synced = true` übernehmen, sodass kein separater manueller Sync-Schritt nötig ist. Mahlzeiten mit `is_synced = false` (entkoppelt) SHALL NICHT verändert werden.

#### Scenario: RefMeal-Änderung wird automatisch übernommen
- **WHEN** ein berechtigter Nutzer ein RefMeal mit zwei verlinkten `is_synced`-Mahlzeiten speichert und dies bestätigt
- **THEN** SHALL das System die Items beider verlinkter Mahlzeiten an die Vorlage angleichen
- **AND** SHALL die Response die Anzahl der synchronisierten Mahlzeiten (`synced_meal_count`) enthalten

#### Scenario: Entkoppelte Mahlzeit bleibt unberührt
- **WHEN** ein RefMeal gespeichert wird und eine zuvor entkoppelte Mahlzeit (`is_synced = false`) existiert
- **THEN** SHALL diese Mahlzeit unverändert bleiben

### Requirement: Bestätigung vor destruktivem Auto-Sync
Da der Sync die Items der verlinkten Mahlzeiten ersetzt, SHALL das System vor der Übernahme die Anzahl der betroffenen verlinkten Mahlzeiten bereitstellen und eine Bestätigung des Nutzers einholen.

#### Scenario: Warnung mit Anzahl betroffener Mahlzeiten
- **WHEN** ein Nutzer ein RefMeal mit drei verlinkten `is_synced`-Mahlzeiten speichern will
- **THEN** SHALL die UI vor dem Sync anzeigen, dass drei verknüpfte Mahlzeiten überschrieben werden
- **AND** SHALL der Sync erst nach Bestätigung durch den Nutzer ausgeführt werden

#### Scenario: Abbruch durch Nutzer
- **WHEN** der Nutzer die Bestätigung ablehnt
- **THEN** SHALL das RefMeal nicht synchronisiert werden
- **AND** SHALL keine verlinkte Mahlzeit verändert werden

### Requirement: Anzahl verlinkter Mahlzeiten abrufbar
Das System SHALL die Anzahl der verlinkten `is_synced`-Mahlzeiten eines RefMeals bereitstellen (z.B. als Feld in der RefMeal-Detail-Response oder eigener Endpoint), damit die UI den Bestätigungsdialog mit korrekter Zahl anzeigen kann.

#### Scenario: Detail-Response enthält Anzahl
- **WHEN** ein authentifizierter Nutzer ein RefMeal abruft
- **THEN** SHALL die Antwort die Anzahl der verlinkten `is_synced`-Mahlzeiten enthalten
