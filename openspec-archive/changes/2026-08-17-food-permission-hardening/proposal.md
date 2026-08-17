## Why

Der Food-Bereich ist vor dem Livegang an mehreren Stellen nicht konsistent abgesichert: einzelne Rezept-, Ingredient-, MealPlan- und Event-Endpunkte prüfen nur die Anmeldung oder umgehen die zentrale Visibility-Logik vollständig. Dadurch können Nutzer fremde Daten lesen, verändern, exportieren oder in eigene Pläne übernehmen. Gleichzeitig fehlen verpflichtende Permission-Felder in einzelnen API-Verträgen und belastbare Autorisierungstests.

Der Change bündelt die Berechtigungs-, API-Vertrags- und Testgrundlagen für einen kontrollierten Food-Livegang. Die Daten gelten fachlich nicht als besonders sensibel, trotzdem sollen unberechtigte Änderungen, Katalog-Leaks und inkonsistente Beziehungen zuverlässig verhindert werden.

## What Changes

- Eine zentrale Food-Policy für Recipe, Ingredient, Portion, Package, MealPlan und Event-Zugriff einführen.
- Sichtbarkeit auf `private`, `group` und `public` standardisieren; nicht veröffentlichte Inhalte bleiben außerhalb berechtigter Zugriffe unsichtbar.
- Private Recipes nur für Owner, Collaborators und explizit freigegebene Gruppen zugänglich machen.
- Private Ingredients auf den Owner beschränken; Staff erhält vollständige Moderationsrechte.
- Gruppenadmins dürfen gruppensichtbare Recipes und Ingredients bearbeiten.
- Collaborators erhalten bei Recipes vollständige Bearbeitungsrechte.
- Forking sichtbarer Recipes erlauben; Nutrition-, Suggestions-, Estimate-, Katalog-, MealItem- und Export-Endpunkte serverseitig absichern.
- `can_edit` und `can_delete` in allen betroffenen Pydantic- und Zod-Detailverträgen strikt synchronisieren.
- Betroffene untypisierte Food-Responses durch Pydantic-Response-Schemas ersetzen.
- Erfolgreiche Staff-Zugriffe auf private Daten bei Detail- und Export-Endpoints 30 Tage auditieren.
- Recipes und Ingredients mit `deleted_at` soft-deletable machen; bestehende MealItems/Referenzen bleiben erhalten, neue Nutzung wird verhindert.
- Die Event-/MealPlan-Verknüpfung in eine Relation-Tabelle überführen, bestehende Daten migrieren und bei Konflikten die MealPlan-Verknüpfung priorisieren. Ein MealPlan bleibt höchstens einem Event zugeordnet.
- Backend-Tests für Happy Path sowie 401/403/404 und Frontend-Tests für alle relevanten Permission-Controls ergänzen.
- **BREAKING**: Unberechtigte Zugriffe auf unsichtbare Ressourcen liefern 404; bekannte Ressourcen ohne erforderliche Aktion liefern 403.
- **BREAKING**: Zod-Schemas verlangen Permission-Felder strikt und akzeptieren fehlende Felder nicht mehr.

## Capabilities

### New Capabilities

- `food-access-policy`: Einheitliche Sichtbarkeits-, Rollen- und Cross-Resource-Regeln für Food-Ressourcen.
- `food-soft-delete`: Soft-Delete und Referenzverhalten für Recipes und Ingredients.
- `food-access-audit`: Zeitlich begrenztes Audit-Logging für Staff-Detail- und Exportzugriffe.
- `event-mealplan-relation`: Kanonische Relation zwischen Event und MealPlan mit Datenmigration.

### Modified Capabilities

- `permission-system`: Food-Ressourcen verwenden explizite Owner-, Collaborator-, Gruppenadmin-, Gruppenmitglied- und Staff-Regeln; die bisherige transitive Sichtbarkeit wird auf die neuen Nutzungsvoraussetzungen abgestimmt.
- `permission-base-schema`: Alle betroffenen Food-Detail- und List-Resource-Schemas liefern strikt serverseitige `can_edit`- und `can_delete`-Felder.
- `recipe`, `ingredient-database` und `meal-plan`: Die neuen `food-access-policy`-Anforderungen ändern die Zugriffspfade dieser bestehenden Features.

## Impact

- Backend: `recipe`, `supply`, `planner`, `event`, `content` und gegebenenfalls `profiles` für Gruppenmitgliedschaft und Auditdaten.
- Frontend: `frontend-food/src/schemas`, Recipe-/Ingredient-/MealPlan-Detailseiten, Actions, Drag-and-Drop, Gruppenverwaltung und Exporte.
- API: Sichtbarkeitsfilter, Permission-Felder, Response-Schemas, Statuscodes und Event-/MealPlan-Link-Endpunkte ändern sich.
- Datenbank: `deleted_at`-Felder, Audit-Daten und eine neue Event-/MealPlan-Relation mit Migration bestehender Foreign-Key-Daten.
- Tests: Backend-Autorisierungsmatrix, Cross-Resource-Flows, Soft-Delete und Frontend-Permission-Controls.
- Keine Änderungen an der Food/Main-Frontend-Trennung.
