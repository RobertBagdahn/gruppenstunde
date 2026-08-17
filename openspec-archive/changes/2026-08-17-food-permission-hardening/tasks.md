## 1. Policy-Grundlage

- [x] 1.1 Bestehende Recipe-, Ingredient-, MealPlan-, Group- und Event-Permission-Helfer inventarisieren und zentrale Policy-Schnittstelle in `backend/content/services/food_access.py` festlegen.
- [x] 1.2 Resolver für `can_read`, `can_edit`, `can_delete`, `can_fork` und `can_export` für Owner, Collaborator, Gruppenmitglied, Gruppenadmin und Staff implementieren.
- [x] 1.3 404-/403-Verhalten für unsichtbare beziehungsweise sichtbare, aber nicht erlaubte Ressourcen in einem gemeinsamen API-Helper standardisieren.
- [x] 1.4 Policy mit `select_related`/`prefetch_related` integrieren und Query-Anzahl für typische Detail- und Listenabfragen prüfen.

## 2. Backend Recipe- und Ingredient-Schutz

- [x] 2.1 Sichtbarkeitsprüfung in Recipe-Nutrition-, Nutri-Score-, Improvement-, Rules- und Breakdown-Endpoints einsetzen.
- [x] 2.2 Sichtbarkeitsprüfung in `fork_recipe`, `estimate_quantities`, Suggestions und allen Recipe-Exportpfaden einsetzen.
- [x] 2.3 Recipe-Visibility für Owner, Collaborators, explizite Gruppenmitglieder, Gruppenadmins und Staff abbilden.
- [x] 2.4 Ingredient-Detail-, Portion-, Package- und Alias-Endpoints mit Owner-/Staff-/Gruppenadmin-Rechten schützen.
- [x] 2.5 Ingredient- und Recipe-Zugriff in Frühstücks- und anderen öffentlichen Katalogen auf public/system freigegebene Ressourcen begrenzen.
- [x] 2.6 Recipe- und Ingredient-Referenzen beim Erstellen von MealItems und RecipeItems über die zentrale Policy validieren.
- [x] 2.7 Detail-, Such- und Exportpfade so anpassen, dass private Daten nur für berechtigte Nutzer erscheinen und sonst vollständig fehlen.

## 3. Soft-Delete und Datenintegrität

- [x] 3.1 `deleted_at`-Felder für Recipe und Ingredient als neue Datenbankmigration hinzufügen.
- [x] 3.2 Querysets, Manager, Listen, Suche, Kataloge und Exporte standardmäßig um soft-gelöschte Ressourcen bereinigen.
- [x] 3.3 Delete-Endpoints auf Soft-Delete umstellen und neue Referenzen auf gelöschte Recipes/Ingredients ablehnen.
- [x] 3.4 MealItem-/RecipeItem-Responses für erhaltene, aber nicht verfügbare Referenzen definieren und Berechnungen dort überspringen.
- [x] 3.5 Staff-Wiederherstellung oder Admin-Verwaltung soft-gelöschter Ressourcen prüfen und, falls nicht benötigt, explizit ausschließen.
- [ ] 3.6 Migration mit `uv run python manage.py makemigrations` erstellen und `makemigrations --check` sowie Datenbank-Referenzprüfung ausführen.

## 4. Event-MealPlan-Relation

- [x] 4.1 Relation-Modell mit `event`, `meal_plan`, Zeitstempeln und Unique-Constraint auf einen MealPlan implementieren.
- [x] 4.2 Bestehende Event-/MealPlan-Foreign-Key-Daten per Migration übertragen und bei Konflikten die MealPlan-Verknüpfung priorisieren.
- [x] 4.3 Konflikt- und Migrationsbericht für widersprüchliche Altbeziehungen bereitstellen.
- [x] 4.4 Event- und MealPlan-Create-/Update-/Clear-Endpoints auf die Relation umstellen und Edit-Rechte auf beiden Seiten verlangen.
- [x] 4.5 Alte Foreign Keys erst nach erfolgreicher Datenmigration entfernen und Reverse-Migration dokumentieren.

## 5. Audit-Logging

