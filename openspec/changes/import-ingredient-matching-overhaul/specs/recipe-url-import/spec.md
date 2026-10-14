## ADDED Requirements

### Requirement: Chefkoch-Zutatentabelle als Primärquelle
Für Seiten von chefkoch.de SHALL der Import die Zutatentabelle (`ds-ingredients-table`) auslesen: Mengenzelle (Menge und Einheit), Zutatenname und Eigenschaften getrennt, Gruppenüberschriften als Abschnitt. JSON-LD `recipeIngredient` MUST nur Fallback sein. Titel, Portionen und Schritte MUST weiterhin aus JSON-LD kommen, falls vorhanden.

#### Scenario: Seite ohne JSON-LD
- **GIVEN** eine Chefkoch-Seite im neuen Layout ohne JSON-LD
- **WHEN** sie importiert wird
- **THEN** werden die Zutaten aus der Tabelle übernommen statt „Kein Rezept gefunden“ zu melden

#### Scenario: Getrennte Zellen
- **GIVEN** eine Tabellenzeile mit Mengenzelle `1 Zweig/e` und Name `Thymian`
- **WHEN** sie importiert wird
- **THEN** ist Menge 1, Einheit `Zweig`, Name `Thymian`
