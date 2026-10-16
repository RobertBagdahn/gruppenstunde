# unified-food-search Specification

## Purpose
Anforderungen an unified food search: Gemeinsame Zutatensuche; Ranking; Buffet zeigt auch Kochzutaten.
## Requirements
### Requirement: Gemeinsame Zutatensuche
Omnibar, Buffet und Rezept-Zutatenautocomplete MUST dieselbe Suchfunktion nutzen, die Teilstrings in Name und Aliasen sowie Umlautvarianten findet.

#### Scenario: Zwiebel findet Speisezwiebel
- **WHEN** der Nutzer in einer der drei Suchen „Zwiebel“ eingibt
- **THEN** erscheint „Speisezwiebel“ unter den Treffern

### Requirement: Ranking
Treffer MUST in dieser Reihenfolge sortiert werden: exakter Name, Name beginnt mit Suchbegriff, Wortanfang, enthält; innerhalb gleicher Stufe nach `usage_count`, dann Name.

#### Scenario: Reihenfolge
- **WHEN** „Zwiebel“, „Speisezwiebel“ und „Frühlingszwiebel“ passen
- **THEN** steht „Zwiebel“ vor „Speisezwiebel“ und „Frühlingszwiebel“

### Requirement: Buffet zeigt auch Kochzutaten
Die Buffet-Suche SHALL Zutaten ohne `is_standalone_food` immer anzeigen, nach den Standalone-Treffern einsortiert, mit Badge „Zutat zum Kochen“. Die Checkbox „Auch Backzutaten & Gewürze“ MUST entfallen.

#### Scenario: Zwiebel im Frühstücksbuffet
- **WHEN** der Nutzer im Buffet „Zwiebel“ eingibt
- **THEN** erscheinen Zwiebel-Zutaten mit Badge „Zutat zum Kochen“ nach etwaigen Standalone-Treffern

### Requirement: Entwürfe in der Omnibar
Die Omnibar SHALL geprüfte Zutaten und eigene Entwurfs-Zutaten des Nutzers zeigen; Entwürfe tragen das Badge „Entwurf“.

#### Scenario: Eigener Entwurf
- **WHEN** der Nutzer eine eigene, ungeprüfte Zutat „Dinkelbrötchen“ besitzt und danach sucht
- **THEN** erscheint sie mit Badge „Entwurf“; Entwürfe anderer Nutzer erscheinen nicht
