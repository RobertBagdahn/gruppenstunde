## MODIFIED Requirements

### Requirement: Portion remains linked to Ingredient
Portion SHALL continue to reference Ingredient from the supply app. The relationship pattern SHALL remain the same. Additionally, Portion SHALL have a `priority` field (IntegerField, default=0) to control display ordering and an `is_default` field (BooleanField, default=False) to mark the preferred portion for display. Only one Portion per Ingredient SHALL have `is_default=True`.

#### Scenario: Portion for supply.Ingredient
- **WHEN** a Portion is created for an Ingredient
- **THEN** it SHALL reference supply.Ingredient instead of idea.Ingredient
- **THEN** all weight conversion and measuring unit logic SHALL remain unchanged

#### Scenario: Portion with priority and default
- **WHEN** Portionen für eine Zutat existieren
- **THEN** SHALL die Portion mit `is_default=True` als bevorzugte Anzeige-Portion verwendet werden
- **THEN** SHALL maximal eine Portion pro Zutat `is_default=True` haben
- **THEN** SHALL bei Setzen von `is_default=True` auf einer Portion alle anderen Portionen derselben Zutat auf `is_default=False` gesetzt werden

#### Scenario: Portions sortiert nach Priorität
- **WHEN** Portionen einer Zutat abgefragt werden
- **THEN** SHALL die Sortierung nach `priority` (absteigend), dann `rank` (aufsteigend) erfolgen

## ADDED Requirements

### Requirement: Portion-Priorität API
Die Portion-API SHALL das Setzen und Ändern von `priority` und `is_default` unterstützen.

#### Scenario: Portion-Priorität setzen
- **WHEN** ein Nutzer `PATCH /api/ingredients/{slug}/portions/{id}/` mit `priority` und/oder `is_default` sendet
- **THEN** SHALL die Priorität aktualisiert werden
- **THEN** SHALL bei `is_default=true` alle anderen Portionen derselben Zutat auf `is_default=false` gesetzt werden

#### Scenario: Portion erstellen mit Priorität
- **WHEN** ein Nutzer `POST /api/ingredients/{slug}/portions/` mit `priority` und `is_default` sendet
- **THEN** SHALL die Portion mit der angegebenen Priorität erstellt werden
- **THEN** SHALL `priority` den Default-Wert 0 und `is_default` den Default-Wert False haben, wenn nicht angegeben
