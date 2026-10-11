## ADDED Requirements

### Requirement: Eine aktive Zutatportion im MealItem ändern

Der Essensplan SHALL einen bearbeitenden Nutzer erlauben, die Einheit eines bestehenden Einzelzutaten-MealItems zu einer anderen aktiven Portion derselben Zutat, einem Standardmaß oder Gramm/Milliliter zu ändern (Einheitenmodell nach `switchable-quantity-units`). Die API SHALL eine fremde/inaktive Portion oder eine Einheit auf einem Rezept-Item mit HTTP 422 ablehnen. Wählt der Nutzer nur eine Einheit, ohne eine neue Menge einzugeben, SHALL das Frontend den Wechsel sofort speichern (PATCH nur mit Einheit), und das Backend SHALL bei gleichem Gewicht umrechnen: neue Menge = bisherige vertrauenswürdige Gramm ÷ Gramm einer Zieleinheit, gerundet auf drei Nachkommastellen. Nährwerte, Kosten und Einkaufsmengen bleiben im Rahmen dieser Rundung gleich. Danach SHALL ein Hinweis „Einheit geändert“ mit „Rückgängig“ erscheinen, der Einheit und Menge exakt wiederherstellt. Fehlt der Zieleinheit oder dem Eintrag ein vertrauenswürdiges Gewicht, wird nicht umgerechnet; die Einheit wird dann wie bisher erst mit einer bestätigten Menge gespeichert („Gewicht fehlt“/„Gewicht ergänzen“). Wird zugleich eine neue Menge gesendet, gilt diese Menge in der gewählten neuen Einheit. Nutzer ohne Bearbeitungsrecht und synchronisierte Mahlzeiten können die Einheit nur für die Anzeige umschalten.

#### Scenario: Einheit im Plan wechseln

- **GIVEN** ein editierbares MealItem enthält 55 g einer Zutat und diese hat eine bestätigte Portion „Stück“ mit 100 g
- **WHEN** der Nutzer „Stück“ auswählt und keine neue Menge eingibt
- **THEN** SHALL das MealItem sofort `portion_id` = „Stück“ ohne Maßeinheit speichern
- **AND** SHALL die neue Portionsmenge 0,55 Stück betragen („0,55 Stück (55 g)“)
- **AND** SHALL die Nährwert-/Gewichtsberechnung weiterhin 55 g verwenden
- **AND** SHALL ein Hinweis „Einheit geändert“ mit „Rückgängig“ erscheinen

#### Scenario: Einheitenwechsel rückgängig machen

- **GIVEN** das MealItem wurde durch einen Einheitenwechsel von 55 g auf 0,55 Stück umgestellt
- **WHEN** der Nutzer im Hinweis „Rückgängig“ wählt
- **THEN** SHALL das MealItem wieder 55 g in Gramm speichern

#### Scenario: Zieleinheit ohne Gewicht

- **GIVEN** die gewählte Portion hat kein vertrauenswürdiges Gewicht
- **WHEN** der Nutzer sie auswählt, ohne eine Menge einzugeben
- **THEN** SHALL nichts gespeichert werden, bis der Nutzer eine Menge bestätigt
- **AND** SHALL ein Client, der ohne Menge und ohne bekanntes Gewicht wechselt, HTTP 422 erhalten

#### Scenario: Ungültige Portion beim Ändern

- **GIVEN** ein Client sendet eine inaktive oder einer anderen Zutat gehörende Portion
- **WHEN** er das MealItem aktualisiert
- **THEN** SHALL die API HTTP 422 zurückgeben
- **AND** SHALL Portion, Einheit und Menge des MealItems unverändert lassen
