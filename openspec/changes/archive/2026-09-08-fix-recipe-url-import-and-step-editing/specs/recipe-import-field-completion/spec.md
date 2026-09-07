## ADDED Requirements

### Requirement: Robuste Alias-Erstellung bei neuen Draft-Zutaten

Beim Importieren von Rezepten aus URLs SHALL das System vorgeschlagene Aliase für neu angelegte Draft-Zutaten nur dann in `IngredientAlias` eintragen, wenn der Alias-Name datenbankweit noch nicht vergeben ist. Kollidierende Aliase SHALL ignoriert werden, ohne dass der Importprozess mit einem Fehler abbricht.

#### Scenario: Bereits vergebener Alias wird beim Import übersprungen
- **WHEN** ein Rezept importiert wird und Gemini für eine neue Zutat einen Alias vorschlägt, der bereits für eine andere Zutat existiert (z.B. „mehl“)
- **THEN** SHALL das System den kollidierenden Alias überspringen und die Zutat sowie das Rezept erfolgreich ohne Fehler anlegen

#### Scenario: Neuer, nicht kollidierender Alias wird gespeichert
- **WHEN** ein Rezept importiert wird und Gemini einen neuen, bisher ungenutzten Alias vorschlägt
- **THEN** SHALL das System den Alias erfolgreich mit der neu angelegten Draft-Zutat verknüpfen
