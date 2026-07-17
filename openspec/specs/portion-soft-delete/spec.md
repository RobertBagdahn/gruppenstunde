## ADDED Requirements

### Requirement: Soft-Delete für Portionen
Portionen können soft-gelöscht werden. Eine gelöschte Portion bleibt in der Datenbank, wird aber in Listings und Auswahllisten nicht mehr angezeigt. Ist die zu löschende Portion noch von mindestens einem `RecipeItem` referenziert, MUSS das System diese RecipeItems zuerst automatisch auf die aktuell gültige `rank=1`-Portion derselben Zutat umhängen (Gramm-Menge erhalten), bevor die Portion soft-gelöscht wird.

#### Scenario: Portion ohne Referenzen löschen
- **WHEN** ein Benutzer eine Portion über `DELETE /api/supply/ingredients/{slug}/portions/{portion_id}/` löscht und kein RecipeItem sie referenziert
- **THEN** wird `deleted_at` auf den aktuellen Zeitstempel gesetzt und 204 zurückgegeben

#### Scenario: Portion mit RecipeItem-Referenzen löschen
- **WHEN** ein Benutzer eine Portion löscht, die von mindestens einem `RecipeItem` referenziert wird
- **THEN** MUSS das System zuerst jedes referenzierende RecipeItem auf die aktuell gültige `rank=1`-Portion derselben Zutat umhängen
- **THEN** MUSS die `quantity` jedes umgehängten RecipeItems so umgerechnet werden, dass die ursprüngliche Gramm-Menge erhalten bleibt
- **THEN** wird die Portion anschließend wie gewohnt soft-gelöscht (`deleted_at` gesetzt) und 204 zurückgegeben

#### Scenario: Zu löschende Portion ist selbst die einzige rank=1-Portion
- **WHEN** die zu löschende, referenzierte Portion selbst `rank=1` ist und keine andere aktive Portion derselben Zutat existiert
- **THEN** MUSS das Löschen mit einer verständlichen Fehlermeldung abgelehnt werden, da kein Rebind-Ziel existiert

#### Scenario: Gelöschte Portionen aus Listing ausblenden
- **WHEN** Portionen über `GET /api/supply/ingredients/{slug}/portions/` abgefragt werden
- **THEN** werden nur Portionen mit `deleted_at IS NULL` zurückgegeben

#### Scenario: Gelöschte Portion nicht in Auswahllisten
- **WHEN** ein Benutzer eine Portion für ein neues RecipeItem auswählt
- **THEN** erscheinen nur aktive Portionen (deleted_at IS NULL) in der Auswahl
