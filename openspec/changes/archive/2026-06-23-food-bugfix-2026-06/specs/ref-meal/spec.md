## MODIFIED Requirements

### Requirement: „Für alle übernehmen"-Button propagiert Änderungen an alle synchronisierten Mahlzeiten

Der „Für alle übernehmen"-Button auf einer Referenzmahlzeit SHALL einen API-Call auslösen der alle `is_synced=True`-Mahlzeiten mit den Inhalten der Referenzmahlzeit aktualisiert. Nach dem API-Call SHALL der TanStack Query Cache für den betroffenen Essensplan invalidiert werden, sodass die Änderungen sofort sichtbar sind.

#### Scenario: Für-alle-übernehmen erfolgreich

- **WHEN** der Nutzer auf „Für alle übernehmen" klickt
- **THEN** wird `POST /api/meal-plans/{plan_id}/ref-meals/{ref_meal_id}/apply/` aufgerufen
- **THEN** alle Mahlzeiten mit `ref_meal=ref_meal_id` und `is_synced=True` erhalten die gleichen MealItems wie die Referenzmahlzeit
- **THEN** die Essensplan-Ansicht aktualisiert sich sofort (Cache-Invalidierung)

#### Scenario: Feedback nach erfolgreichem Sync

- **WHEN** der Sync erfolgreich abgeschlossen ist
- **THEN** erscheint eine Toast-Meldung: „{N} Mahlzeiten wurden aktualisiert"

#### Scenario: Keine synchronisierten Mahlzeiten

- **WHEN** der Nutzer auf „Für alle übernehmen" klickt aber keine `is_synced=True`-Mahlzeiten existieren
- **THEN** erscheint ein Hinweis: „Keine synchronisierten Mahlzeiten vorhanden"
