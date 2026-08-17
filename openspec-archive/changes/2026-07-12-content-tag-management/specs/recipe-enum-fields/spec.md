## ADDED Requirements

### Requirement: Recipe preparation_method Feld

Das Recipe-Modell SHALL ein `preparation_method`-Feld (CharField mit TextChoices) besitzen, das die Zubereitungsart des Rezepts angibt.

#### Scenario: Zubereitungsart setzen
- **WHEN** ein Rezept mit `preparation_method="baking"` erstellt wird
- **THEN** wird die Zubereitungsart gespeichert und in der API-Response ausgegeben

#### Scenario: Zubereitungsart nicht gesetzt
- **WHEN** ein Rezept ohne `preparation_method` erstellt wird
- **THEN** bleibt das Feld null/leer (optional)

#### Scenario: Validierung der Choices
- **WHEN** ein ungültiger Wert für `preparation_method` gesendet wird
- **THEN** gibt die API einen Validierungsfehler zurück

### Requirement: Equipment Model und M2M auf Recipe

Das System SHALL ein `supply.models.Equipment`-Modell mit `name` (CharField) und `slug` (SlugField, unique) bereitstellen. Das Recipe-Modell SHALL eine M2M-Relation `equipment` zu Equipment besitzen. Ein Rezept KANN mehrere Equipment-Einträge haben.

#### Scenario: Equipment zu Rezept hinzufügen
- **WHEN** ein Rezept mit `equipment=["oven", "pan"]` erstellt oder aktualisiert wird
- **THEN** werden die Equipment-Verknüpfungen gespeichert

#### Scenario: Rezept ohne Equipment
- **WHEN** ein Rezept ohne Equipment erstellt wird
- **THEN** bleibt die equipment-M2M leer

#### Scenario: Equipment in API-Response
- **WHEN** `GET /api/recipes/{id}/` aufgerufen wird
- **THEN** enthält die Response `equipment: [{id, name, slug}, ...]`

### Requirement: Equipment Stammdaten-Verwaltung

Das System SHALL eine Admin-API und einen Admin-Tab für Equipment bereitstellen (CRUD), zugänglich nur für Staff-User. Equipment-Einträge werden per Seed vorbelegt. Der Equipment-Tab SHALL zwischen "Abteilungen" und "Ernährungstags" im Admin Stammdaten erscheinen.

#### Scenario: Equipment im Admin-Tab auflisten
- **WHEN** Staff-User den "Equipment"-Tab im Admin öffnet
- **THEN** werden alle Equipment-Einträge in einer CRUD-Tabelle angezeigt

#### Scenario: Equipment via API auflisten
- **WHEN** Staff-User `GET /api/supply/equipment/` aufruft
- **THEN** werden alle Equipment-Einträge zurückgegeben

#### Scenario: Neues Equipment anlegen
- **WHEN** Staff-User `POST /api/supply/equipment/` mit `{name: "Dutch Oven"}` aufruft
- **THEN** wird ein neuer Equipment-Eintrag mit automatisch generiertem Slug erstellt

#### Scenario: Equipment löschen mit Verwendung
- **WHEN** Staff-User ein Equipment löscht, das von Rezepten verwendet wird
- **THEN** zeigt das System eine Warnung oder verhindert das Löschen

#### Scenario: Seed-Werte
- **WHEN** die Datenbank initialisiert oder geseedet wird
- **THEN** sind folgende Equipment-Einträge vorbelegt: Topf, Pfanne, Ofen, Grill, Dutch Oven, Thermomix, Wasserkocher, Kühlschrank
