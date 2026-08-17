## ADDED Requirements

### Requirement: Klickbare Verbesserungsvorschläge

Das System MUSS Verbesserungsvorschläge (RecipeHints) als klickbare Elemente darstellen, die eine Detailanalyse öffnen.

#### Scenario: Hint anklicken öffnet Detail-Modal
- **WHEN** ein User auf einen Verbesserungsvorschlag in der Rezept-Detailseite klickt
- **THEN** MUSS ein Modal/Sheet geöffnet werden mit: dem Hinweis-Text, der betroffenen Zutat(en) die am meisten zu dem Problem beitragen, einer konkreten Empfehlung welche Zutat erhöht oder reduziert werden muss, und einem „Anwenden"-Button

#### Scenario: Zutat-Identifikation im Hint-Detail
- **WHEN** das Hint-Detail-Modal geöffnet wird
- **THEN** MUSS das System die Zutaten des Rezepts analysieren und diejenige(n) identifizieren, die am stärksten zum betroffenen Nährwertparameter beitragen
- **THEN** MUSS die Analyse den prozentualen Beitrag jeder relevanten Zutat zum Gesamtwert des Parameters anzeigen

### Requirement: LLM-Zutatentipps

Das System MUSS per LLM (Gemini Flash-Lite) 3 kreative Zutatentipps generieren können, die zu einem bestimmten Verbesserungsziel passen.

#### Scenario: LLM-Vorschläge für einen Hint anfordern
- **WHEN** ein User im Hint-Detail-Modal auf „KI-Vorschläge anfordern" klickt
- **THEN** MUSS ein POST-Request an `/api/recipes/{recipe_id}/suggestions/` gesendet werden mit dem Ziel-Parameter (z.B. „mehr Ballaststoffe")
- **THEN** MUSS die Response 3 Vorschläge enthalten, jeweils mit: Zutatname, empfohlene Menge, Begründung warum diese Zutat zum Rezept passt, und erwartete Nährwert-Verbesserung

#### Scenario: Vorschlag anwenden
- **WHEN** ein User auf „Hinzufügen" bei einem LLM-Vorschlag klickt
- **THEN** MUSS die Zutat zum Frontend-State des modifizierten Rezepts hinzugefügt werden (NICHT zur Datenbank)
- **THEN** MÜSSEN alle Nährwertanzeigen, das Apfel-Rating und die Hints neu berechnet werden basierend auf dem modifizierten Zustand

#### Scenario: LLM-Vorschläge Caching
- **WHEN** LLM-Vorschläge für dasselbe Rezept und denselben Zielparameter innerhalb von 24 Stunden erneut angefordert werden
- **THEN** MUSS das System die gecachte Response zurückgeben

#### Scenario: Rate-Limiting
- **WHEN** ein authentifizierter User mehr als 10 Suggestions-Requests pro Stunde sendet
- **THEN** MUSS das System einen 429-Statuscode zurückgeben mit der Nachricht „Zu viele Anfragen. Bitte warte etwas."
- **WHEN** ein nicht-authentifizierter User Suggestions anfordert
- **THEN** MUSS das System einen 401-Statuscode zurückgeben

### Requirement: Automatische Portions-Normalisierung

Das System MUSS erkennen wenn eine Rezept-Portion zu groß ist und eine automatische Normalisierung anbieten.

#### Scenario: Zu große Portion erkennen
- **WHEN** die Energie pro Portion eines Rezepts mehr als 150% des DGE-Referenzwerts für den Mahlzeitentyp beträgt
- **THEN** MUSS ein Hinweis angezeigt werden: „Diese Portion ist größer als eine Normportion. Auf Normportion skalieren?"

#### Scenario: Normalisierung durchführen
- **WHEN** ein User den „Auf Normportion skalieren"-Button klickt
- **THEN** MÜSSEN alle Zutatmengen gleichmäßig um den Normalisierungsfaktor reduziert werden
- **THEN** MUSS die Änderung nur im Frontend-State erfolgen (NICHT in der Datenbank)
- **THEN** MUSS die Anzahl der Portionen auf 1 gesetzt werden

### Requirement: Frontend-Only Rezeptänderungen

Alle Magic-Button-Anpassungen MÜSSEN ausschließlich im Frontend-State gehalten werden, ohne die Datenbank zu ändern.

#### Scenario: Rezept modifizieren
- **WHEN** ein User eine Magic-Button-Aktion ausführt (Zutat hinzufügen, Menge ändern, Portion normalisieren)
- **THEN** MUSS die Änderung in einem Zustand-Store gespeichert werden
- **THEN** MUSS ein visueller Indikator anzeigen, dass das Rezept modifiziert wurde (z.B. Badge „Modifiziert" oder farblicher Rahmen)
- **THEN** MUSS ein „Zurücksetzen"-Button verfügbar sein, der alle Änderungen rückgängig macht

#### Scenario: Modifiziertes Rezept verlassen
- **WHEN** ein User die Rezept-Detailseite verlässt während Modifikationen vorhanden sind
- **THEN** MUSS eine Bestätigungsdialog angezeigt werden: „Du hast Änderungen am Rezept. Möchtest du sie verwerfen oder als persönliches Rezept speichern?"

#### Scenario: Nährwerte nach Modifikation aktualisieren
- **WHEN** eine Zutat hinzugefügt, entfernt oder in der Menge geändert wird
- **THEN** MÜSSEN alle Frontend-Berechnungen (Nährwerte, Apfel-Rating, Hints) im Frontend basierend auf den modifizierten Daten neu berechnet werden
- **THEN** MUSS dabei die Nährwertdaten der betroffenen Zutaten verwendet werden (per-100g-Werte aus dem Ingredient-Schema)
