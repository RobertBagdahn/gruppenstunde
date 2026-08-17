# recipe-portion-normalization Specification

## MODIFIED Requirements

### Requirement: DGE-Referenz dynamisch (MODIFIED)
Der Backend-API-Endpunkt für die Nährstoff-Analyse SHALL um optionale `age` (Integer, Jahre) und `gender` (String, "male"/"female") Query-Parameter erweitert werden. Der Backend-Endpunkt SHALL basierend auf age/gender andere DGE-Referenzwerte verwenden. Das Frontend SHALL im Analyse-Tab "Inhaltsstoffe" einen Dropdown anbieten, der age/gender setzt und die Daten neu lädt. Der Standardwert SHALL `25`/`male` bleiben.

#### Scenario: DGE-Parameter in API
- **WHEN** `GET /api/recipes/{id}/nutrition-breakdown/?age=15&gender=female` aufgerufen wird
- **THEN** verwendet der Backend DGE-Referenzwerte für 15-jährige weibliche Jugendliche
- **THEN** die `dge_coverage`-Prozentsätze sind entsprechend neu berechnet

#### Scenario: Default-Wert ohne Parameter
- **WHEN** `GET /api/recipes/{id}/nutrition-breakdown/` ohne age/gender aufgerufen wird
- **THEN** verwendet der Backend die Standard-DGE-Referenz (25/male)

#### Scenario: DGE-Filter im Frontend
- **WHEN** ein Nutzer den Inhaltsstoffe-Tab öffnet
- **THEN** sieht er einen Dropdown mit Optionen: "25 J., männlich" (Standard), "15 J., männlich", "15 J., weiblich", "10 J., divers"
- **THEN** bei Änderung werden die Daten mit neuen age/gender-Parametern neu geladen
- **THEN** ein Ladeindikator zeigt den Neulade-Vorgang an
