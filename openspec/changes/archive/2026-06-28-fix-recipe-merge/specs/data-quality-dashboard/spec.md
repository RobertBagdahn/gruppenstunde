## ADDED Requirements

### Requirement: Recipe Merge Dialog
Das Duplikate-Tab für Rezepte SHALL einen Merge-Dialog anzeigen, der Source- und Target-Rezept darstellt und vor dem Zusammenführen eine Preview lädt.

#### Scenario: Merge-Dialog öffnen
- **WHEN** Staff-User auf "Zusammenführen" bei einem Rezept-Duplikat-Pair klickt
- **THEN** SHALL ein Dialog mit den Namen beider Rezepte und "Source → Target"-Anordnung geöffnet werden
- **THEN** SHALL die Preview geladen werden, die die Anzahl der betroffenen Meal-Referenzen anzeigt
- **THEN** SHALL ein Warnhinweis "Diese Aktion kann nicht rückgängig gemacht werden" angezeigt werden

#### Scenario: Merge ausführen
- **WHEN** Staff-User im Merge-Dialog auf "Bestätigen" klickt
- **THEN** SHALL `POST /api/admin/data-quality/recipes/merge/` aufgerufen werden
- **THEN** SHALL bei Erfolg eine Success-Toast "X → Y zusammengeführt" erscheinen
- **THEN** SHALL der Dialog geschlossen werden
- **THEN** SHALL die Duplikate-Liste aktualisiert werden

#### Scenario: Dismiss im Duplikate-Tab
- **WHEN** Staff-User auf "Kein Duplikat" bei einem Rezept-Pair klickt
- **THEN** SHALL das Pair aus der Liste verschwinden
- **THEN** SHALL eine Success-Toast "Als kein Duplikat markiert" erscheinen
