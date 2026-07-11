## Why

Gruppenführer planen Essenspläne für Lager mit gemischten Gruppen (Wölflinge, Pfadfinder, Rover, Leiter). Der Kalorienbedarf hängt von Alter, Geschlecht und PAL ab. Heute muss `norm_portions` manuell geschätzt werden — mühsam und fehleranfällig. Die Plattform hat bereits eine Norm-Personen-Berechnung (`supply/services/norm_person_service.py`), aber keine UI, um eine konkrete Personengruppe zusammenzuklicken und daraus automatisch die Norm-Portionen abzuleiten.

## What Changes

- Neues Modell `MealPlanGroupMember` im `planner` App mit Name (optional), Geburtstag/Alter, Geschlecht (Default: keine Angabe), NutritionalTags und optionalem Link zu `event.Person`
- **BREAKING**: `MealPlan.norm_portions` wird automatisch aus der Gruppenberechnung überschrieben, sobald mindestens ein `GroupMember` existiert
- Neuer PAL-Wert (`activity_factor`) am `MealPlan` zur Gruppeneinstellung
- Gruppen-Button in der MealPlan-Detail-Headerleiste (neben "Essensplan teilen")
- Gruppen-Dialog mit: Stufen-Schnellbuttons (Wölflinge/Jungpfadfinder/Pfadfinder/Rover mit Mengenauswahl), Einzelperson-Hinzufügen, Personenliste mit Löschen
- Live-Berechnung der Norm-Portionen über `calculate_group_norm_factor()` bei jeder Änderung
- Live-Anzeige im SettingsPanel: "10 → 4,2 Norm-Personen (berechnet aus 5 Personen)"
- Live-Sync mit `event.Participant`s wenn der MealPlan mit einem Event verknüpft ist
- Nutzung von `BookingOption`s zur tagesgenauen Präsenzberechnung bei Event-verknüpften Plänen
- Freitext-Eingabe für Allergien mit NutritionalTag-Vorschlägen (Autocomplete)

## Capabilities

### New Capabilities
- `meal-plan-group-members`: CRUD für Gruppenmitglieder am MealPlan, inkl. Schnell-Hinzufügen per Stufe, Live-Norm-Personen-Berechnung, Allergien-Autocomplete, und Event-Sync

### Modified Capabilities
- `meal-plan`: `norm_portions` wird bei vorhandenen GroupMembers automatisch aus der Gruppenberechnung abgeleitet statt manuell gesetzt
- `meal-plan-effective-portions`: effektive Portionen berücksichtigen jetzt die tagesgenaue Gruppenzusammensetzung bei Event-verknüpften Plänen

## Impact

- **Backend**: `planner/models/meal_plan.py` — neues `MealPlanGroupMember` Model, `MealPlan.activity_factor` Feld; `planner/api/meal_plan.py` — neue GroupMember CRUD-Endpunkte; `planner/schemas/meal_plan.py` — neue Pydantic-Schemas; `supply/services/norm_person_service.py` — Aufruf aus GroupMember-Logik
- **Frontend-Food**: `MealEventDetailPage.tsx` — Gruppen-Button; neue Komponenten: `GroupMemberDialog`, `GroupMemberList`, `QuickAddStufenDialog`; neue API-Hooks; neue Zod-Schemas
- **Migrations**: Neue Tabelle `planner_mealplangroupmember`, neues Feld `activity_factor` an `planner_mealplan`
- **Keine Änderungen** am Haupt-Frontend (`frontend/`), am `event` App, oder an bestehenden Person/Participant-Modellen
