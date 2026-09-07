### Requirement: Vollständige Cache-Invalidierung bei Planer-Mutationen
Das Food-Frontend SHALL bei jeder Mutation von Mahlzeiten, Tagen, Rezept-Zuweisungen oder Plan-Einstellungen alle abhängigen Abfragen invalidieren, sodass Tabs für Einkaufsliste, Nährwert-Zusammenfassung, Kosten-Cockpit und Prüfungen/Vorschläge synchron den aktuellen Planungsstand reflektieren.

#### Scenario: Rezept zu Mahlzeit hinzugefügt
- **GIVEN** ein Nutzer befindet sich auf der Planer-Übersicht eines Essensplans
- **WHEN** ein Rezept zu einer Mahlzeit hinzugefügt wird (`useAddMealItem`)
- **THEN** SHALL das Frontend neben `meal-plan` auch `meal-plan-shopping`, `meal-plan-costs`, `meal-plan-nutrition`, `meal-plan-suggestions` und `cooking-schedule` invalidieren

#### Scenario: Mahlzeit-Löschung erfordert Bestätigung
- **GIVEN** ein Nutzer klickt auf das Löschen-Icon einer Mahlzeit oder eines Rezept-Items im Plan
- **WHEN** die Aktion ausgelöst wird
- **THEN** SHALL das UI einen Bestätigungsdialog anzeigen und die Mutation erst nach expliziter Bestätigung absenden
