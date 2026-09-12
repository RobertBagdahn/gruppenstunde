# breakfast-wizard Specification

## Purpose

Frühstücks-Wizard für RefMeals und direkte Meals mit Basis-, Fett-, Belag-, Extras-, Getränke-
und Cockpit-Schritten.
## Requirements
### Requirement: Einstieg und Rehydration

Der Wizard SHALL über die bestehenden RefMeal- und DirectMeal-Routen erreichbar sein. Bestehende
RefMeal-Daten werden nach dem asynchronen Laden von Plan und Katalog vollständig rehydriert;
Defaults dürfen sie nicht überschreiben. Abbrechen im RefMeal-Edit-Modus verwirft Änderungen und
kehrt zur Vorschau zurück.

#### Scenario: Bestehende Daten bleiben erhalten
- **WHEN** Plan, Katalog und RefMeal asynchron geladen wurden
- **THEN** zeigt der Wizard die gespeicherten Werte statt Defaults

#### Scenario: Wizard für vorhandenes RefMeal vollständig vorausgefüllt öffnen
- **WHEN** ein RefMeal für Frühstück und der Katalog geladen sind
- **THEN** öffnet sich der Wizard mit rekonstruierten Mengen und Verteilungen für Basis, Belag, Streichfett und Getränke

#### Scenario: Getränkerezepte werden korrekt erkannt
- **WHEN** ein gespeichertes Frühstück ein Rezept mit `recipe_type="drink"` enthält
- **THEN** wird es beim Rehydratisieren als Getränk eingeordnet

#### Scenario: Abbrechen im Edit-Mode kehrt zur Vorschau zurück
- **WHEN** der Nutzer einen bestehenden Wizard abbricht
- **THEN** navigiert das System zurück zur Vorschau und ändert das RefMeal nicht

### Requirement: Verteilungen und Streichfett

Der Wizard SHALL den 1-Screen-Baukasten als Standard-Planungsoberfläche anbieten und die 6-Schritte-Aufteilung (`basis, fett, belag, extras, getraenke, cockpit`) als optionalen Expertenmodus für Feinjustierungen vorhalten. Basis-, Belag- und Fettanteile ergeben im Expertenmodus zusammen je 100 %. Basis und Fett werden mit Gramm, kcal und Kosten angezeigt und als MealItems gespeichert.

#### Scenario: Standardmäßiger 1-Screen-Einstieg
- **WHEN** der Frühstücks-Assistent geöffnet wird
- **THEN** erscheint der 1-Screen-Baukasten mit den 4 Hauptkategorien
- **AND** der 6-Schritte-Modus kann über den Experten-Schalter aktiviert werden

#### Scenario: Sechs Schritte
- **WHEN** der Expertenmodus des Wizards geöffnet wird
- **THEN** erscheinen Basis, Fett, Belag, Extras, Getränke und Cockpit in dieser Reihenfolge

### Requirement: Kcal-Berechnung

Brot-kcal SHALL aus der Gramm-Menge berechnet werden; Fett-kcal aus der Fettabdeckung; Belag-kcal
sind der verbleibende verteilbare Wert. Portionshinweise verwenden die zentrale
„Gramm zuerst, Portion sekundär“-Konvention.

#### Scenario: Belag erhält den Restwert
- **WHEN** Brot- und Fett-kcal feststehen
- **THEN** entsprechen die Belag-kcal dem verbleibenden verteilbaren Wert

### Requirement: Getränke

Getränke SHALL ausschließlich `drinkRecipeIds` und `drinkFactors` verwenden, aus dem
`breakfast-drink`-Katalog gewählt, aus Rezept-Cachedaten berechnet und beim Speichern als
Recipe-MealItems angelegt. Details zu State, Katalog und Berechnung stehen in
`breakfast-drink-recipes`.

#### Scenario: Rezeptbasierte Getränke
- **WHEN** ein Getränk ausgewählt und gespeichert wird
- **THEN** wird es als Recipe-MealItem mit seinem Faktor persistiert
