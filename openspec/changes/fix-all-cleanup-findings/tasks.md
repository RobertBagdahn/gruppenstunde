## 1. Zugriffsschutz und Datenintegrität

- [ ] 1.1 Alle Recipe-, Nutrition-, Quantity-Estimate- und Fork-Endpunkte gegen `food_access` prüfen und private, Draft- sowie fremde Rezepte mit korrektem 403/404 schützen.
- [ ] 1.2 Portion-, Package- und Alias-Mutationen in `backend/supply/api/ingredients.py` konsequent an `can_edit`-/Staff-Regeln binden und die Related-Data-Sichtbarkeit für Draft-Zutaten prüfen.
- [ ] 1.3 MealPlan-, Event- und Recipe-Verknüpfungen auf Fremdobjekt-Berechtigung prüfen und widersprüchliche Beziehungen transaktionssicher ablehnen.
- [ ] 1.4 Permission-Tests für Anonymous, Owner, Gruppenmitglied, Collaborator, fremden Nutzer, Draft/Public/Shared und Staff ergänzen.
- [ ] 1.5 Rezept-Forking in `transaction.atomic()` kapseln, Austauschgruppen inklusive Items vollständig kopieren und Rollback bei einem Kopierfehler testen.
- [ ] 1.6 Löschen von RecipeItems, Portionen und Varianten bei aktiven MealItem-Referenzen korrekt blockieren und den bestehenden 409-Test wieder grün machen.

## 2. Varianten und Berechnungen

- [ ] 2.1 `active_recipe_items()` als einzige Auswahlquelle für Nährwert-, Preis-, Einkaufs- und Kochplanberechnung durchsetzen.
- [ ] 2.2 Default-, optionale und explizit aktive Austauschpositionen in `nutrition_aggregation.py`, `shopping_service.py`, `variant_service.py` und `cooking_schedule_service.py` angleichen.
- [ ] 2.3 Den veralteten `recipe_item_exchange_group`-Zugriff im Kochplan durch die aktuelle `exchange_group`-Beziehung ersetzen und Varianten-/Optional-Fixtures testen.
- [ ] 2.4 Mengen-Overrides und Ausschlüsse in allen Berechnungspfaden konsistent anwenden und Gewicht, Preis sowie Nährwerte gegen Golden Cases prüfen.
- [ ] 2.5 Batch-Varianten mit gemischten Rezept-IDs validieren oder separat verarbeiten, statt die Rezept-ID des ersten Payload-Eintrags zu verwenden.
- [ ] 2.6 Cross-App-Integrationstests für Rezept → Meal → Nutrition/Cost/Shopping sowie Meal → Cooking Schedule mit Option, Default, Alternative und Override ergänzen.

## 3. Package-Export und -Import

- [ ] 3.1 Package-Fixtures in der FK-sicheren Importreihenfolge nach Ingredient/Portion und vor abhängigen RecipeItems registrieren.
- [ ] 3.2 Export-/Import-Handling für Package-Felder, Soft-Deletes und Primärschlüsselreferenzen vervollständigen.
- [ ] 3.3 Idempotenz und Deduplication beim wiederholten Food-Import für Packages und abhängige Portionen prüfen.
- [ ] 3.4 Einen isolierten Fixture-Roundtrip-Test mit Ingredient, Portion, Package, Recipe, RecipeItem und MealItem ergänzen.
- [ ] 3.5 `uv run python manage.py makemigrations --check` und einen vollständigen Import-Test gegen eine frische Testdatenbank ausführen.

## 4. API- und Schema-Synchronisierung

- [ ] 4.1 Alle geänderten Food-Responses auf explizite Pydantic-Schemas umstellen und `response=dict`/`list[dict]` in den betroffenen Endpunkten entfernen.
- [ ] 4.2 `can_edit` und `can_delete` für Detail- und Listenressourcen serverseitig berechnen und in allen korrespondierenden Zod-Schemas abbilden.
- [ ] 4.3 MealPlan-Quellenvertrag zwischen `backend/planner/schemas/meal_plan.py` und `frontend-food/src/schemas/mealPlan.ts` für `recipe_id`, `weight_g`, `count` und optionale Ingredient-Quellen synchronisieren.
- [ ] 4.4 Recipe- und Supply-Schemas für `cached_weight_g`, `shared_groups`, Ownership-/Visibility-Felder, `usage_count`, Packages und AI-Interaktions-IDs synchronisieren.
- [ ] 4.5 Freie Backend-Strings und Frontend-Enums für Visibility, Suggestion-Status und Richtung durch gemeinsame Literal-/Enum-Verträge ersetzen.
- [ ] 4.6 Zod-Parsing- und API-Contract-Tests für Pflichtfelder, Nullbarkeit, Enums und numerische Grenzen ergänzen.

## 5. Fehlerbehandlung und Frontend-Qualität

- [ ] 5.1 Zentrale Response-/Fehlerparser für `frontend-food/src/api/` einführen und Backend-Validierungsdetails bis zur UI weiterreichen.
- [ ] 5.2 Stille Mutation-Fehler in Recipe-Folders, MealPlans, Inline-Editoren und Admin-Guards durch deutsche Toasts, Error States und korrektes 401-Verhalten ersetzen.
- [ ] 5.3 Verbleibende Produktions-`any`-Stellen typisieren und `ContentStepper`-Tag-ID-Verträge ohne Casts korrigieren.
- [ ] 5.4 Hartcodierte Food-Farben auf Theme-Tokens umstellen und Rezeptbilder ausschließlich über `RecipeThumbnail` rendern.
- [ ] 5.5 Offene TODOs für Portionshinweise fachlich entscheiden und entweder implementieren oder aus dem Produktionspfad entfernen.
- [ ] 5.6 `npx tsc --noEmit`, `npm run lint` und `npm test -- --run` im Food-Frontend ausführen und alle verbleibenden Fehler beheben.

## 6. Abschluss und Verifikation

- [ ] 6.1 Backend-Unit- und API-Tests für Berechtigungen, Forking, Varianten, Löschschutz, Import und Fehlerresponses mit `uv run pytest` ausführen.
- [ ] 6.2 Cross-App-Tests für MealPlan, Cooking Schedule, Shopping List, Event-Verknüpfung und Package-Roundtrip ausführen.
- [ ] 6.3 Pydantic-/Zod-Schema-Sync und OpenSpec-Validierung für alle betroffenen Artefakte prüfen.
- [ ] 6.4 `uv run python manage.py check` und `uv run python manage.py makemigrations --check` erfolgreich ausführen.
- [ ] 6.5 Food-Frontend-Qualitätsgates erneut ausführen und die finalen API-/Datenbank-/Migrationsänderungen dokumentieren.
