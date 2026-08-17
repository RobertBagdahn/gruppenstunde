## ADDED Requirements

### Requirement: Soft-Delete für Portionen
Portionen können soft-gelöscht werden. Eine gelöschte Portion bleibt in der Datenbank, wird aber in Listings und Auswahllisten nicht mehr angezeigt.

#### Scenario: Portion löschen
- **WHEN** ein Benutzer eine Portion über `DELETE /api/supply/ingredients/{slug}/portions/{portion_id}/` löscht
- **THEN** wird `deleted_at` auf den aktuellen Zeitstempel gesetzt und 204 zurückgegeben, unabhängig von bestehenden RecipeItem-Referenzen

#### Scenario: Gelöschte Portionen aus Listing ausblenden
- **WHEN** Portionen über `GET /api/supply/ingredients/{slug}/portions/` abgefragt werden
- **THEN** werden nur Portionen mit `deleted_at IS NULL` zurückgegeben

#### Scenario: RecipeItem mit gelöschter Portion
- **WHEN** ein RecipeItem eine soft-gelöschte Portion referenziert
- **THEN** wird der Portion-Name weiterhin korrekt angezeigt (keine Einschränkung)

#### Scenario: Gelöschte Portion nicht in Auswahllisten
- **WHEN** ein Benutzer eine Portion für ein neues RecipeItem auswählt
- **THEN** erscheinen nur aktive Portionen (deleted_at IS NULL) in der Auswahl
