## ADDED Requirements

### Requirement: Auto-add ingredient after return from creation
Wenn der `InlineIngredientEditor` einen `?newIngredientSlug=<slug>` Query-Parameter in der URL erkennt, SHALL die Zutat geladen und �ber den `IngredientQuantityDialog` zum Rezept hinzugef�gt werden.

#### Scenario: newIngredientSlug-Parameter erkannt
- **WHEN** die Seite mit `?newIngredientSlug=haferflocken` geladen wird und der `InlineIngredientEditor` aktiv ist
- **THEN** SHALL das System die Zutat per `GET /api/ingredients/haferflocken/` laden (mit auth Cookie)
- **THEN** SHALL das System die Portionen der Zutat per `GET /api/ingredients/haferflocken/portions/` laden
- **THEN** SHALL der `IngredientQuantityDialog` mit den geladenen Portionen ge�ffnet werden
- **THEN** die Portion mit dem h�chsten `priority`-Wert SHALL vorausgew�hlt sein

#### Scenario: QuantityDialog best�tigt
- **WHEN** der Nutzer im `IngredientQuantityDialog` Menge und Portion best�tigt
- **THEN** SHALL die Zutat mit der gew�hlten Menge und Portion zu `editItems` hinzugef�gt werden
- **THEN** der `?newIngredientSlug=` Parameter SHALL aus der URL entfernt werden (via `replaceState`)

#### Scenario: QuantityDialog abgebrochen
- **WHEN** der Nutzer den `IngredientQuantityDialog` abbricht
- **THEN** SHALL die Zutat NICHT hinzugef�gt werden
- **THEN** der `?newIngredientSlug=` Parameter SHALL aus der URL entfernt werden (via `replaceState`)

#### Scenario: newIngredientSlug verweist auf ung�ltige Zutat
- **WHEN** der `newIngredientSlug` auf keine existierende Zutat verweist (API gibt 404)
- **THEN** SHALL das System den Parameter still ignorieren (kein Fehler-Toast, kein Crash)
- **THEN** der `?newIngredientSlug=` Parameter SHALL aus der URL entfernt werden

#### Scenario: Auth required for ingredient fetch
- **WHEN** der Nutzer nicht authentifiziert ist und `newIngredientSlug` gelesen wird
- **THEN** SHALL die API-Anfrage mit 403 fehlschlagen
- **THEN** das System SHALL den Parameter still ignorieren und aus der URL entfernen
