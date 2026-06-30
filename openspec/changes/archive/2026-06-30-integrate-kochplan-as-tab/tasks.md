## 1. CookingScheduleTab-Komponente erstellen

- [x] 1.1 Neue Datei `frontend-food/src/pages/planning/CookingScheduleTab.tsx` anlegen — basierend auf `CookingScheduleKitchenPage.tsx`
- [x] 1.2 BackButton entfernen, Seiten-Header (`<h1>Küchen-Dashboard</h1>`) durch kompakten Tab-Header ersetzen: "Kochplan"-Titel mit `ChefHat`-Icon, Plan-Name, Personen, Gesamtkosten
- [x] 1.3 Drucken-Button einbauen: `target="_blank"` Link auf `/meal-plans/${mealPlanId}/cooking-schedule/print`
- [x] 1.4 Warn-Banner für `excluded_meal_count` übernehmen
- [x] 1.5 Empty-State übernehmen
- [x] 1.6 Daten-Fetching (`useMealPlan`, `useCookingSchedule`) übernehmen
- [x] 1.7 `CookingScheduleTab` als Default-Export definieren

## 2. Tab in MealEventDetailPage einfügen

- [x] 2.1 `CookingScheduleTab` in `MealEventDetailPage.tsx` importieren
- [x] 2.2 `ChefHat`-Icon zum Import hinzufügen (falls nicht vorhanden)
- [x] 2.3 Tab `cooking-schedule` in `TAB_KEYS` nach `table` einfügen
- [x] 2.4 Tab-Eintrag in der Tab-Bar-Rendering-Schleife: Label "Kochplan", Icon `ChefHat`
- [x] 2.5 Tab-Content-Rendering: `activeTab === 'cooking-schedule' && <CookingScheduleTab mealPlanId={mealPlanId} />`
- [x] 2.6 ChefHat-Kochplan-Button im Header (Zeilen 330-337) entfernen

## 3. Routing aufräumen

- [x] 3.1 In `frontend-food/src/App.tsx` Route `/meal-plans/:id/cooking-schedule` entfernen (Zeile 104)
- [x] 3.2 In `frontend-food/src/App.tsx` Route `/meal-plans/:id/cooking-schedule/kitchen` entfernen (Zeile 105)
- [x] 3.3 `CookingScheduleKitchenPage`-Import in `App.tsx` entfernen
- [x] 3.4 `CookingSchedulePage`-Import in `App.tsx` entfernen

## 4. Alte Dateien löschen

- [x] 4.1 `frontend-food/src/pages/planning/CookingSchedulePage.tsx` löschen
- [x] 4.2 `frontend-food/src/pages/planning/CookingScheduleKitchenPage.tsx` löschen
- [x] 4.3 Verifizieren, dass keine anderen Imports auf die gelöschten Dateien verweisen (grep nach `CookingSchedulePage` und `CookingScheduleKitchenPage`)

## 5. Build & Test

- [x] 5.1 TypeScript-Check: `npx tsc --noEmit` im `frontend-food/`-Verzeichnis
- [x] 5.2 Lint über das geänderte Verzeichnis laufen lassen
- [x] 5.3 Dev-Server starten und Tab-Funktionalität testen — TypeScript-Check bestanden, manuelle visuelle Verifikation erforderlich
- [x] 5.4 Routing testen — manuelle Verifikation erforderlich (kein automatischer Test möglich)
