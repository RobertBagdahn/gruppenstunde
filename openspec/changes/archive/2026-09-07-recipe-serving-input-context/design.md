## Context

Das Backend behandelt `Recipe.portions` und `RecipeItem.quantity` bereits als normalisierte Pro-1-Person-Daten. Der Food-Frontend-Editor (`InlineIngredientEditor`) bietet dagegen einen temporären Personenregler, skaliert Werte für die Anzeige und teilt sie beim Speichern wieder durch den Reglerwert. Beim Erstellen startet dieser Kontext faktisch mit 1, wodurch Gesamtmengen für mehrere Personen leicht falsch interpretiert werden.

Die Änderung betrifft den Rezept-Wizard, den Zutateneditor auf der Rezeptdetailseite, URL-/KI-Importe und die gemeinsame Frontend-Fehlerbehandlung. Der persistierte Datenvertrag soll unverändert bleiben: Es wird keine Eingabe-Personenzahl am Rezept gespeichert.

## Goals / Non-Goals

**Goals:**

- Vor dem Öffnen der Zutatenbearbeitung einen temporären Personen-Kontext von 1 bis 100 festlegen.
- Bei bestehenden Rezepten die Pro-1-Person-Daten erst nach dieser Auswahl als Gesamtmengen für den Kontext anzeigen.
- Bei neuen, importierten und KI-generierten Rezepten die bereits erkannten Mengen nicht ungefragt zusätzlich hochskalieren.
- Die Personenzahl nach Beginn der Zutatenbearbeitung sperren und sichtbar zusammenfassen.
- Gesamtmengen beim Speichern zuverlässig auf Pro-1-Person-Mengen normieren.
- Vor dem Speichern mit einem Dialog bestätigen, für wie viele Personen die Mengen gelten.
- Import-/KI-Personenzahlen übernehmen oder bei fehlender Zahl eine Auswahl erzwingen.
- Die echte Backend-Fehlermeldung aus fehlgeschlagenen Wizard-PATCH-Requests anzeigen.
- Backend-Pydantic- und Frontend-Zod-Verträge für erkannte Import-Personenzahlen prüfen und synchronisieren.

**Non-Goals:**

- Keine Änderung der persistierten Semantik von `RecipeItem.quantity`.
- Keine neue dauerhaft gespeicherte Rezept-Personenzahl.
- Keine Änderung der Kochansicht-, Einkaufslisten-, PDF- oder Meal-Plan-Skalierung außerhalb ihrer bestehenden Nutzung des normalisierten Rezeptmodells.
- Keine Datenbankmigration.

## Decisions

### 1. Temporärer Kontext statt Model-Feld

Die Personenzahl bleibt Frontend-State des jeweiligen Erstellungs- oder Bearbeitungsvorgangs. Sie wird nicht an `Recipe` gespeichert, weil sie den Eingabekontext und nicht die fachliche Rezeptdefinition beschreibt. Beim erneuten Öffnen startet der Ablauf wieder mit 1 beziehungsweise verlangt bei Importen ohne erkannte Zahl eine neue Auswahl.

**Alternative:** Ein `servings`-Feld am Rezept zu pflegen. Das würde die bestehende Normalisierung und alle Konsumenten semantisch vermischen und ist ausdrücklich nicht gewünscht.

### 2. Personenzahl vor dem Zutateneditor festlegen und sperren

`WizardStepIngredients` und der Bearbeitungsablauf erhalten eine vorgelagerte Auswahl mit ganzzahligen Werten von 1 bis 100. Erst nach der Auswahl wird `InlineIngredientEditor` mit einem unveränderlichen Kontext gerendert. Im Editor wird statt eines editierbaren Reglers eine Zusammenfassung wie „Gesamtmengen für 4 Personen“ angezeigt.

Für ein bestehendes Rezept werden die gespeicherten Pro-1-Person-Mengen bei der Initialisierung einmalig mit dem gewählten Kontext skaliert. Für neue/importierte Daten, die bereits als Gesamtmengen für den erkannten Kontext vorliegen, wird keine zweite Skalierung vorgenommen.

**Alternative:** Den Regler während der Bearbeitung aktiv lassen. Das erlaubt unklare Mischzustände und war die Ursache des beschriebenen Fehlers.

### 3. Normierung an einer klaren Save-Grenze

Der Editor führt intern einen `inputPortions`-Kontext. Alle Werte, die der Nutzer im Editor sieht, sind Gesamtmengen für diesen Kontext. Beim Anlegen und Aktualisieren wird ausschließlich an der Save-Grenze durch `inputPortions` geteilt. `Recipe.portions` bleibt dabei 1; ein übermitteltes `portions`-Feld wird weiterhin nicht als persistierter Eingabekontext verwendet.

Die Skalierungshelfer in `frontend-food/src/lib/cookingQuantityScale.ts` werden für diesen Vertrag genutzt oder angepasst und mit Tests für 1, 4 und 100 Personen abgesichert.

### 4. Import- und KI-Flows liefern den Mengenstatus explizit

Der URL-Import besitzt bereits `recipe_draft.servings`; dieser Wert wird als erkannter Kontext behandelt. Wenn er fehlt oder nicht verlässlich ist, blockiert der Wizard den Übergang zur Zutatenbearbeitung bis zur manuellen Auswahl. Der KI-Create-Response muss dieselbe Information entweder als vorhandenen Rezeptkontext liefern oder den Zustand „Personenzahl erforderlich“ ermöglichen.

