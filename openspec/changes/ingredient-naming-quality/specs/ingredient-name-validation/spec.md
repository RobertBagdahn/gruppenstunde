## ADDED Requirements

### Requirement: Erkennung zu generischer Zutatennamen
Das System SHALL einen Service bereitstellen, der prüft, ob ein Zutatenname (getrimmt, case-insensitive) exakt einem generischen Begriff aus der Liste generischer Begriffe entspricht. Die Prüfung ist nicht-blockierend und dient ausschließlich der Warnung.

#### Scenario: Name entspricht generischem Begriff
- **WHEN** ein Name „Nudeln" geprüft wird und „Nudeln" ein generischer Begriff ist
- **THEN** SHALL die Prüfung als „zu generisch" eingestuft werden

#### Scenario: Name ist spezifisch
- **WHEN** ein Name „Fusilli trocken" geprüft wird und kein generischer Begriff exakt darauf passt
- **THEN** SHALL die Prüfung NICHT als „zu generisch" eingestuft werden

#### Scenario: Groß-/Kleinschreibung und Leerzeichen
- **WHEN** ein Name „  nudeln " geprüft wird und „Nudeln" ein generischer Begriff ist
- **THEN** SHALL die Prüfung trotz abweichender Schreibung/Leerzeichen als „zu generisch" eingestuft werden

### Requirement: Warn-Feld in Zutat-Erstell- und Import-Responses
Das System SHALL in den relevanten Pydantic-Responses (Zutat anlegen/aktualisieren sowie URL-Import-Review-Items) ein nicht-blockierendes Feld `name_warning: str | None` bereitstellen. Bei einem zu generischen Namen enthält es einen deutschen Hinweistext mit Konkretisierungsvorschlag; sonst ist es `null`. Das Feld SHALL 1:1 im Zod-Schema abgebildet werden.

#### Scenario: Warnung bei generischem Namen
- **WHEN** ein authentifizierter Nutzer eine Zutat „Nudeln" anlegt
- **THEN** SHALL die Response `name_warning` mit einem deutschen Text enthalten, der zur Konkretisierung auffordert (z.B. „‚Nudeln' ist zu generisch — bitte konkretisieren, z.B. ‚Fusilli trocken'.")
- **AND** SHALL die Zutat dennoch gespeichert werden (Warnung blockiert nicht)

#### Scenario: Keine Warnung bei spezifischem Namen
- **WHEN** ein authentifizierter Nutzer eine Zutat „Fusilli trocken" anlegt
- **THEN** SHALL `name_warning` in der Response `null` sein

### Requirement: Warnung im Create-Stepper
Das System SHALL im Zutat-Create-Stepper (`frontend-food/src/pages/ingredients/CreateIngredientPage.tsx`) die „zu generisch"-Warnung sichtbar anzeigen, wenn der eingegebene Name einem generischen Begriff entspricht, ohne die Erstellung zu verhindern.

#### Scenario: Warnung im Formular
- **WHEN** ein Nutzer im Create-Stepper den Namen „Pfeffer" eingibt
- **THEN** SHALL eine deutsche Warnung mit Konkretisierungsvorschlag angezeigt werden
- **AND** SHALL der Nutzer dennoch fortfahren können

### Requirement: Warnung im Import-Review
Das System SHALL im URL-Import-Review-Schritt (`frontend-food/src/pages/recipes/RecipeImportPage.tsx`) für jede neu anzulegende Zutat eine „zu generisch"-Warnung anzeigen, wenn ihr Name einem generischen Begriff entspricht, und dem Nutzer ermöglichen, stattdessen eine konkrete Zutat zu wählen oder den Namen zu konkretisieren.

#### Scenario: Generische KI-Zutat im Review
- **WHEN** die KI im Import eine neue Zutat „Zwiebel" vorschlägt und „Zwiebel" ein generischer Begriff ist
- **THEN** SHALL das Review-Element eine Warnung anzeigen
- **AND** SHALL der Nutzer die Möglichkeit haben, eine konkrete Zutat zu wählen oder den Namen anzupassen, bevor er den Import bestätigt
