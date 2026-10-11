## ADDED Requirements

### Requirement: Einheit einer Einzelzutat nach dem Hinzufügen ändern

In einer bearbeitbaren, nicht synchronisierten Mahlzeit SHALL die Tages- und Tabellenansicht für Einzelzutaten einen Einheitenwechsel anbieten. Die Auswahl SHALL aktive Portionen und anwendbare Standardmaße der betreffenden Zutat enthalten. Ein reiner Einheitenwechsel (ohne neue Mengenangabe) SHALL sofort gespeichert werden: Die bisherige vertrauenswürdige Grammmenge bleibt erhalten und wird vom Backend in die neue Einheit umgerechnet (drei Nachkommastellen); danach erscheint „Einheit geändert“ mit „Rückgängig“. Einheiten ohne vertrauenswürdiges Gewicht werden nicht umgerechnet, sondern wie bisher erst mit einer bestätigten Menge gespeichert („Gewicht ergänzen“). Wenn der Nutzer eine neue Menge eingibt, gilt diese Menge in der ausgewählten Einheit. Rezept-Items und synchronisierte Mahlzeiten SHALL keinen speichernden Einheitenwechsel anbieten.

#### Scenario: Gramm-Eintrag zu Stück ändern

- **GIVEN** ein bearbeitbarer Plan enthält 55 g einer Einzelzutat und derselben Zutat ist eine bestätigte Portion „Stück“ mit 100 g zugeordnet
- **WHEN** der Nutzer im Einheiten-Umschalter „Stück“ wählt, ohne eine neue Menge einzugeben
- **THEN** SHALL das MealItem sofort die Stück-Portion ohne Maßeinheit speichern
- **AND** SHALL die Menge als 0,55 Stück berechnet und „0,55 Stück (55 g)“ angezeigt werden
- **AND** SHALL das Gewicht und die Nährwertberechnung weiterhin 55 g ergeben
- **AND** SHALL „Einheit geändert“ mit „Rückgängig“ erscheinen, das wieder 55 g speichert

#### Scenario: Portion gehört zu anderer Zutat

- **GIVEN** ein Client sendet eine fremde oder inaktive Portion-ID beim Einheitenwechsel
- **WHEN** das MealItem aktualisiert wird
- **THEN** SHALL der Server HTTP 422 antworten und die bisherige Einheit unverändert lassen

#### Scenario: View-only oder synchronisierte Mahlzeit

- **GIVEN** die Mahlzeit ist synchronisiert oder der Nutzer hat keine Bearbeitungsrechte
- **WHEN** die Zeile gerendert wird
- **THEN** SHALL kein speichernder Einheitenwechsel angeboten werden; der Umschalter ändert nur die Anzeige
