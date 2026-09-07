## Context

Die Cleanup-Befunde liegen über mehrere Django-Apps und das eigenständige Food-Frontend verteilt. Ein Teil der Berechnungen nutzt bereits den zentralen `calculation_context`, während andere Pfade noch eigene Variantenauswahl oder veraltete Modelattributnamen verwenden. Zugriffe werden zunehmend über `content.services.food_access` geschützt, müssen aber für alle mutierenden und analysierenden Endpunkte konsistent sein. Der Export kennt Packages bereits, der Import lädt sie noch nicht in einer FK-sicheren Reihenfolge.

Betroffene Kernstellen sind unter anderem `backend/recipe/api/recipes.py`, `backend/recipe/api/nutrition.py`, `backend/recipe/api/items.py`, `backend/recipe/services/nutrition_aggregation.py`, `backend/planner/api/meal_plan.py`, `backend/planner/services/calculation_context.py`, `backend/planner/services/cooking_schedule_service.py`, `backend/supply/api/ingredients.py`, `backend/core/management/commands/import_prod_data.py` und die Zod-/API-Schichten unter `frontend-food/src/`.

## Goals / Non-Goals

**Goals:**

- Einen einzigen fachlichen Auswahlkontext für normale, optionale, Default- und aktive Austausch-Zutaten in allen Berechnungspfaden verwenden.
- Alle Food-Endpunkte vor Datenzugriff und Mutation mit serverseitigen Sichtbarkeits- und Permission-Policies schützen.
- Forking, Löschen, Export und Import transaktionssicher sowie reproduzierbar machen.
- Backend- und Frontend-Verträge explizit typisieren und ihre Fehlerfälle testen.
- Food-Frontend-Build, Tests und Lint ohne bekannte Blocker ausführen können.

**Non-Goals:**

- Keine neue Authentifizierungsart und kein JWT.
- Keine Food-Funktionalität im Haupt-Frontend.
- Keine Rückwärtskompatibilitäts- oder Legacy-API-Schicht.
- Keine fachliche Neugestaltung der Nährwertdefinitionen außerhalb der Variantenauswahl.

## Decisions

### Zentraler Berechnungskontext

`planner.services.calculation_context.active_recipe_items()` bleibt die kanonische Quelle für aktive RecipeItems. Nährwertaggregation, Einkaufsliste und Kochplan verwenden diesen Kontext; direkte Filter auf `exchange_group` oder `active_recipe_item_ids` werden entfernt bzw. nur noch in diesem Service gekapselt. Ein leerer Auswahlwert bedeutet Default-Verhalten: normale Zutaten und Default-Austauschpositionen werden berücksichtigt, optionale Zutaten folgen der bestehenden Produktentscheidung und werden durch explizite Auswahl aktivierbar.

### Zugriffsschutz vor allen Fachoperationen

Sichtbarkeit wird über die zentralen `food_access`-Funktionen geprüft. Analyse-, Fork-, Mengen-Schätzungs-, MealPlan- und Related-Data-Endpunkte dürfen keine privaten oder Draft-Daten über direkte IDs preisgeben. Mutation-Endpunkte verwenden ausschließlich serverseitig berechnete `can_edit`/`can_delete`-Regeln. Die Permission-Matrix wird als API-Testmatrix für Anonymous, Owner, Gruppenmitglied, Collaborator, fremde Nutzer und Staff abgebildet.

### Atomare Datenänderungen

Rezept-Forking und zusammengesetzte Package-/Portion-Operationen laufen in `transaction.atomic()`. Bei einem Fehler darf weder ein halber Fork noch eine inkonsistente Beziehung persistiert werden. Bestehende Migrationen werden nicht geändert; erforderliche Modelländerungen erhalten neue Migrationen.

### Export-/Import-Reihenfolge

Packages werden nach Ingredients und vor RecipeItems importiert. Die Exportdefinition bleibt modellbasiert und wird um abhängige M2M-/FK-Referenzen geprüft. Ein Fixture-Roundtrip mit Ingredient, Portion, Package, RecipeItem und MealItem dient als Integrationsnachweis.

### API-Verträge und Frontend-Fehler

Jeder geänderte Food-Endpunkt erhält ein explizites Pydantic-Response-Schema. Die korrespondierenden Zod-Schemas werden 1:1 angepasst. Das Food-Frontend verwendet zentrale Response-/Fehlerparser und TanStack Query; Mutation- und Ladefehler zeigen deutsche, konkrete Fehlermeldungen statt stiller `catch`-Blöcke.

### Verifikation

Die Implementierung wird schrittweise mit `uv run pytest` für Backend-Tests, `npx tsc --noEmit`, `npm run lint` und `npm test -- --run` im Food-Frontend geprüft. Kritische Cross-App-Fälle werden als API-/Integrationstests ausgeführt, nicht nur als isolierte Service-Tests.

## Risks / Trade-offs

- [Risiko] Eine strengere Sichtbarkeit kann bisher ungeschützte, aber tatsächlich genutzte Zugriffe abbrechen. → Vorher vorhandene Zugriffsfälle identifizieren und Owner-/Gruppen-/Staff-Szenarien explizit testen.
- [Risiko] Die zentrale Variantensemantik kann bestehende Einkaufs- oder Kochplanmengen verändern. → Golden-Case-Fixtures für Default, Option, Alternative und Override vor/nach der Änderung vergleichen.
- [Risiko] Neue Import-Reihenfolge oder Soft-Delete-Daten können alte Fixtures enthalten. → Idempotenten Import, Deduplication und einen isolierten Roundtrip-Test verwenden.
- [Risiko] Contract-Anpassungen brechen veraltete Food-Frontend-Aufrufer. → Zod-Parsing und TypeScript-Build als Pflicht-Gate ausführen; keine versteckten Fallback-Typen einführen.
- [Risiko] Der Change ist breit und schwer reviewbar. → Aufgaben nach Sicherheitszugriff, Berechnung, Datenroundtrip, Contracts und Qualität trennen und jede Gruppe mit Tests abschließen.
