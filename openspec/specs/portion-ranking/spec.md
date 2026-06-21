### Requirement: Portionen-Reihenfolge per Buttons ändern
Das System MUSS dem Nutzer ▲/▼ Buttons pro Portion anzeigen, mit denen die Sortierreihenfolge geändert werden kann.

#### Scenario: Portion nach oben verschieben
- **WHEN** der Nutzer auf den ▲-Button einer Portion klickt die nicht bereits an erster Stelle steht
- **THEN** tauscht die Portion ihren `rank`-Wert mit der darüberliegenden Portion
- **THEN** wird die Liste sofort in neuer Reihenfolge angezeigt (optimistic update)

#### Scenario: Portion nach unten verschieben
- **WHEN** der Nutzer auf den ▼-Button einer Portion klickt die nicht bereits an letzter Stelle steht
- **THEN** tauscht die Portion ihren `rank`-Wert mit der darunterliegenden Portion
- **THEN** wird die Liste sofort in neuer Reihenfolge angezeigt

#### Scenario: Button deaktiviert an Grenzen
- **WHEN** eine Portion an erster Stelle steht
- **THEN** ist der ▲-Button deaktiviert (disabled)
- **WHEN** eine Portion an letzter Stelle steht
- **THEN** ist der ▼-Button deaktiviert (disabled)

### Requirement: Verständliche Gewichtsanzeige
Das System MUSS das berechnete Gewicht einer Portion klar und verständlich anzeigen.

#### Scenario: Portion mit berechnetem Gewicht
- **WHEN** eine Portion mit `weight_g > 0` angezeigt wird
- **THEN** wird `≈ {weight_g}g` neben dem Portionsnamen angezeigt

#### Scenario: Basis-Portion "g"
- **WHEN** die Portion den Namen "g" hat und `weight_g = 1`
- **THEN** wird keine zusätzliche Gewichtsinfo angezeigt (wäre redundant)

### Requirement: Klares Quantity-Label im Edit-Modus
Das System MUSS das Quantity-Eingabefeld im Bearbeitungsmodus mit einem verständlichen Placeholder versehen.

#### Scenario: Edit-Modus geöffnet
- **WHEN** der Nutzer eine Portion bearbeitet
- **THEN** zeigt das Quantity-Feld den Placeholder "Anzahl" an

### Requirement: Primäre Anzeigeauswahl nach Priority-Feld
Die Auswahl der "primären" Portion für die Anzeige in `IngredientList` MUST explizit nach dem `priority`-Feld des `Portion`-Modells erfolgen: Die Portion mit dem höchsten `priority`-Wert, die eine bekannte `weight_g > 0` hat und keine Gramm-Basiseinheit ist, wird als primäre Anzeigeeinheit gewählt.

Gramm-Portionen (Einheit `g`, `Gramm`, `kg`, `Kilogramm`, `ml`, `Milliliter`, `l`, `Liter`) MUST als Gramm-Basiseinheiten klassifiziert werden und dürfen nicht als nicht-Gramm-Primäranzeige gewählt werden.

#### Scenario: Mehrere Portionen mit unterschiedlichen Prioritäten
- **WHEN** ein Ingredient die Portionen `[{name: "Stück", priority: 10}, {name: "EL", priority: 5}, {name: "100g", priority: 0}]` hat
- **THEN** wird `Stück` (priority: 10) als Primäranzeige gewählt

#### Scenario: Alle Portionen sind Gramm-basiert
- **WHEN** ein Ingredient nur Gramm-basierte Portionen hat (z.B. Salz mit nur `g`-Portionen)
- **THEN** wird Gramm als einzige Anzeige verwendet, keine nicht-Gramm-Primäranzeige

#### Scenario: Portion ohne weight_g wird übersprungen
- **WHEN** die höchstpriorisierte Portion `weight_g: null` hat
- **THEN** wird die nächste Portion mit bekanntem `weight_g > 0` verwendet
