## ADDED Requirements

### Requirement: Inline Edit-Mode Toggle
Benutzer mit `can_edit`-Berechtigung (Admin, Staff, Owner) können einen Bearbeitungsmodus auf der Rezept-Detailseite aktivieren.

#### Scenario: Edit-Mode aktivieren
- **WHEN** User mit `can_edit` auf "Bearbeiten" klickt
- **THEN** Portionen-Feld und Zutaten-Liste werden editierbar, Toolbar mit Speichern/Abbrechen erscheint

#### Scenario: Edit-Mode nicht verfügbar
- **WHEN** User ohne `can_edit`-Berechtigung die Seite sieht
- **THEN** kein Bearbeiten-Button sichtbar, reine Lesansicht

### Requirement: Basis-Portionen editieren
Im Edit-Mode kann die Basis-Portionenzahl (`servings`) direkt geändert werden.

#### Scenario: Portionen ändern
- **WHEN** User im Edit-Mode den Portionen-Wert ändert und speichert
- **THEN** Recipe.servings wird per PATCH aktualisiert

### Requirement: Zutaten inline bearbeiten
Jede Zutat kann direkt in der Liste bearbeitet werden (Menge, Einheit, Notiz).

#### Scenario: Menge ändern
- **WHEN** User im Edit-Mode die Menge einer Zutat ändert und speichert
- **THEN** RecipeItem.quantity wird per PATCH aktualisiert

#### Scenario: Zutat löschen
- **WHEN** User im Edit-Mode eine Zutat entfernt und speichert
- **THEN** RecipeItem wird per DELETE entfernt

### Requirement: Zutat hinzufügen
Neue Zutaten können per Autocomplete-Suche hinzugefügt werden.

#### Scenario: Bestehende Zutat hinzufügen
- **WHEN** User eine Zutat aus der Suche auswählt
- **THEN** neues RecipeItem wird per POST erstellt

#### Scenario: Neue Zutat erstellen und hinzufügen
- **WHEN** Suche kein Ergebnis liefert und User "Neu erstellen" wählt
- **THEN** neues Ingredient (status=draft) wird erstellt und als RecipeItem hinzugefügt

### Requirement: AI-Mengenschätzung (Zauberstab)
AI schätzt realistische Gramm-Mengen für alle bestehenden Zutaten eines Rezepts.

#### Scenario: Mengen schätzen lassen
- **WHEN** User im Edit-Mode den Zauberstab-Button klickt
- **THEN** Backend ruft Gemini auf, Response wird als Vorschau angezeigt (pro Person + total)

#### Scenario: Vorschlag übernehmen
- **WHEN** User die AI-Vorschläge bestätigt ("Übernehmen")
- **THEN** geschätzte Mengen werden in die Edit-Felder übernommen (noch nicht gespeichert)

#### Scenario: Vorschlag verwerfen
- **WHEN** User "Verwerfen" klickt
- **THEN** Edit-Felder bleiben unverändert

### Requirement: Speichern und Abbrechen
Änderungen werden explizit gespeichert oder verworfen.

#### Scenario: Speichern
- **WHEN** User "Speichern" klickt
- **THEN** alle geänderten Items werden per PATCH aktualisiert, Edit-Mode wird verlassen, Seite zeigt aktualisierte Daten

#### Scenario: Abbrechen
- **WHEN** User "Abbrechen" klickt
- **THEN** alle lokalen Änderungen werden verworfen, Edit-Mode wird verlassen
