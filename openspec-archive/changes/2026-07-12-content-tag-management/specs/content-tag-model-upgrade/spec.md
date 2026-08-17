## ADDED Requirements

### Requirement: Tag UUID Primärschlüssel

Das content.Tag-Modell SHALL eine UUID als Primärschlüssel verwenden. Der bisherige Integer-PK SHALL durch eine UUID ersetzt werden. Alle FK-Referenzen (parent, TagSuggestion, M2M-Through-Tabellen für Recipe, Ingredient, Session, Blog, Game, Event) MÜSSEN auf UUID umgestellt werden.

#### Scenario: Tag mit UUID erstellen
- **WHEN** ein neuer Tag erstellt wird
- **THEN** erhält er eine automatisch generierte UUID als `id`

#### Scenario: Bestehende Tags migrieren
- **WHEN** die Migration auf Produktion läuft
- **THEN** erhalten alle bestehenden Tags UUIDs
- **AND** alle FK-Referenzen in M2M-Through-Tabellen zeigen auf die neuen UUIDs

#### Scenario: Tag über UUID referenzieren
- **WHEN** ein Tag über einen API-Endpunkt referenziert wird
- **THEN** wird die UUID als Identifier verwendet (z.B. `/api/tags/550e8400-e29b-41d4-a716-446655440000/`)

### Requirement: Tag description Feld

Das content.Tag-Modell SHALL ein `description`-Feld (TextField) besitzen. Dieses Feld speichert eine menschenlesbare Beschreibung des Tags.

#### Scenario: Tag mit Beschreibung anlegen
- **WHEN** Admin einen Tag mit `description="Rezepte für warme Sommertage"` anlegt
- **THEN** wird der Tag mit dieser Beschreibung gespeichert und in der Admin-UI angezeigt

#### Scenario: Tag ohne Beschreibung anlegen
- **WHEN** Admin einen Tag ohne Beschreibung anlegt
- **THEN** wird der Tag mit leerem `description=""` gespeichert

### Requirement: Tag embedding Feld entfernen

Das `embedding`-Feld (BinaryField) auf content.Tag SHALL entfernt werden.

#### Scenario: Tag ohne embedding
- **WHEN** ein Tag erstellt oder aktualisiert wird
- **THEN** existiert kein embedding-Feld mehr auf dem Modell
- **AND** es wird kein Embedding generiert
