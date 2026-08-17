## Why

Die bisherige "Eintrag kopieren"-Funktion erlaubt nur das Kopieren einzelner Items innerhalb desselben Essensplans. Das ist unflexibel: Gruppenleiter, die bereits existierende Speisepläne von Lagern oder Veranstaltungen als Vorlage nutzen wollen, müssen mühsam jedes Rezept einzeln suchen und hinzufügen. Eine Kopierfunktion, die aus beliebigen bestehenden Essensplänen schöpft, spart enorm Zeit und fördert Wiederverwendung bewährter Verpflegungspläne.

## What Changes

- **BREAKING**: Die bestehende "Eintrag kopieren"-Funktion (einzelnes Item in andere Meal innerhalb desselben Plans) wird durch eine neue, planübergreifende Kopierfunktion ersetzt
- **Neu**: Pro Mahlzeit (Meal) ein "Aus anderem Plan kopieren"-Button im MealActionsMenu
- **Neu**: Pro Item ein "Aus anderem Plan kopieren"-Button (ersetzt den bisherigen Copy-Button)
- **Neu**: Mehrstufiger Dialog zur Auswahl von Quell-Plan → Tag → Mahlzeit → Items
- **Neu**: Backend-Endpoint zum Kopieren von Items aus einem fremden Plan in eine Meal
- **Entfernt**: Der alte `POST /{plan_id}/meal-items/{item_id}/copy/`-Endpoint (wird durch den neuen ersetzt)

## Capabilities

### New Capabilities
- `meal-item-copy`: Kopieren von MealItems aus anderen Essensplänen (cross-plan) inkl. mehrstufigem Auswahldialog

### Modified Capabilities
- `meal-item-copy`: Bestehende Spec wird komplett durch das neue cross-plan Verhalten ersetzt

## Impact

- **Backend**: Neuer Endpoint in `backend/planner/api/meal_plan.py`, neues Schema in `backend/planner/schemas/meal_plan.py`
- **Frontend**:
  - Neues `CopyFromPlanDialog` in `frontend-food/src/pages/planning/`
  - Neuer API-Hook in `frontend-food/src/api/mealPlans.ts`
  - Neues Zod-Schema in `frontend-food/src/schemas/mealPlan.ts`
  - Anpassung von `MealActionsMenu.tsx` und `MealSlot.tsx`
  - Anpassung von `MealEventDetailPage.tsx` (Verkabelung)
- **Keine Migrationen** nötig (keine neuen Model-Felder)
