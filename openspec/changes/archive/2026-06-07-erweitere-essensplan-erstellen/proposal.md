## Why

Der "Neuen Essensplan erstellen"-Dialog hat keine Default-Werte, und die Funktion "Aus Vorlage kopieren" ist in einem separaten Dialog versteckt (über das 3-Punkt-Menü). Das führt zu mehr Klicks und verwirrt Nutzer. Gleichzeitig ist der "Als Vorlage verwenden"-Dialog nicht vorbefüllt. Ziel: Einen einzigen, intelligent vorbefüllten Dialog, der beides kann — leeren Plan anlegen oder bestehenden kopieren.

## What Changes

- **Neuer einheitlicher Create-Dialog**: "Neuen Essensplan erstellen" und "Als Vorlage verwenden" werden in einem Dialog zusammengeführt
- **Default-Werte überall**: Name = "Neuer Essensplan", Datum = nächstes Wochenende (Fr–So), Portionen = 10
- **Optionale Quell-Auswahl**: Checkbox "Von Plan kopieren" + Dropdown zur Auswahl eines bestehenden Plans
- **Automatische Vorbefüllung bei Kopie**: Portionen + Enddatum aus Quelldauer, " (Kopie)"-Suffix, Vorlage-Badge
- **Alten Duplikat-Dialog entfernen**: "Als Vorlage verwenden" im Dropdown öffnet stattdessen den Create-Dialog mit vorausgewählter Quelle

## Capabilities

### New Capabilities
- `create-meal-plan-dialog`: Einheitlicher Create/Kopie-Dialog für Essenspläne mit Default-Werten und Quell-Auswahl

### Modified Capabilities
- `meal-plan-frontend`: Der Create-Dialog bekommt Default-Werte (Name, Datum, Portionen) und eine optionale Kopier-Quelle; die getrennte `/meal-plans/new`-Seite entfällt zugunsten des Dialog-basierten Ansatzes
- `meal-plan-duplicate`: Der separate Duplikat-Dialog wird entfernt; die Duplikat-Funktion wird in den Create-Dialog integriert; die API-Endpunkte bleiben unverändert

## Impact

- **Frontend** (`frontend-food/`):
  - `pages/planning/MealEventListPage.tsx`: Umfangreiches Refactoring des Create-Dialogs, Entfernung des separaten Duplikat-Dialogs
  - Neue Utility-Funktion zur Berechnung des nächsten Wochenendes (Fr–So)
  - Keine neuen Abhängigkeiten
- **Backend**: Keine Änderungen — beide Endpunkte (`POST /api/meal-plans/` und `POST /api/meal-plans/{id}/duplicate/`) bleiben unverändert
- **Schemas**: Keine Änderungen an Pydantic oder Zod Schemas; die Nutzung der existierenden Endpunkte wird lediglich anders geroutet
- **Migrations**: Keine