- [x] 5.1 Audit-Modell für Staff-Detail- und Exportzugriffe mit Ressourcentyp, Ressource, Endpoint, User, Zeitpunkt und Ergebnis anlegen.
- [x] 5.2 Audit-Einträge ausschließlich für Staff-Zugriffe auf private Detail- und Export-Endpoints erzeugen.
- [x] 5.3 Cleanup-Management-Command oder bestehenden Cleanup-Prozess für 30-Tage-Retention und Batch-Löschung ergänzen.
- [x] 5.4 Audit-Migration und Zugriffsschutz für Audit-Daten implementieren.

## 6. API-Schemas und Frontend-Verträge

- [x] 6.1 Betroffene Pydantic-Resource-Schemas auf `HasPermissions` beziehungsweise verpflichtende `can_edit`-/`can_delete`-Felder umstellen.
- [x] 6.2 Untypisierte Food-Responses in den geänderten Endpoints durch benannte Pydantic-Out-Schemas ersetzen.
- [x] 6.3 Betroffene Zod-Schemas in `frontend-food/src/schemas` strikt an die Backend-Responses angleichen.
- [x] 6.4 Frontend-Permission-Controls ausschließlich aus `can_edit` und `can_delete` steuern und clientseitige User-ID-Prüfungen entfernen.
- [x] 6.5 Kritische Recipe-, Ingredient- und MealPlan-Seiten auf 404-/403-Fehlerzustände und deutsche Fehlermeldungen prüfen.

## 7. Backend-Tests

- [x] 7.1 Policy-Unit-Tests für Owner, Collaborator, aktives Gruppenmitglied, Gruppenadmin, Staff, fremden User und anonymen User schreiben.
- [x] 7.2 Happy-Path- und 401/403/404-API-Tests nur für Recipe-Detail, Nutrition und Fork ergänzen.
- [x] 7.3 Happy-Path- und 401/403/404-API-Tests nur für Ingredient-Detail, Portion und Package ergänzen.
- [x] 7.4 Einen Cross-Resource-Test für ein unberechtigtes Recipe-zu-MealItem und einen für Ingredient-zu-RecipeItem ergänzen.
- [x] 7.5 Soft-Delete-Tests für Erhalt bestehender Referenzen, Ablehnung neuer Referenzen und Ausschluss aus Listen/Katalogen schreiben.
- [x] 7.6 Relation-Migrations- und API-Tests für konsistente sowie widersprüchliche Legacy-Verknüpfungen schreiben.
- [x] 7.7 Staff-Audit- und 30-Tage-Cleanup-Tests schreiben.
- [x] 7.8 Regressionstests für Permission-Felder und typisierte Response-Schemas ergänzen.

## 8. Frontend-Tests und Verifikation

- [x] 8.1 Vitest-Setup für DOM-Komponententests und QueryClient-Testwrapper reparieren, ohne reine Node-Tests zu beeinträchtigen.
- [x] 8.2 Tests nur für Edit-, Delete- und Fork-Controls auf Recipe-, Ingredient- und MealPlan-Details mit serverseitigen Permission-Feldern schreiben.
- [x] 8.3 Zod-Contract-Tests für fehlende und vollständige `can_edit`-/`can_delete`-Felder ergänzen.
- [x] 8.4 Food-Frontend-Typecheck und ESLint-Fehler in den betroffenen API-/Komponentenpfaden beheben.
- [x] 8.5 Backend-Food-Tests mit `uv run pytest` und Frontend-Tests mit `npm test -- --run` ausführen.
- [ ] 8.6 Desktop- und Mobile-Smoke-Tests für Recipe-, Ingredient- und MealPlan-Detailseiten durchführen.

## 9. Release-Verifikation

- [ ] 9.1 Staging-Datenbank sichern und Relation-/Soft-Delete-Migration als Dry-Run ausführen.
- [x] 9.2 `uv run python manage.py check`, `uv run python manage.py makemigrations --check` und die kritischen Food-Testgruppen erfolgreich ausführen.
- [ ] 9.3 Pydantic-/Zod-Schema-Synchronität anhand realer API-Responses prüfen.
- [ ] 9.4 Berechtigungs- und Soft-Delete-Smoke-Tests mit anonymem User, Owner, Gruppenmitglied, Gruppenadmin, Collaborator und Staff durchführen.
- [x] 9.5 Rollback- und Recovery-Schritte für Migration, Relation und Soft-Delete dokumentieren.
