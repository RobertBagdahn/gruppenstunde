## Why

Die erste Umsetzung des manuellen Normportionen-Overrides behebt den ursprünglichen Fetch-Fehler, lässt aber mehrere Randfälle offen: ein Reset ohne Gruppenmitglieder kann den manuellen Wert verlieren, Event-Synchronisierung ist nicht idempotent, Datumswerte werden nicht robust behandelt und abgeleitete Ansichten können veraltete Mengen anzeigen. Diese Folgeänderung stabilisiert den gesamten Bearbeitungsablauf, bevor der Override produktiv als zuverlässig gelten kann.

## What Changes

- Bewahrt den manuellen Normportionenwert beim Zurückschalten auf automatische Berechnung ohne Gruppenmitglieder.
- Macht die Synchronisierung von Event-Teilnehmern idempotent und entfernt veraltete synchronisierte Mitglieder.
- Validiert nullable und widersprüchliche Datumsbereiche serverseitig mit strukturierten API-Fehlern.
- Verhindert, dass PAL-Änderungen bei eigenständigen Plänen deren direkte Normportionen überschreiben.
- Konvertiert MealPlan-Datumswerte korrekt zwischen UTC/API und lokaler `datetime-local`-Darstellung.
- Invalidiert Kochplan-, Vorschlags-, Kosten-, Einkaufs- und Nährwert-Abfragen nach relevanten Änderungen.
- Lehnt `norm_portions_manual: null` ausdrücklich ab.
- Ergänzt Regressionstests für alle genannten Randfälle und den tatsächlichen PATCH-Mutationspfad.

## Capabilities

### New Capabilities

- Keine.

### Modified Capabilities

- `meal-plan`: Normportionen-Reset, Datumsvalidierung und Cache-Konsistenz werden präzisiert.
- `meal-plan-group-members`: Event-Teilnehmer-Synchronisierung wird idempotent und entfernt veraltete Synchronisierungen.

## Impact

- Backend: `planner` MealPlan-Modell, Update-/GroupMember-API, Pydantic-Schema und Planner-Tests; keine neue Datenbankmigration erwartet.
- Food-Frontend: MealPlan- und GroupMember-TanStack-Query-Hooks, `SettingsPanel`, MealPlan-Detailseite, Zod-/Component-/API-Tests.
- API-Verhalten: Neue strukturierte 400/422-Validierungsfehler für ungültige Datums- und Override-Payloads.
- Query-State: Abgeleitete MealPlan-Ansichten werden nach Plan-, Teilnehmer- und relevanten Inhaltsänderungen aktualisiert.
