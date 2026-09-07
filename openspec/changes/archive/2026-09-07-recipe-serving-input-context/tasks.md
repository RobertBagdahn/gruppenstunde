## 1. Backend-Verträge prüfen und absichern

- [x] 1.1 Die URL-Import- und KI-Responses in `backend/recipe/schemas/import_schemas.py` und den zugehörigen Services auf erkannte Personenzahl und Mengen-Semantik prüfen und bei Bedarf typisiert ergänzen.
- [x] 1.2 Backend-Tests für Importdaten mit erkannter Personenzahl, fehlender Personenzahl sowie Create-/Update-Requests mit weiterhin normalisierten Pro-1-Person-Mengen ergänzen.
- [x] 1.3 Prüfen, dass keine Model- oder Migrationsänderung erforderlich ist und `Recipe.portions=1` bei Create, Update und Fork unverändert erzwungen bleibt.

## 2. Skalierungs- und Kontextlogik im Frontend

- [x] 2.1 `frontend-food/src/lib/cookingQuantityScale.ts` um getestete Funktionen für Gesamtmengen-Kontext, Normierung und sichere Rundung für 1 bis 100 Personen ergänzen oder die bestehende Logik eindeutig dafür verwenden.
- [x] 2.2 Unit-Tests für 1-, 4- und 100-Personen-Werte sowie für neue/importierte Mengen ohne Doppel-Skalierung schreiben.
- [x] 2.3 Den Rezepteditor so strukturieren, dass der Personen-Kontext vor dem Mounten der Zutatenbearbeitung festgelegt wird und danach unveränderlich bleibt.
- [x] 2.4 Bestehende Rezeptmengen bei der Kontextauswahl einmalig von Pro-1-Person-Mengen auf Gesamtmengen skalieren; neue und bereits kontextbezogene Import-/KI-Mengen nicht erneut skalieren.
- [x] 2.5 Save-Pfade für bestehende und neue RecipeItems auf die gemeinsame Normierung durch den gesperrten Kontext umstellen und `Recipe.portions` weiterhin auf 1 belassen.

## 3. Rezept-Wizard und Bearbeitungs-UI

- [x] 3.1 In `WizardStepIngredients` eine mobile-first Personenzahl-Auswahl von 1 bis 100 mit Default 1 vor der Zutatenliste ergänzen.
- [x] 3.2 Den gesperrten Kontext als feste Zusammenfassung „Gesamtmengen für X Personen“ im `InlineIngredientEditor` anzeigen und den bisherigen editierbaren Regler für diesen Ablauf entfernen oder deaktivieren.
- [x] 3.3 Den gleichen vorgelagerten Auswahlablauf für `RecipeDetailPage`/bestehende Rezepte implementieren; beim erneuten Öffnen soll der Kontext nicht aus dem Rezept persistiert werden.
- [x] 3.4 Für URL- und KI-Flows erkannte Personenzahlen übernehmen und bei fehlender Zahl die Zutatenbearbeitung blockieren, bis der Nutzer einen Wert ausgewählt hat.
- [x] 3.5 Vor `handleSave` einen Bestätigungsdialog mit Personenzahl und Normierungs-Hinweis anzeigen; Abbrechen muss unverändert zur Bearbeitung zurückführen.
- [x] 3.6 Relevante Frontend-Komponententests für Auswahl, Sperrung, bestehende Mengen, Dialogabbruch und erfolgreiche Normierung ergänzen.

## 4. API-Fehler und Schema-Synchronisierung

- [x] 4.1 `RecipeWizard.saveRecipe` so erweitern, dass `detail`-Fehler und strukturierte Validierungsfehler aus nicht erfolgreichen Responses extrahiert werden.
- [x] 4.2 Deutsche Toast-/Dialogtexte für konkrete Speicherfehler prüfen und sicherstellen, dass keine Produktionsstelle die Fehlermeldung wieder auf ausschließlich „Speichern fehlgeschlagen“ reduziert.
- [x] 4.3 Backend-Pydantic-Schemas und Frontend-Zod-Schemas für Import-Personenzahlen und den tatsächlichen Response-Vertrag synchronisieren.
- [x] 4.4 API-/Schema-Contract-Tests für erfolgreiche Responses und Fehlerkörper mit `detail` beziehungsweise Validierungsfehlerliste ergänzen.

## 5. End-to-End-Verifikation

- [x] 5.1 E2E-Szenario implementieren: Rezept für 4 Personen auswählen, Gesamtmengen eingeben, Speicherdialog bestätigen und anschließend korrekte Pro-1-Person-/4-Personen-Anzeigen verifizieren.
- [x] 5.2 E2E-Szenarien für Import mit erkannter Personenzahl, Import ohne Personenzahl und abgebrochenen Speicherdialog ergänzen.
- [x] 5.3 `uv run python manage.py makemigrations --check`, relevante Backend-Tests sowie die Food-Frontend-Tests und Typechecks ausführen.
