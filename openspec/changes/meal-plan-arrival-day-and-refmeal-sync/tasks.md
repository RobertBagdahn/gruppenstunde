## 1. Anreise-/Abreisetag

- [ ] 1.1 `backend/planner/api/meal_plan.py`: Event-Erstellpfad setzt Default-Start/-Endzeit (Anreise 17:00 / Abreise 11:00) statt 00:00, als benannte Konstanten
- [ ] 1.2 `backend/planner/models/meal_plan.py` `create_meals_for_date_timeaware`: Mahlzeitenzeiten aus `meal_default_times` lesen (Fallback auf `MEAL_TYPE_DEFAULT_TIMES`)
- [ ] 1.3 Tests: Anreise 17:00 → kein Frühstück/Mittag; Abreise 11:00 → kein Mittag/Abendessen; Event-Pfad ohne Zeiten → Teiltage
- [ ] 1.4 Tests: angepasste `meal_default_times` → Backend/Frontend-Skip identisch

## 2. RefMeal Auto-Sync

- [ ] 2.1 `backend/planner/api/ref_meal.py` `update_ref_meal`: nach Item-Neuaufbau `_validate_ref_meal_items` + `_sync_ref_meal_to_targets` für `is_synced=true`-Targets aufrufen
- [ ] 2.2 Response um `synced_meal_count` erweitern
- [ ] 2.3 Anzahl verlinkter `is_synced`-Mahlzeiten in RefMeal-Detail-Response (oder eigener Endpoint) bereitstellen
- [ ] 2.4 Pydantic-Schemas anpassen, Zod (`frontend-food/src/api/refMeals.ts` / Schemas) synchronisieren

## 3. Frontend RefMeal

- [ ] 3.1 `RefMealEditorPage.tsx`: vor dem Speichern Bestätigungsdialog mit Anzahl betroffener Mahlzeiten
- [ ] 3.2 Nach Bestätigung speichern → Auto-Sync; Toast mit `synced_meal_count`
- [ ] 3.3 Manuellen „Für alle übernehmen"-Button als optionale Re-Sync-Aktion belassen

## 4. Tests

- [ ] 4.1 Backend: Auto-Sync übernimmt Items in `is_synced`-Targets, lässt entkoppelte unberührt
- [ ] 4.2 Backend: `synced_meal_count` korrekt; Berechtigung/403
- [ ] 4.3 Frontend: Dialog erscheint mit korrekter Anzahl, Abbruch verändert nichts

## 5. Abschluss

- [ ] 5.1 Default-Uhrzeiten mit Stakeholder final bestätigen
- [ ] 5.2 Keine `print`/`console.log`; deutsche UI-Texte
