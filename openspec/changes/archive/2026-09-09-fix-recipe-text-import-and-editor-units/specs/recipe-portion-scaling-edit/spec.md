## ADDED Requirements

### Requirement: Konsistente Einheitenanzeige im Inline-Editor
Der `InlineIngredientEditor` SHALL sicherstellen, dass der im Mengenfeld angezeigte Zahlenwert mit der im Dropdown ausgewählten Einheit übereinstimmt. Für portionierte Einheiten (z. B. `Esslöffel`, `Teelöffel`, `Stück`, `Prise`) SHALL der Wert die Anzahl der Einheiten darstellen und nicht das Gesamtgewicht in Gramm.

#### Scenario: Esslöffel-Zutat zeigt Einheitenanzahl
- **WHEN** ein RecipeItem mit `1 EL Butter` (Portion `Esslöffel`, 15g) im `InlineIngredientEditor` geladen wird
- **THEN** SHALL das Mengen-Inputfeld den Wert `1` anzeigen
- **THEN** SHALL das Einheiten-Dropdown `Esslöffel` anzeigen
- **THEN** SHALL das Mengen-Inputfeld nicht den Wert `15` anzeigen

#### Scenario: Speichern behält gewählte Portionsmultiplikatoren
- **WHEN** der Nutzer ein Rezept im `InlineIngredientEditor` speichert
- **THEN** SHALL die Menge für Portions-Einheiten proportional zur gewählten Einheit und Personenzahl normiert gespeichert werden
- **THEN** SHALL keine unbeabsichtigte Multiplikation mit dem Portionsgewicht stattfinden
