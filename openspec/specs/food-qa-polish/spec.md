# food-qa-polish Specification

## Purpose
Anforderungen an food qa polish: Slugs transliterieren ß; Zubereitungszeit hat keinen stillen Standard; Korrekter Plural bei Portionen.
## Requirements
### Requirement: Slugs transliterieren ß
Das System SHALL beim Erzeugen von Slugs `ß` als `ss` abbilden.

#### Scenario: Rezept mit ß
- **WHEN** ein Rezept „Tomatensoße“ angelegt wird
- **THEN** lautet der Slug `tomatensosse`

### Requirement: Zubereitungszeit hat keinen stillen Standard
Neue Rezepte SHALL als Zubereitungszeit „Keine Angabe“ erhalten, bis der Nutzer eine Dauer wählt.

#### Scenario: Neues Rezept ohne Zeitwahl
- **WHEN** ein Rezept ohne Angabe der Dauer angelegt wird
- **THEN** zeigt es „Keine Angabe“ statt „< 30 Min“

### Requirement: Korrekter Plural bei Portionen
Das System SHALL „Portion“ bei genau 1 und „Portionen“ sonst anzeigen, in Rezeptseite, Gerichtssuche und Zutatenzeilen.

#### Scenario: Sieben Portionen
- **WHEN** die Rezeptseite für 7 Portionen angezeigt wird
- **THEN** steht „7 Portionen Nudeln“, nicht „7 Portion Nudeln“

### Requirement: Gerichtssuche rendert Markdown
Die Vorschau der Gerichtssuche SHALL Rezeptbeschreibungen als Markdown rendern, ohne HTML einzubetten.

#### Scenario: Beschreibung mit Überschrift
- **WHEN** die Vorschau ein Rezept mit „## Zubereitung“ zeigt
- **THEN** erscheint eine Überschrift, kein roher Text mit „##“

### Requirement: Zutaten-Schritt des Rezept-Wizards ist bei 320 px bedienbar
Im Rezept-Wizard Schritt „Zutaten“ MUST bei 320 px Viewport-Breite Name, Gesamtmenge und Aktionsbuttons jeder Zeile sichtbar und erreichbar sein, ohne horizontales Scrollen der Seite.

#### Scenario: Zutatenzeile auf kleinem Display
- **WHEN** der Schritt bei 320 px Breite geöffnet wird
- **THEN** sind Zutatenname, Menge und „Entfernen“ sichtbar