Die Importlogik darf eine bereits für N Personen gelieferte Menge nicht nochmals als N-Personen-Menge skalieren. Die bestehende technische Normierung für die API wird beibehalten, aber die UI muss eindeutig wissen, ob die erhaltenen Daten bereits normiert oder kontextbezogen sind.

### 5. Explizite Bestätigung über vorhandenen Dialog-Mechanismus

Vor `handleSave` wird ein modalartiger Bestätigungszustand geöffnet. Der Dialog nennt die konkrete Personenzahl und erklärt, dass die Daten intern auf Pro-1-Person-Mengen normiert werden. „Abbrechen“ schließt den Dialog und lässt alle Eingaben unverändert; die Personenzahl bleibt gesperrt.

**Alternative:** Nur ein permanenter Hinweis. Das wäre weniger störend, schützt aber gerade den kritischen Fehlbedienungsfall nicht ausreichend.

### 6. API-Fehlerkörper auswerten

Der lokale `saveRecipe`-Helper in `RecipeWizard.tsx` liest bei einem nicht erfolgreichen Response den JSON-Fehlerkörper aus und verwendet `detail` beziehungsweise strukturierte Validierungsfehler als `Error.message`. Dadurch bleibt die vorhandene Toast-Oberfläche erhalten, zeigt aber nicht mehr ausschließlich „Speichern fehlgeschlagen“.

Betroffene Verträge und Pfade:

- `POST /api/recipes/` und `PATCH /api/recipes/{recipe_id}/`: bestehende RecipeCreateIn/RecipeUpdateIn-Requests, weiterhin normalisierte `RecipeItem.quantity`-Werte.
- URL-Import-Preview-Response: `recipe_draft.servings` muss im Pydantic-Schema und im Zod-Schema synchron als erkannte Zahl behandelt werden.
- `backend/recipe/schemas/recipes.py`, `backend/recipe/schemas/import_schemas.py` und zugehörige Frontend-Schemas in `frontend-food/src/schemas/recipe.ts` beziehungsweise `recipeImport.ts`.
- `frontend-food/src/components/recipe/RecipeWizard.tsx`, `WizardStepMethod.tsx`, `WizardStepIngredients.tsx`, `InlineIngredientEditor.tsx`, `PortionScaler.tsx` und `RecipeDetailPage.tsx`.

### 7. Teststrategie

- Pure Frontend-Tests für Skalierung, Normierung und den gesperrten Kontext.
- Komponenten-/Wizard-Tests für Personenauswahl, bestehende Rezeptmengen, Import ohne Personenzahl, Bestätigungsdialog und API-Fehlermeldungen.
- Backend-Tests für Import-/Create-/Update-Verträge und die unveränderte Pro-1-Person-Speicherung.
- E2E-Test für „4 Personen, Gesamtmengen eingeben, speichern, anschließend korrekte Mengen anzeigen“.

## Risks / Trade-offs

- **[Risiko]** Importdaten können je nach Quelle bereits pro Person oder als Gesamtmenge geliefert werden. → Import-Service und Tests müssen den Mengenstatus explizit festlegen; keine heuristische Doppel-Skalierung.
- **[Risiko]** Der Wizard legt ein Rezept frühzeitig an und speichert Schritte in mehreren Requests. → Der Personen-Kontext bleibt rein im Frontend; jede API-Grenze normiert unabhängig und zeigt ihre konkrete Fehlermeldung.
- **[Risiko]** Rundungen bei sehr kleinen Mengen können die Summe leicht verändern. → Bestehende Präzision der Skalierungshelfer beibehalten und Grenzfälle mit 1, 4 und 100 testen.
- **[Risiko]** Der bestehende Detailseiten-Editor und der Wizard haben unterschiedliche Lebenszyklen. → Einen gemeinsamen Input-Kontext-/Skalierungsvertrag verwenden, aber die Auswahl jeweils vor dem Mounten des Editors erzwingen.
- **[Risiko]** Nutzer erwarten möglicherweise eine dauerhaft sichtbare Rezeptportion. → Im UI klar zwischen „Gesamtmengen für diesen Bearbeitungsvorgang“ und der späteren Kochansicht unterscheiden.

## Migration Plan

Keine Datenbankmigration und kein Backfill. Bestehende Rezeptdaten bleiben unverändert Pro-1-Person-Daten. Nach Deployment verwenden neue Editor-Sessions den verpflichtenden temporären Kontext; beim Abbruch oder erneuten Öffnen wird er erneut gewählt.

Rollback erfolgt durch Zurücksetzen der Frontend- und API-Codeänderungen. Da keine persistierten Datenstrukturen geändert werden, ist kein Datenbank-Rollback erforderlich.

## Open Questions

- Die genaue Herkunft und Semantik des KI-Create-Personenwerts muss bei der Implementierung gegen den tatsächlichen Service-Response geprüft werden.
- Es muss entschieden werden, ob die bestehende `recipe-quantity-display`-Spec als Delta-Datei oder durch eine ergänzende Requirement-Anpassung gepflegt wird.
