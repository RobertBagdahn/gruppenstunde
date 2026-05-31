## 1. Backend Model & Migration

- [x] 1.1 Meal-Model erweitern: `is_reference` (BooleanField, default=False), `ref_meal` (FK self, nullable), `is_synced` (BooleanField, default=False), `start_datetime` nullable machen
- [x] 1.2 Migration erstellen und anwenden (`uv run python manage.py makemigrations planner`)
- [x] 1.3 Model-Constraints: UniqueConstraint für (meal_plan, meal_type) WHERE is_reference=True, Validierung in `clean()`
- [x] 1.4 `__str__` und `ordering` für RefMeals anpassen (NULL start_datetime)

## 2. Backend API — RefMeal CRUD

- [x] 2.1 Pydantic-Schemas: `RefMealOut`, `RefMealCreateIn`, `RefMealUpdateIn` (mit Items + factor)
- [x] 2.2 Bestehende `MealOut`-Schema erweitern: `is_reference`, `ref_meal_id`, `is_synced` Felder
- [x] 2.3 API-Endpunkte: GET/POST `/api/meal-plans/{plan_id}/ref-meals/`, GET/PUT/DELETE `.../{id}/`
- [x] 2.4 API-Endpunkt: POST `/api/meal-plans/{plan_id}/ref-meals/{id}/sync` — kopiert Items auf alle synced Meals
- [x] 2.5 API-Endpunkte: POST `/api/meal-plans/{plan_id}/meals/{id}/link`, POST `.../{id}/unlink`
- [x] 2.6 API-Endpunkt: POST `/api/meal-plans/{plan_id}/meals/link-all?meal_type=breakfast` — alle Meals eines Typs verknüpfen + sync

## 3. Backend Tests

- [x] 3.1 Tests: RefMeal erstellen, Duplikat-Constraint, löschen entkoppelt Meals
- [x] 3.2 Tests: Sync kopiert Items korrekt, ignoriert is_synced=False
- [x] 3.3 Tests: Link/Unlink Endpunkte, link-all Endpunkt

## 4. Seed-Rezepte

- [x] 4.1 Fehlende Zutaten prüfen/erstellen (Nutella, Honig, Erdnussbutter, Hummus, Avocado, Lachs, Haferflocken, Cornflakes, Kakaopulver etc.)
- [x] 4.2 Management Command `seed_breakfast_recipes` erstellen: 12 Brot-Belag + 4 Cerealien + 6 Getränke + 4 Extras = ~26 Mini-Rezepte
- [x] 4.3 Portionsmengen KI-gestützt schätzen und als Fixture-Daten im Command hinterlegen
- [x] 4.4 Command testen (idempotent, Slug-basierte Dedup)

## 5. Frontend Schemas & API Hooks (frontend-food)

- [x] 5.1 Zod-Schemas erweitern: `MealSchema` um `isReference`, `refMealId`, `isSynced`
- [x] 5.2 Neue Zod-Schemas: `RefMealSchema`, `RefMealCreateSchema`
- [x] 5.3 TanStack Query Hooks: `useRefMeals`, `useRefMeal`, `useCreateRefMeal`, `useUpdateRefMeal`, `useDeleteRefMeal`, `useSyncRefMeal`, `useLinkMeal`, `useUnlinkMeal`

## 6. Frontend — RefMeal-Editor (Baukasten-Ansicht)

- [x] 6.1 Neue Route: `/meal-plans/:planId/ref-meals/:mealType` → RefMealEditorPage
- [x] 6.2 Kachel-Picker: Rezepte nach recipe_type gruppiert (breakfast, snack, drink) als klickbare Kacheln anzeigen
- [x] 6.3 Auswahl-Liste: Hinzugefügte Items mit Faktor-Slider/Input und Entfernen-Button
- [x] 6.4 Energie-Übersicht: Ist-kcal Summe, Soll-kcal (day_part_factor × 2400), prozentuale Abweichung
- [x] 6.5 Normalisieren-Button: Alle Faktoren proportional skalieren auf Soll-Wert
- [x] 6.6 Verknüpfungs-Info: Anzeige "X/Y Meals verknüpft · Z Portionen gesamt"
- [x] 6.7 "Für alle übernehmen"-Button: Ruft Sync-Endpunkt auf

## 7. Frontend — Planübersicht Erweiterung

- [x] 7.1 Verknüpfungs-Icon (🔗) bei Meals mit `is_synced=True` anzeigen
- [x] 7.2 Button "RefMeal bearbeiten" pro meal_type (Link zum RefMeal-Editor)
- [x] 7.3 Sync-Dialog: Bei Änderung eines verknüpften Meals fragen "Nur dieses" vs. "Alle (RefMeal)"
- [x] 7.4 Verknüpfen/Entkoppeln per Meal (Toggle oder Kontextmenü)
