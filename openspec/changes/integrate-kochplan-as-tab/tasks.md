## 1. CookingScheduleTab-Komponente erstellen

- [ ] 1.1 Neue Datei `frontend-food/src/pages/planning/CookingScheduleTab.tsx` anlegen — basierend auf `CookingScheduleKitchenPage.tsx`
- [ ] 1.2 BackButton entfernen, Seiten-Header (`<h1>Küchen-Dashboard</h1>`) durch kompakten Tab-Header ersetzen: "Kochplan"-Titel mit `ChefHat`-Icon, Plan-Name, Personen, Gesamtkosten
- [ ] 1.3 Drucken-Button einbauen: `target="_blank"` Link auf `/meal-plans/${mealPlanId}/cooking-schedule/print`
- [ ] 1.4 Warn-Banner für `excluded_meal_count` übernehmen
- [ ] 1.5 Empty-State übernehmen
- [ ] 1.6 Daten-Fetching (`useMealPlan`, `useCookingSchedule`) übernehmen
- [ ] 1.7 `CookingScheduleTab` als Default-Export definieren

## 2. Tab in MealEventDetailPage einfügen

- [ ] 2.1 `CookingScheduleTab` in `MealEventDetailPage.tsx` importieren
- [ ] 2.2 `ChefHat`-Icon zum Import hinzufügen (falls nicht vorhanden)
- [ ] 2.3 Tab `cooking-schedule` in `TAB_KEYS` nach `table` einfügen
- [ ] 2.4 Tab-Eintrag in der Tab-Bar-Rendering-Schleife: Label "Kochplan", Icon `ChefHat`
- [ ] 2.5 Tab-Content-Rendering: `activeTab === 'cooking-schedule' && <CookingScheduleTab mealPlanId={mealPlanId} />`
- [ ] 2.6 ChefHat-Kochplan-Button im Header (Zeilen 330-337) entfernen

## 3. Routing aufräumen

- [ ] 3.1 In `frontend-food/src/App.tsx` Route `/meal-plans/:id/cooking-schedule` entfernen (Zeile 104)
- [ ] 3.2 In `frontend-food/src/App.tsx` Route `/meal-plans/:id/cooking-schedule/kitchen` entfernen (Zeile 105)
- [ ] 3.3 `CookingScheduleKitchenPage`-Import in `App.tsx` entfernen
- [ ] 3.4 `CookingSchedulePage`-Import in `App.tsx` entfernen

## 4. Alte Dateien löschen

- [ ] 4.1 `frontend-food/src/pages/planning/CookingSchedulePage.tsx` löschen
- [ ] 4.2 `frontend-food/src/pages/planning/CookingScheduleKitchenPage.tsx` löschen
- [ ] 4.3 Verifizieren, dass keine anderen Imports auf die gelöschten Dateien verweisen (grep nach `CookingSchedulePage` und `CookingScheduleKitchenPage`)

## 5. Build & Test

- [ ] 5.1 TypeScript-Check: `npx tsc --noEmit` im `frontend-food/`-Verzeichnis
- [ ] 5.2 Lint über das geänderte Verzeichnis laufen lassen
- [ ] 5.3 Dev-Server starten und Tab-Funktionalität testen:
  - Tab "Kochplan" erscheint nach "Tabelle"
  - Timeline-Ansicht wird korrekt gerendert
  - Drucken-Button öffnet Print-Seite in neuem Tab
  - Warnhinweise bei ausgeschlossenen Mahlzeiten
  - Alle anderen Tabs bleiben funktionsfähig
- [ ] 5.4 Routing testen:
  - `/meal-plans/:id/cooking-schedule` leitet korrekt auf den Tab um (404 vermeiden)
  - `/meal-plans/:id/cooking-schedule/print` funktioniert weiterhin
  - ChefHat-Button im Header ist nicht mehr sichtbar
