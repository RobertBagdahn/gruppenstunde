## ADDED Requirements

### Requirement: Eine aktive Zutatportion im MealItem ändern

Der Essensplan SHALL einen bearbeitenden Nutzer erlauben, die Portion eines bestehenden Einzelzutaten-MealItems zu einer anderen aktiven Portion derselben Zutat zu ändern. Die API SHALL Portion und zugehörige Maßeinheit zusammen speichern und eine fremde/inaktive Portion oder eine Portion auf einem Rezept-Item mit HTTP 422 ablehnen. Bei einem reinen Einheitenwechsel ohne neue Mengenangabe SHALL das Backend die bisherige vertrauenswürdige Gramm-Menge erhalten und die Menge in der neuen Portion berechnen. Wird zugleich eine neue Menge gesendet, gilt diese Menge in der gewählten neuen Einheit.

#### Scenario: Einheit im Plan wechseln

- **GIVEN** ein editierbares MealItem enthält 55 g einer Zutat und diese hat eine bestätigte Portion „Stück“ mit 55 g
- **WHEN** der Nutzer „Stück“ auswählt und keine neue Menge eingibt
- **THEN** SHALL das MealItem `portion_id` und die zur Stückportion gehörende Einheit speichern
- **AND** SHALL die neue Portionsmenge 1 Stück betragen
- **AND** SHALL die Nährwert-/Gewichtsberechnung weiterhin 55 g verwenden

#### Scenario: Ungültige Portion beim Ändern

- **GIVEN** ein Client sendet eine inaktive oder einer anderen Zutat gehörende Portion
- **WHEN** er das MealItem aktualisiert
- **THEN** SHALL die API HTTP 422 zurückgeben
- **AND** SHALL Portion, Einheit und Menge des MealItems unverändert lassen
