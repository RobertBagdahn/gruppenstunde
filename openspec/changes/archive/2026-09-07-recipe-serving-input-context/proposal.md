## Why

Der Rezepteditor interpretiert eingegebene Mengen derzeit implizit als Pro-1-Person-Mengen, obwohl Nutzer Rezepte typischerweise für eine konkrete Personenzahl erfassen. Wird beispielsweise eine Menge für vier Personen eingetragen, der Personenregler aber auf eins gelassen, wird die Menge beim späteren Kochen erneut hochskaliert. Zusätzlich wird ein fehlgeschlagener Speichervorgang im Wizard nur als allgemeiner Fehler angezeigt.

## What Changes

- Der Rezepteditor führt vor der Zutatenbearbeitung einen temporären Personen-Kontext von 1 bis 100 Personen ein.
- Der Personen-Kontext startet bei 1, wird vor der Zutatenbearbeitung festgelegt und danach für diesen Bearbeitungsvorgang gesperrt.
- Zutatenmengen werden im Editor als Gesamtmengen für den gewählten Personen-Kontext angezeigt und eingegeben.
- Beim Bearbeiten bestehender Rezepte werden die technisch pro 1 Person gespeicherten Mengen für den gewählten Kontext dargestellt.
- Beim Speichern werden die Gesamtmengen weiterhin intern auf Pro-1-Person-Mengen normiert, damit bestehende Berechnungen und APIs konsistent bleiben.
- Vor jedem Speichern wird ein Bestätigungsdialog mit der gewählten Personenzahl angezeigt; ein Abbruch führt zurück zur Bearbeitung.
- Importierte Personenzahlen werden übernommen; fehlt bei Importen oder KI-Erstellung eine verlässliche Zahl, muss sie ausgewählt werden.
- Die temporäre Personenzahl wird nicht dauerhaft am Rezept gespeichert und beim nächsten Bearbeitungsvorgang erneut festgelegt.
- Fehlgeschlagene API-Speicherungen zeigen die konkrete Backend-Fehlermeldung an.

## Capabilities

### New Capabilities

- `recipe-serving-input-context`: Temporärer, gesicherter Personen-Kontext für Rezeptmengen im Erstellungs- und Bearbeitungseditor.

### Modified Capabilities

- `recipe-quantity-display`: Die Bearbeitungsansicht erhält eine explizite Gesamtmengen-Semantik für einen gewählten Personen-Kontext, während die gespeicherte Pro-1-Person-Semantik erhalten bleibt.

## Impact

- Food-Frontend: `RecipeWizard`, `WizardStepIngredients`, `WizardStepMethod`, `InlineIngredientEditor`, `PortionScaler` und die Rezeptdetail-/Bearbeitungsabläufe.
- Backend-Rezept-API: Import-/Create-/Update-Semantik und Fehlermeldungen müssen den temporären Eingabekontext unterstützen, ohne das persistierte Mengenmodell zu ändern.
- Pydantic-/Django-Ninja-Schemas: Rezept-Import- und ggf. Create-/Update-Responses müssen die erkannte Personenzahl konsistent liefern.
- Zod-Schemas und TanStack-Query-Hooks müssen mit den API-Anpassungen synchron bleiben.
- Bestehende Rezept-, Import-, Mengen- und Wizard-Tests werden erweitert; es ist keine Datenbankmigration vorgesehen, da die Personenzahl nicht persistiert wird.
