## ADDED Requirements

### Requirement: Refurbish liefert Zutaten-Vorschläge für Rezepte
Der AI-Refurbish-Endpoint liefert bei `content_type="recipe"` zusätzlich zu den Standard-Feldern eine Liste vorgeschlagener Zutaten mit Name, Menge, Einheit und optionaler DB-Referenz.

#### Scenario: Rezept-Refurbish mit Zutaten
- **WHEN** User sendet Freitext mit `content_type="recipe"` an `/api/content/ai/refurbish/`
- **THEN** Response enthält `suggested_ingredients` Array mit Objekten `{name, quantity, unit, ingredient_id?, ingredient_slug?, matched_name?}`

#### Scenario: Nicht-Rezept Refurbish bleibt unverändert
- **WHEN** User sendet Freitext mit `content_type="session"` an `/api/content/ai/refurbish/`
- **THEN** Response enthält `suggested_ingredients: []` (leeres Array)

#### Scenario: Zutaten-Extraktion schlägt fehl
- **WHEN** `suggest_recipe_supplies()` wirft eine Exception
- **THEN** Refurbish-Response wird trotzdem erfolgreich zurückgegeben mit `suggested_ingredients: []`

---

### Requirement: Zutaten im Wizard bearbeitbar
In Schritt 2 des Rezept-Erstellungs-Wizards werden vorgeschlagene Zutaten in einer bearbeitbaren Liste angezeigt.

#### Scenario: Zutaten werden angezeigt
- **WHEN** AI-Refurbish `suggested_ingredients` zurückgibt
- **THEN** Schritt 2 zeigt eine "Zutaten"-Sektion mit allen vorgeschlagenen Zutaten (Name, Menge, Einheit)

#### Scenario: Zutat entfernen
- **WHEN** User klickt auf Entfernen-Button einer Zutat
- **THEN** Zutat wird aus der Liste entfernt

#### Scenario: Menge/Einheit bearbeiten
- **WHEN** User ändert Menge oder Einheit einer Zutat
- **THEN** Änderung wird im lokalen State gespeichert

#### Scenario: Neue Zutat hinzufügen
- **WHEN** User nutzt "Zutat hinzufügen" mit Autocomplete
- **THEN** Ausgewählte Zutat wird der Liste hinzugefügt (mit `ingredient_id` aus DB)

---

### Requirement: Zutaten beim Speichern als RecipeItems anlegen
Beim Speichern des Rezepts werden alle bearbeiteten Zutaten mit gültiger `ingredient_id` als `RecipeItem`s angelegt.

#### Scenario: Zutaten mit DB-Match werden gespeichert
- **WHEN** Rezept wird gespeichert und Zutat hat `ingredient_id != null`
- **THEN** Ein `RecipeItem` wird angelegt mit `ingredient_id`, `quantity`, `measuring_unit`

#### Scenario: Zutaten ohne DB-Match werden übersprungen
- **WHEN** Rezept wird gespeichert und Zutat hat `ingredient_id == null`
- **THEN** Zutat wird nicht als `RecipeItem` angelegt
