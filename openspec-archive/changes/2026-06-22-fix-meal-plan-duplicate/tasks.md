## 1. RefMeals beim Duplizieren überspringen

- [x] 1.1 `api/meal_plan.py`: Im Duplikat-Loop `source.meals.filter(is_reference=False)` statt `source.meals.all()` verwenden
- [x] 1.2 Alternativ: Guard `if meal.start_datetime is None: continue` am Schleifenbeginn

## 2. MealItemOverrides klonen

- [x] 2.1 Nach dem Klonen jedes `MealItem`: alle `item.overrides.all()` iterieren und `MealItemOverride.objects.create(meal_item=new_item, ...)` aufrufen
- [x] 2.2 Prefetch `"meals__items__overrides"` zum Quell-Queryset hinzufügen, damit kein N+1 entsteht

## 3. Metadata übertragen

- [x] 3.1 `day_part_factors` vom Quell-Plan auf den neuen Plan kopieren
- [x] 3.2 `meal_default_times` kopieren
- [x] 3.3 `visibility` kopieren
- [x] 3.4 `nutritional_tags` per `.set(source.nutritional_tags.all())` übertragen (nach `save()`)

## 4. Tests

- [x] 4.1 Backend-Test: Plan mit RefMeals duplizieren → kein `TypeError`, RefMeals nicht im Klon
- [x] 4.2 Backend-Test: Plan mit MealItemOverrides duplizieren → Overrides sind im geklonten Plan vorhanden
- [x] 4.3 Backend-Test: `day_part_factors`, `visibility` und `nutritional_tags` sind nach Duplizierung korrekt übernommen
