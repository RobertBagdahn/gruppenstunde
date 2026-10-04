## ADDED Requirements

### Requirement: Eigene Essenspläne
Die Planliste SHALL bei aktivem Filter „Meine Pläne“ ausschließlich Essenspläne zurückgeben, deren Owner der angemeldete Nutzer ist. Staff-Status allein SHALL den Owner-Filter nicht aufheben. Kollaborator-Zugriff und administrative Gesamtübersichten SHALL über eigene Berechtigungen beziehungsweise explizite Filter geregelt werden.

#### Scenario: Nutzer sieht eigene Pläne
- **GIVEN** ein authentifizierter Nutzer besitzt eigene Pläne und ist Kollaborator in einem fremden Plan
- **WHEN** er „Meine Pläne“ aktiviert
- **THEN** erscheinen nur die von ihm besessenen Pläne

#### Scenario: Staff sieht keine fremden Pläne im Owner-Filter
- **GIVEN** ein Staff-Nutzer besitzt eigene Pläne und andere Nutzer besitzen ebenfalls Pläne
- **WHEN** er „Meine Pläne“ aktiviert
- **THEN** erscheinen keine Pläne anderer Besitzer allein aufgrund des Staff-Status

#### Scenario: Anonyme Anfrage
- **GIVEN** ein nicht authentifizierter Nutzer
- **WHEN** er die geschützte Planliste abfragt
- **THEN** SHALL die API die festgelegte Authentifizierungsantwort zurückgeben und keine privaten Pläne offenlegen

### Requirement: Einzelzutaten übernehmen Portionskontext genau einmal
Wenn eine Zutat im Essensplan hinzugefügt wird, SHALL die ausgewählte Portion und deren Menge erhalten bleiben. Die Norm-Portionenzahl des Plans SHALL genau einmal auf die gespeicherte Pro-Person-Menge angewendet werden; Ansichten und Einkaufsliste SHALL denselben kanonischen Portionswert verwenden.

#### Scenario: Toastbrot für zwölf Personen
- **GIVEN** Toastbrot hat eine Portion „Scheibe“ mit 30 g und der Essensplan umfasst 12 Personen
- **WHEN** eine Scheibe pro Person hinzugefügt wird
- **THEN** SHALL die Tagesansicht, die Tabelle und die Einkaufsliste dieselbe Portionsbedeutung anzeigen und insgesamt ungefähr 360 g (vor Reserven) berechnen
