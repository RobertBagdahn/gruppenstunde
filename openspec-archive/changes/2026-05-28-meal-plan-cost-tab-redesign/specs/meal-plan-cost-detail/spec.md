## ADDED Requirements

### Requirement: Rezept-Einzelpreise im Kosten-Tab

Der Kosten-Tab eines Essensplans MUSS eine Liste aller im Plan verwendeten Rezepte mit ihren skalierten Kosten anzeigen. Jedes Rezept MUSS als Link zur Rezept-Detailseite dargestellt werden.

#### Scenario: Rezepte mit Preisen anzeigen
- **WHEN** der Nutzer den Kosten-Tab eines Essensplans öffnet
- **THEN** wird eine Liste aller Rezepte des Plans mit dem jeweiligen Gesamtpreis (skaliert auf Plan-Portionen) angezeigt

#### Scenario: Rezept ohne Preis
- **WHEN** ein Rezept im Plan keine bepreisten Zutaten hat
- **THEN** wird "–" als Preis angezeigt

#### Scenario: Duplikat-Rezept
- **WHEN** ein Rezept mehrfach im Plan vorkommt (verschiedene Tage/Mahlzeiten)
- **THEN** werden die Kosten über alle Vorkommen summiert und als eine Zeile dargestellt

### Requirement: Pro-Person-pro-Tag-Kennzahl

Der Kosten-Tab MUSS eine "Pro Person pro Tag"-Kennzahl als Summary Card anzeigen.

#### Scenario: Berechnung
- **WHEN** der Plan Tage und Normpersonen hat
- **THEN** wird Gesamtkosten / Normpersonen / Anzahl Tage als "Pro Pers./Tag" angezeigt

### Requirement: Link zur Preispflege

Der Kosten-Tab MUSS einen Hinweis mit Link zur Zutaten-Preispflege (`/ingredients`) anzeigen.

#### Scenario: Hinweis-Banner
- **WHEN** der Kosten-Tab geladen wird
- **THEN** erscheint ein Banner mit Hinweis auf die Zutatendatenbank zur Preispflege

### Requirement: cost-calculation-Route entfernen

Die Route `/cost-calculation` und ihre zugehörige Page-Komponente MÜSSEN entfernt werden. Der Tool-Eintrag in der Navigation wird ebenfalls entfernt.

#### Scenario: Route existiert nicht mehr
- **WHEN** ein Nutzer `/cost-calculation` aufruft
- **THEN** wird eine 404-Seite oder Redirect angezeigt

#### Scenario: Navigation bereinigt
- **WHEN** die Tool-Liste angezeigt wird
- **THEN** erscheint kein Eintrag für "Kostenkalkulation" mehr
