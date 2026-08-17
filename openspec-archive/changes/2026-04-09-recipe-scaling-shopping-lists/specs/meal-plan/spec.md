## ADDED Requirements

### Requirement: Export-Button auf MealEvent-Detailseite
Die MealEvent-Detailseite SHALL einen "Einkaufsliste erstellen"-Button anzeigen, der die aggregierte Einkaufsliste als persistente ShoppingList exportiert.

#### Scenario: Einkaufsliste aus MealEvent erstellen
- **WHEN** ein authentifizierter Nutzer auf der MealEvent-Detailseite "Einkaufsliste erstellen" klickt
- **THEN** SHALL die Shopping-List-API `POST /api/shopping-lists/from-meal-event/{id}/` aufgerufen werden
- **THEN** SHALL der MealEvent-Skalierungsfaktor (norm_portions * activity_factor * reserve_factor) angewendet werden
- **THEN** SHALL der Nutzer zur erstellten Einkaufsliste weitergeleitet werden

### Requirement: Skalierte Mengen in MealEvent-Shopping-Ansicht
Die bestehende Shopping-List-Ansicht im MealEvent SHALL die intelligente Einheiten-Umrechnung und natürliche Portionsanzeige verwenden.

#### Scenario: Shopping-Ansicht mit Einheiten-Umrechnung
- **WHEN** ein Nutzer die Shopping-List eines MealEvents ansieht (`GET /api/meal-events/{id}/shopping-list/`)
- **THEN** SHALL die Response zusätzlich `display_quantity` (formatierte Anzeige mit intelligenter Einheit) und `natural_portions` (Liste der natürlichen Portionsangaben) pro Item enthalten

#### Scenario: Echtzeit-Update bei Faktor-Änderung
- **WHEN** ein Nutzer `norm_portions`, `activity_factor` oder `reserve_factor` im MealEvent ändert
- **THEN** SHALL die Shopping-List-Ansicht mit den neuen Mengen aktualisiert werden
