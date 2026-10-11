## ADDED Requirements

### Requirement: Einheit einer Einzelzutat nach dem Hinzufügen ändern

In einer bearbeitbaren, nicht synchronisierten Mahlzeit SHALL die Tages- und Tabellenansicht für Einzelzutaten einen Einheitenwechsel anbieten. Die Auswahl SHALL aktive Portionen und anwendbare Standardmaße der betreffenden Zutat enthalten. Beim reinen Einheitenwechsel wird die bisherige vertrauenswürdige Grammmenge erhalten und in die neue Portion konvertiert; wenn der Nutzer gleichzeitig eine neue Menge eingibt, gilt diese Menge in der ausgewählten Einheit. Rezept-Items und synchronisierte Mahlzeiten SHALL keinen Einheitenwechsel anbieten.

#### Scenario: Gramm-Eintrag zu Stück ändern

- **GIVEN** ein bearbeitbarer Plan enthält 55 g einer Einzelzutat und derselben Zutat ist eine bestätigte Portion „Stück“ mit 55 g zugeordnet
- **WHEN** der Nutzer „Einheit ändern“ wählt und „Stück“ ohne neue Mengenangabe übernimmt
- **THEN** SHALL das MealItem die Stück-Portion und deren Maßeinheit speichern
- **AND** SHALL die Menge als 1 Stück berechnet werden
- **AND** SHALL das Gewicht und die Nährwertberechnung weiterhin 55 g ergeben

#### Scenario: Portion gehört zu anderer Zutat

- **GIVEN** ein Client sendet eine fremde oder inaktive Portion-ID beim Einheitenwechsel
- **WHEN** das MealItem aktualisiert wird
- **THEN** SHALL der Server HTTP 422 antworten und die bisherige Einheit unverändert lassen

#### Scenario: View-only oder synchronisierte Mahlzeit

- **GIVEN** die Mahlzeit ist synchronisiert oder der Nutzer hat keine Bearbeitungsrechte
- **WHEN** die Zeile gerendert wird
- **THEN** SHALL kein interaktiver Einheitenwechsel angeboten werden
