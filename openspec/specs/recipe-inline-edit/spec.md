### Requirement: Standard-Portion und Menge beim Hinzufügen einer Zutat
Wenn im InlineIngredientEditor eine neue Zutat per Autocomplete hinzugefügt wird, MUST das System automatisch die Portion mit dem höchsten `priority`-Wert aus der API-Antwort vorauswählen und die zugehörige `quantity` auf `1` setzen (nicht auf `0`).

Wenn mehrere Portionen existieren, MUST die mit dem höchsten `priority`-Wert die vorausgewählte sein — unabhängig von `is_default`.

#### Scenario: Zutat mit Stück-Portion höchster Priorität hinzufügen
- **WHEN** der Nutzer "Apfel" per Autocomplete auswählt und der API-Aufruf Portionen `[{id: 5, name: "Stück", priority: 10, weight_g: 150, is_default: true}, {id: 6, name: "100g", priority: 0, weight_g: 100}]` zurückgibt
- **THEN** wird die neue Zeile mit `portion_id: 5`, `quantity: 1`, `measuring_unit_name: "Stück"` vorbefüllt

#### Scenario: Zutat mit Gramm-Portion höchster Priorität hinzufügen
- **WHEN** der Nutzer "Nudeln" auswählt und die höchstpriorisierte Portion `{name: "125g", priority: 8, weight_g: 125}` ist
- **THEN** wird die neue Zeile mit `quantity: 1`, `measuring_unit_name: "g"` vorbefüllt

#### Scenario: Nur eine Portion verfügbar
- **WHEN** eine Zutat genau eine Portion hat
- **THEN** wird diese Portion mit `quantity: 1` vorausgewählt

#### Scenario: Keine Portion gefunden
- **WHEN** der API-Aufruf für Portionen eine leere Liste zurückgibt
- **THEN** zeigt das System einen Toast-Fehler "Keine Portion für diese Zutat gefunden" und fügt die Zutat nicht hinzu

---

### Requirement: Auto-add ingredient after return from creation
Wenn der `InlineIngredientEditor` einen `?newIngredientSlug=<slug>` Query-Parameter in der URL erkennt, SHALL die Zutat geladen und über den `IngredientQuantityDialog` zum Rezept hinzugefügt werden.

#### Scenario: newIngredientSlug-Parameter erkannt
- **WHEN** die Seite mit `?newIngredientSlug=haferflocken` geladen wird und der `InlineIngredientEditor` aktiv ist
- **THEN** SHALL das System die Zutat per `GET /api/ingredients/haferflocken/` laden (mit auth Cookie)
- **THEN** SHALL das System die Portionen der Zutat per `GET /api/ingredients/haferflocken/portions/` laden
- **THEN** SHALL der `IngredientQuantityDialog` mit den geladenen Portionen geöffnet werden
- **THEN** die Portion mit dem höchsten `priority`-Wert SHALL vorausgewählt sein

#### Scenario: QuantityDialog bestätigt
- **WHEN** der Nutzer im `IngredientQuantityDialog` Menge und Portion bestätigt
- **THEN** SHALL die Zutat mit der gewählten Menge und Portion zu `editItems` hinzugefügt werden
- **THEN** der `?newIngredientSlug=` Parameter SHALL aus der URL entfernt werden (via `replaceState`)

#### Scenario: QuantityDialog abgebrochen
- **WHEN** der Nutzer den `IngredientQuantityDialog` abbricht
- **THEN** SHALL die Zutat NICHT hinzugefügt werden
- **THEN** der `?newIngredientSlug=` Parameter SHALL aus der URL entfernt werden (via `replaceState`)

#### Scenario: newIngredientSlug verweist auf ungültige Zutat
- **WHEN** der `newIngredientSlug` auf keine existierende Zutat verweist (API gibt 404)
- **THEN** SHALL das System den Parameter still ignorieren (kein Fehler-Toast, kein Crash)
- **THEN** der `?newIngredientSlug=` Parameter SHALL aus der URL entfernt werden

#### Scenario: Auth required for ingredient fetch
- **WHEN** der Nutzer nicht authentifiziert ist und `newIngredientSlug` gelesen wird
- **THEN** SHALL die API-Anfrage mit 403 fehlschlagen
- **THEN** das System SHALL den Parameter still ignorieren und aus der URL entfernen
