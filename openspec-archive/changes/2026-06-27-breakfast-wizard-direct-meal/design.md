## Context

Der Frühstücksassistent existiert als 5-Schritt-Wizard unter `/meal-plans/:id/ref-meals/breakfast/wizard`. Er speichert die Wizard-Konfiguration als `RefMeal` (ein `Meal` mit `is_reference=True`) über den RefMeal-API-Endpoint. Um das Ergebnis im Tagesplan zu nutzen, muss der Nutzer das RefMeal manuell mit einem konkreten Meal verknüpfen.

Die Nutzeranforderung: Der Wizard soll direkt aus dem Frühstück-MealSlot heraus aufrufbar sein und das Ergebnis direkt in dieses Meal als `MealItem`s speichern — ohne den RefMeal-Zwischenschritt.

## Goals / Non-Goals

**Goals:**
- "Frühstücksassistent"-Button im MealSlot für Frühstück-Mahlzeiten
- Batch-Endpoint zum atomaren Speichern aller Wizard-Items in einem Meal
- Wizard arbeitet in zwei Modes: `refMeal` (bestehend) und `directMeal` (neu)
- Warnung vor dem Überschreiben, wenn Ziel-Meal bereits Items enthält
- Existierender RefMeal-Wizard-Flow bleibt unverändert

**Non-Goals:**
- Wizard für andere Mahlzeit-Typen (Mittagessen, Abendessen)
- RefMeal-Wizard-Flow entfernen oder ändern
- UI-Neugestaltung des MealSlot (nur ein Button wird hinzugefügt)

## Decisions

### 1. Batch-Endpoint statt sequenzieller Einzel-Calls

**Entscheidung**: Neuer dedizierter Endpoint `POST /api/meal-plans/{plan_id}/meals/{meal_id}/wizard-items/` der alle Items atomar in einer Transaktion ersetzt.

```python
class WizardItemsIn(Schema):
    items: list[MealItemCreateIn]

class WizardItemsOut(Schema):
    meal_id: int
    items: list[MealItemOut]
```

**Alternativen**:
- Sequenzielle `POST /meals/{id}/items/` Calls: 14+ Roundtrips, Teil-Save-Risiko
- Generischer `POST /meals/{id}/items/batch/`: Over-Engineering für aktuellen Use Case

**Begründung**: Der Wizard produziert ein abgeschlossenes Set an Items, das das gesamte Frühstück repräsentiert. Ein dedizierter Endpoint macht die Semantik klar und erlaubt atomares Ersetzen in einer Transaktion.

### 2. Wizard-Mode über URL-Route statt Query-Parameter

**Entscheidung**: Zwei getrennte URL-Routen, die denselben Wizard-Component mit unterschiedlichem `saveMode` rendern:

| Route | Save-Mode | Redirect nach Save |
|-------|-----------|-------------------|
| `/meal-plans/:id/ref-meals/breakfast/wizard` | `refMeal` | RefMealEditor |
| `/meal-plans/:id/meals/:mealId/breakfast-wizard` | `directMeal` | MealEventDetailPage |

**Alternativen**:
- Query-Parameter `?mode=direct`: Semantisch inkorrekt für eine `ref-meals` Route
- Komplett separater Wizard-Component: Code-Duplizierung

**Begründung**: Die Route codiert die Semantik des Save-Ziels. Ein `saveMode` Prop steuert `handleSave` und `navigate`-Ziel. Der Wizard-Component selbst ist zu 95% identisch.

### 3. Überschreib-Semantik mit Warn-Dialog

**Entscheidung**: Der Wizard ersetzt immer alle existierenden Items. Wenn das Ziel-Meal bereits Items enthält, zeigt der Wizard vor dem Öffnen einen Warn-Dialog.

**Alternativen**:
- Items anhängen: Risiko von Dopplungen, widerspricht der Natur des Wizards (Gesamtkonfiguration)
- Stiller Replace ohne Warnung: Datenverlust-Risiko

**Begründung**: Der Wizard konfiguriert das gesamte Frühstück. Ersetzen ist die einzig kohärente Semantik. Die Warnung verhindert versehentliches Überschreiben.

### 4. Backend: Items löschen + neu erstellen in Transaktion

**Entscheidung**: `transaction.atomic()` umschließt `meal.items.all().delete()` + `MealItem.objects.bulk_create(items)`.

**Begründung**: Einfach, atomar, keine Teilzustände. `bulk_create` ist effizienter als 14 einzelne `save()`-Calls.

## Risks / Trade-offs

- **[Risk] Wizard im directMeal-Mode erzeugt kein RefMeal** → Das Frühstück ist eine einmalige Konfiguration. Wenn der Nutzer später doch eine Vorlage möchte, muss er den Wizard über den RefMeal-Weg aufrufen. Die beiden Wege sind strikt getrennt — kein "später in RefMeal konvertieren".
- **[Risk] Überschreib-Warnung wird ignoriert** → Es gibt keinen Undo-Mechanismus. Der Nutzer müsste Items manuell neu hinzufügen. Akzeptabel, da die Warnung explizit bestätigt werden muss.
- **[Risk] MealSlot erhält keinen `mealPlanId` als Prop** → `MealSlot` liest `mealPlanId` bereits über `useParams<{id}>()`. Der Button kann direkt dorthin navigieren. Das ist bereits der etablierte Pattern für `onAddRecipe` etc.
- **[Risk] RefMeal-API und DirectMeal-API divergieren über Zeit** → Beide nutzen dasselbe `WizardItemIn`-Format (aus `WizardItemIn[]` werden `MealItemCreateIn[]`). Die Item-Logik im Frontend (`handleSave`) bleibt eine gemeinsame Methode, der Save-Call wird je nach Mode unterschiedlich aufgelöst.
