## MODIFIED Requirements

### Requirement: Variantenbearbeitung
Das Frontend SHALL Varianten derselben `variant_group_id` gruppiert anzeigen und den Faktor über den bestehenden MealItem-PATCH-Endpoint bearbeiten können. Eine direkte Rezeptzutat-Ersetzung DARF keine Austauschgruppe erzeugen oder bestehende Variantengruppen verändern.

#### Scenario: Direkte Ersetzung
- **WHEN** ein Nutzer eine generische Rezeptzutat durch eine konkrete Zutat ersetzt
- **THEN** bleibt die RecipeItem-Zeile außerhalb einer Austauschgruppe oder in ihrer bestehenden Gruppe unverändert gruppiert
- **THEN** wird keine neue Alternative automatisch angelegt

#### Scenario: Echte Alternative
- **WHEN** ein Nutzer ausdrücklich „Alternative hinzufügen“ auswählt
- **THEN** wird weiterhin eine Austauschgruppe nach der bestehenden Variantenlogik verwendet
