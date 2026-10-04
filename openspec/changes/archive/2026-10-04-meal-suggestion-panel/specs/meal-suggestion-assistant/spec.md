## ADDED Requirements

### Requirement: Five-question assistant
Das System SHALL einen Assistenten mit genau 5 Fragen je Meal-Typ anbieten. Jede Frage SHALL 2–4 Optionen plus „Egal“ haben; die UI SHALL Zurück und Fortschritt („2 von 5“) zeigen. Die letzte Frage SHALL ein optionaler Freitext-Wunsch sein.

#### Scenario: Snack assistant
- **WHEN** der Nutzer den Assistenten für einen Snack startet
- **THEN** werden Fragen wie süß/herzhaft, Vorbereitung, kinderfreundlich, Kosten und Freitext gestellt, insgesamt 5

#### Scenario: Go back
- **WHEN** der Nutzer bei Frage 3 „Zurück“ wählt
- **THEN** sieht er Frage 2 mit der gespeicherten Antwort

### Requirement: Context questions replace slots
Ist ein relevantes Kontextfeld des Plans bereits gesetzt, SHALL der Assistent diese Frage überspringen und durch eine weitere Meal-Typ-Frage ersetzen, sodass es stets 5 Fragen sind. Fehlende relevante Kontextfelder SHALL einmalig gefragt und am MealPlan gespeichert werden.

#### Scenario: Cooking source known
- **WHEN** `cooking_sources` am Plan gesetzt ist
- **THEN** wird die Kochquellen-Frage nicht gestellt

#### Scenario: Context saved
- **WHEN** der Nutzer „Lagerfeuer“ als Kochquelle beantwortet
- **THEN** ist der Wert am Plan gespeichert und wird nicht erneut gefragt

### Requirement: Filter chips
Das Panel SHALL die Antworten als Filter-Chips über den Karten anzeigen; Chips und Assistenten-Antworten SHALL denselben Zustand teilen. Ein Chip-Wechsel SHALL die Karten neu laden.

#### Scenario: Toggle chip
- **WHEN** der Nutzer den Chip „kinderfreundlich“ ausschaltet
- **THEN** werden die Karten ohne dieses Kriterium neu geladen

### Requirement: Free-text magic wand
Das Panel SHALL ein Freitextfeld und einen Zauberstab-Button enthalten. Erst ein Klick auf den Zauberstab SHALL genau einen KI-Aufruf auslösen, der die Karten neu sortiert und fehlende Zutaten vorschlägt. Neue Zutaten SHALL als Entwurf mit Badge „Neu“ angelegt und erst per Klick in den Plan übernommen werden. Ohne KI-Budget SHALL ein Stichwort-Fallback über Name/Tags/Beschreibung greifen.

#### Scenario: Wand with new ingredient
- **WHEN** der Nutzer „etwas mit Schokolade, ohne Kochen“ eingibt und den Zauberstab klickt
- **THEN** wird eine fehlende Zutat als Entwurf angelegt und mit „Neu“ markiert
- **THEN** wird sie nicht automatisch in den Slot übernommen

#### Scenario: No AI budget
- **WHEN** der Zauberstab ohne KI-Budget geklickt wird
- **THEN** sortiert der Stichwort-Fallback die Karten und es entsteht keine neue Zutat

#### Scenario: Typing does not call AI
- **WHEN** der Nutzer im Freitextfeld tippt
- **THEN** erfolgt kein KI-Aufruf
