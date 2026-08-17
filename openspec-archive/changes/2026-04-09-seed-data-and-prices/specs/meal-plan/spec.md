## MODIFIED Requirements

### Requirement: Links zu Rezepten und Zutaten im Essensplan

Der Essensplan MUSS klickbare Links zu den zugeordneten Rezepten und deren Zutaten anzeigen.

#### Scenario: Rezept-Link in Mahlzeit
- **WHEN** eine Mahlzeit (Meal) im Essensplan angezeigt wird
- **THEN** MUSS jedes zugeordnete Rezept als klickbarer Link zur Rezept-Detailseite (`/recipes/{slug}`) dargestellt werden

#### Scenario: Zutaten-Links in Mahlzeit
- **WHEN** ein Rezept im Essensplan aufgeklappt oder erweitert wird
- **THEN** MÜSSEN die Zutaten des Rezepts als klickbare Links zu den Zutaten-Detailseiten angezeigt werden (sofern eine Zutaten-Detailseite existiert)

#### Scenario: Zutaten ohne Detailseite
- **WHEN** eine Zutat keine eigene Detailseite hat
- **THEN** MUSS der Zutatname als normaler Text (nicht als Link) angezeigt werden
