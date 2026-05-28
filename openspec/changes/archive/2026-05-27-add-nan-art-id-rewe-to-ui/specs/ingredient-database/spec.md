## MODIFIED Requirements

### Requirement: REWE Artikelnummer über API exponieren

Das Feld `nan_art_id_rewe` wird in den API-Response- und Request-Schemas für Ingredients aufgenommen.

#### Scenario: Ingredient abrufen mit REWE Artikelnummer
- **WHEN** ein Ingredient mit gesetzter `nan_art_id_rewe` über GET `/api/supply/ingredients/{id}` abgerufen wird
- **THEN** enthält die Response das Feld `nan_art_id_rewe` mit dem gespeicherten Wert

#### Scenario: Ingredient ohne REWE Artikelnummer
- **WHEN** ein Ingredient ohne `nan_art_id_rewe` abgerufen wird
- **THEN** ist `nan_art_id_rewe` im Response `null`

#### Scenario: Ingredient erstellen/bearbeiten mit REWE Artikelnummer
- **WHEN** ein Ingredient via POST/PATCH mit `nan_art_id_rewe` erstellt/bearbeitet wird
- **THEN** wird der Wert gespeichert

### Requirement: REWE Artikelnummer im UI anzeigen

#### Scenario: Detail-Seite mit REWE Artikelnummer
- **WHEN** ein Ingredient mit `nan_art_id_rewe` auf der Detail-Seite angezeigt wird
- **THEN** erscheint im Referenzen-Block eine Zeile "REWE Artikelnr." mit dem Wert

#### Scenario: Detail-Seite ohne REWE Artikelnummer
- **WHEN** `nan_art_id_rewe` null ist
- **THEN** wird die Zeile nicht angezeigt

### Requirement: REWE Artikelnummer im Formular editierbar

#### Scenario: Create/Edit-Formular
- **WHEN** das Ingredient-Formular angezeigt wird
- **THEN** gibt es ein Eingabefeld für "REWE Artikelnr." im Referenzen-Abschnitt
