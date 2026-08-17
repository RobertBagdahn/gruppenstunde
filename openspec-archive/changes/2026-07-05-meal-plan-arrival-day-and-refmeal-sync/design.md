## Context

**Anreisetag**: Die zeitbewusste Mahlzeiten-Erzeugung `create_meals_for_date_timeaware(date, is_first, is_last)` (`backend/planner/models/meal_plan.py:204-244`) filtert am ersten Tag Mahlzeiten vor `start_time` und am letzten Tag nach `end_time` korrekt heraus. Der Defekt liegt im Erstellpfad aus Events (`backend/planner/api/meal_plan.py:314-316`): dort wird `start_datetime`/`end_datetime` auf `00:00` gesetzt. Folge: Anreisetag `start_time = 00:00` → keine Mahlzeit liegt davor → voller Tag; Abreisetag `end_time = 00:00` → jede Mahlzeit liegt danach → leerer Tag. Zusätzlich nutzt die Skip-Logik die hartkodierten `MEAL_TYPE_DEFAULT_TIMES` (`meal_plan.py:221-223`) statt des Plan-Felds `meal_default_times` (JSONField), das das Frontend (`getMealDefaultTimes`, `mealPlan.ts`) bereits respektiert. Die kcal-/Nährwertbilanz folgt korrekt den vorhandenen Mahlzeiten und ist nicht die Fehlerquelle. Es gibt keine Tests für diese Funktion.

**RefMeal-Sync**: Sync ist heute rein manuell (`backend/planner/api/ref_meal.py:201-214`, Button in `RefMealEditorPage.tsx:133-146`). `update_ref_meal` (`ref_meal.py:149-181`) ändert nur das RefMeal selbst, ohne `_sync_ref_meal_to_targets` aufzurufen. `_sync_ref_meal_to_targets` (`ref_meal.py:61-79`) ist **destruktiv**: `target.items.all().delete()` + Neuaufbau aus Vorlage; `MealItemOverride` (CASCADE) geht mit verloren. Es gibt keine Markierung, welche Items aus der Vorlage stammen.

Constraints: Keine Rückwärtskompatibilität nötig. UI-Texte Deutsch. `uv run`. Auto-Sync nur für `is_synced = true`-Targets.

## Goals / Non-Goals

**Goals:**
- Anreise-/Abreisetage werden als Teiltage behandelt; Event-Pläne erhalten sinnvolle Default-Zeiten statt `00:00`.
- Skip-Logik nutzt `meal_default_times` konsistent mit dem Frontend.
- RefMeal-Speichern synchronisiert verlinkte Mahlzeiten automatisch, aber erst nach Bestätigung mit Anzeige der Anzahl betroffener Mahlzeiten.

**Non-Goals:**
- Kein verlustfreier Merge von manuellen Zusatz-Items in verlinkten Mahlzeiten (Modelländerung `source_ref_item_id` ist explizit out-of-scope; Sync bleibt „Vorlage gewinnt").
- Keine Änderung der kcal-/Nährwertaggregation.
- Kein post_save-Signal auf `Meal` (rekursions-/performancekritisch).

## Decisions

### D1: Default-Zeiten für Event-Pläne
`api/meal_plan.py` setzt beim Event-Pfad sinnvolle Default-Uhrzeiten (Anreise 17:00, Abreise 11:00) statt `00:00`. Werte als benannte Konstanten, damit anpassbar.

- **Warum**: minimaler Eingriff, aktiviert die bestehende, korrekte Skip-Logik.
- **Alternative (erwogen)**: explizite Nutzereingabe von Anreise-/Abreisezeit im Wizard — sinnvoll als Erweiterung, aber Default ist die kleinste Lösung für den Bug.

### D2: Skip-Logik nutzt `meal_default_times`
`create_meals_for_date_timeaware` liest die Mahlzeitenzeiten aus `self.meal_default_times` (Fallback auf `MEAL_TYPE_DEFAULT_TIMES`, falls leer). Damit stimmen Backend-Skip und Frontend-`getSkippedMealTypes` überein.

- **Warum**: behebt die Backend/Frontend-Divergenz bei angepassten Zeiten.

### D3: Auto-Sync in `update_ref_meal` mit Bestätigung
Der Sync wird beim Speichern ausgelöst, aber zweistufig:
1. Frontend ruft vor dem Speichern (oder das Backend liefert) die **Anzahl der verlinkten `is_synced`-Mahlzeiten**, die überschrieben würden, und zeigt einen Bestätigungsdialog („N verknüpfte Mahlzeiten werden überschrieben").
2. Nach Bestätigung speichert der Nutzer; `update_ref_meal` ruft `_validate_ref_meal_items` + `_sync_ref_meal_to_targets` für alle `is_synced = true`-Targets auf.

- **Warum**: verhindert stilles, destruktives Überschreiben. Nutzt vorhandene `_sync_ref_meal_to_targets`-Logik.
- **Alternative (verworfen)**: bedingungsloses Auto-Sync ohne Warnung (Datenverlust-Risiko); post_save-Signal (rekursiv/unzuverlässig).

### Betroffene Dateien
- Backend: `backend/planner/api/meal_plan.py` (Event-Default-Zeiten, Konstanten), `backend/planner/models/meal_plan.py` (`create_meals_for_date_timeaware` → `meal_default_times`), `backend/planner/api/ref_meal.py` (`update_ref_meal` ruft Sync; Endpoint/Response für Anzahl betroffener Targets).
- Frontend: `frontend-food/src/pages/planning/RefMealEditorPage.tsx` (Bestätigungsdialog, Sync beim Speichern), ggf. `frontend-food/src/api/refMeals.ts`.

### API-Änderungen
- `PUT .../ref-meals/{id}` (`update_ref_meal`): synchronisiert verlinkte Targets; Response enthält `synced_meal_count: int`.
- Optional `GET .../ref-meals/{id}/sync-impact` oder Feld in der RefMeal-Detail-Response: `linked_meal_count` für den Vorab-Dialog.

## Risks / Trade-offs

- **Auto-Sync überschreibt verlinkte Anpassungen** → Bestätigungsdialog mit Anzahl; Doku „Vorlage gewinnt"; wer abweichen will, entkoppelt (`unlink_meal`).
- **Default-Zeiten passen nicht für jedes Lager** → benannte Konstanten + spätere Wizard-Eingabe möglich.
- **`meal_default_times`-Format inkonsistent** zwischen FE/BE → einheitliches Schema verifizieren, Fallback auf Hartkodierung.

## Migration Plan

1. Backend: `create_meals_for_date_timeaware` auf `meal_default_times` umstellen + Tests.
2. Backend: Event-Default-Zeiten setzen + Tests (Anreise kein Frühstück/Mittag, Abreise kein Abendessen).
3. Backend: `update_ref_meal` Auto-Sync + `synced_meal_count`/`linked_meal_count`.
4. Frontend: Bestätigungsdialog + Sync beim Speichern.
5. Keine DB-Migration. Rollback rein code-seitig.

## Open Questions

- (geklärt) Default-Uhrzeiten: Anreise 17:00 / Abreise 11:00.
- (geklärt) Manueller „Für alle übernehmen"-Button bleibt als zusätzliche Re-Sync-Aktion bestehen.
