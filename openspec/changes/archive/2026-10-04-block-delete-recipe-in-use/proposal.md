# Rezept löschen blockieren, solange es in einem Essensplan steckt

## Why

Beim Produktivtest (essensplan.app, 2026-10-03) wurde ein Rezept gelöscht, das in einem Essensplan verwendet wurde. Der Lösch-Dialog warnte nicht. Danach zählte der Plan das gelöschte Rezept weiter mit (Kosten 25,84 €, 28,42 € inkl. Reserve, 825 kcal), die Einkaufsliste war aber leer. Auch eine Plankopie übernahm das gelöschte Rezept samt Kosten. Kosten, Nährwerte und Einkaufsliste widersprechen sich, und der Plan verweist auf ein Rezept, das 404 liefert.

## What Changes

- `DELETE /api/recipes/{id}/` liefert `409`, wenn das Rezept in mindestens einer Mahlzeit eines Essensplans (`MealItem.recipe`) verwendet wird. Bisher wird nur bei aktiven Varianten geblockt.
- Neuer Endpunkt `GET /api/recipes/{id}/usage/` liefert die Anzahl der Pläne, die das Rezept verwenden, sowie die Pläne, die der Nutzer sehen darf (ID, Name).
- Der Lösch-Dialog auf der Rezept-Detailseite lädt die Nutzung vorab. Wird das Rezept verwendet, nennt der Dialog die Pläne, der „Löschen“-Button ist deaktiviert, und ein Link führt zum jeweiligen Plan.
- Soft-gelöschte Rezepte werden in Plan-Kosten, -Nährwerten und -Kopien nicht mehr berücksichtigt. Das ist ein Sicherheitsnetz für Bestandsdaten, die bereits ein gelöschtes Rezept in einem Plan haben.
- Bereinigung: Ein Management-Command listet bestehende Plan-Einträge mit gelöschtem Rezept (Dry-Run) und entfernt sie nur mit `--apply`.

## Capabilities

### Modified Capabilities
- `recipe`: Löschregel für verwendete Rezepte, Nutzungs-Endpunkt und Dialog.
- `meal-plan-integrity`: Pläne dürfen keine Einträge mit soft-gelöschten Rezepten in Berechnung und Kopie mitführen.

## Impact

- **Backend:** `backend/recipe/api/recipes.py` (`delete_recipe`, neuer Usage-Endpunkt), `backend/recipe/schemas/`, `backend/planner/` (Berechnung und Plankopie, Filter auf `recipe__deleted_at__isnull=True`), neues Command unter `backend/planner/management/commands/`.
- **Frontend (frontend-food):** `RecipeDetailPage.tsx` (Dialog), neuer TanStack-Query-Hook und Zod-Schema für den Usage-Endpunkt (synchron zum Pydantic-Schema).
- **Produktion:** Das Bereinigungs-Command wird erst im gebündelten Prod-Rollout mit Dry-Run ausgeführt, `--apply` nur nach ausdrücklichem OK.
