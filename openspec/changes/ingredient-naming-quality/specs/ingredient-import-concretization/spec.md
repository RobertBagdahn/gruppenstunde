## ADDED Requirements

### Requirement: Konkretisierung von Grundzutaten beim KI-Import
Das System SHALL den KI-Import-Prompt (`backend/recipe/services/url_import_service.py` und analog `ai_ingredients_service.py`) so anweisen, dass Grundzutaten nicht mehr pauschal weggelassen, sondern konkretisiert importiert werden. Insbesondere SHALL „Salz" als „Jodsalz" und „Pfeffer" als „Schwarzer Pfeffer gemahlen" importiert werden. Konkretisierte Grundzutaten zählen regulär zu Nährwerten und Einkaufsliste.

#### Scenario: Salz wird konkretisiert
- **WHEN** ein Rezept „Salz nach Geschmack" enthält und importiert wird
- **THEN** SHALL die importierte Zutat einen konkretisierten Namen tragen (z.B. „Jodsalz")
- **AND** SHALL sie nicht weggelassen werden

#### Scenario: Pfeffer wird konkretisiert
- **WHEN** ein Rezept „Pfeffer" enthält und importiert wird
- **THEN** SHALL die importierte Zutat einen konkretisierten Namen tragen (z.B. „Schwarzer Pfeffer gemahlen")

### Requirement: Jede Zutat einzeln und spezifisch
Das System SHALL den Import-Prompt anweisen, jede Zutat als genau eine Sache zu importieren (keine „und"-Verbindungen wie „Salz und Pfeffer") und immer mit einer Zustandsform (frisch, TK, getrocknet, gemahlen, aus der Dose etc.).

#### Scenario: Kombinierte Zutat wird aufgetrennt
- **WHEN** ein Rezept „Salz und Pfeffer nach Geschmack" enthält und importiert wird
- **THEN** SHALL das System zwei getrennte konkretisierte Zutaten erzeugen (z.B. „Jodsalz" und „Schwarzer Pfeffer gemahlen")
- **AND** SHALL keine Zutat mit „und" im Namen entstehen

#### Scenario: Zustandsform wird verlangt
- **WHEN** die KI eine neue Zutat anlegt
- **THEN** SHALL ihr Name eine Zustandsform enthalten (z.B. „Zwiebel frisch", „Fusilli trocken")

### Requirement: Generische KI-Ergebnisse lösen Validierungswarnung aus
Wenn die KI trotz Prompt einen generischen Namen liefert, SHALL das System im Import-Review die „zu generisch"-Warnung (siehe `ingredient-name-validation`) für das betroffene Zutat-Element bereitstellen, sodass der Nutzer konkretisieren kann.

#### Scenario: KI liefert generischen Namen
- **WHEN** die KI eine neue Zutat „Nudeln" vorschlägt und „Nudeln" ein generischer Begriff ist
- **THEN** SHALL das zugehörige Review-Element die „zu generisch"-Warnung tragen
- **AND** SHALL der Nutzer den Import erst nach Konkretisierung oder bewusster Bestätigung abschließen können
