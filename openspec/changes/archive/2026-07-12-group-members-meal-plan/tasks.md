## 1. Backend: Datenmodell & Migration

- [x] 1.1 `MealPlanGroupMember` Model in `planner/models/meal_plan.py` anlegen: `meal_plan` FK, `name` CharField (optional), `age` IntegerField, `gender` CharField (choices: male/female/no_answer, default no_answer), `nutritional_tags` M2M → `supply.NutritionalTag`, `person` FK → `event.Person` (nullable), `synced_from_event` BooleanField (default False), `date_ranges` JSONField (default list, für Phase 2), `created_at`, `updated_at`
- [x] 1.2 `MealPlan.norm_portions` von `IntegerField` auf `FloatField` ändern (Default 10.0)
- [x] 1.3 `MealPlan.previous_norm_portions` FloatField (default 10.0) anlegen — speichert letzten manuellen Wert
- [x] 1.4 `MealPlan.activity_factor` FloatField (default 1.5) anlegen
- [x] 1.5 Migration erstellen: `uv run python manage.py makemigrations planner`
- [x] 1.6 `MealPlan`-Methoden: `recalculate_norm_portions()` die `calculate_group_norm_factor()` aufruft und `norm_portions` updated, `has_group_members()` Property
- [x] 1.7 `MealPlan.save()` überschreiben: bei Änderung von `activity_factor` automatisch `recalculate_norm_portions()` triggern

## 2. Backend: Pydantic Schemas

- [x] 2.1 `GroupMemberOut` in `planner/schemas/meal_plan.py`: `id`, `name`, `age`, `gender`, `nutritional_tags` (Liste von `NutritionalTagMinimal`), `person_id`, `synced_from_event`
- [x] 2.2 `GroupMemberCreateIn`: `name` (optional, String), `age` (int, Pflicht), `gender` (Literal["male","female","no_answer"]), `nutritional_tag_ids` (List[int], optional). Validator: name required if nutritional_tag_ids non-empty
- [x] 2.3 `GroupMemberUpdateIn`: alle Felder optional (`name`, `age`, `gender`, `nutritional_tag_ids`)
- [x] 2.4 `GroupMemberBulkCreateIn`: `count` (int, 1-50), `stufe` (Literal["woelflinge","jungpfadfinder","pfadfinder","rover"] optional), `default_age` (int optional — hat Vorrang vor stufe), `gender` (default "no_answer")
- [x] 2.5 `MealPlanDetailOut` erweitern: `activity_factor`, `group_members` (List[GroupMemberOut]), `has_group_members` (bool) hinzufügen
- [x] 2.6 `MealPlanCreateIn` / `MealPlanUpdateIn` erweitern: `activity_factor` optional
- [x] 2.7 `MealPlanUpdateIn` erweitern: `norm_portions` ist jetzt Float (nicht Int) — existierende Validierung anpassen

## 3. Backend: API-Endpunkte

- [x] 3.1 `GET /api/meal-plans/{meal_plan_id}/group-members/` — Liste aller GroupMembers (paginierungsfrei, alle auf einmal)
- [x] 3.2 `POST /api/meal-plans/{meal_plan_id}/group-members/` — Einzelperson erstellen, danach `recalculate_norm_portions()` triggern
- [x] 3.3 `PATCH /api/meal-plans/{meal_plan_id}/group-members/{member_id}/` — GroupMember aktualisieren, danach recalculate
- [x] 3.4 `DELETE /api/meal-plans/{meal_plan_id}/group-members/{member_id}/` — GroupMember löschen, danach recalculate (bei letztem Member: norm_portions auf previous_norm_portions zurücksetzen)
- [x] 3.5 `POST /api/meal-plans/{meal_plan_id}/group-members/bulk/` — Bulk-Erstellung per Stufe/Default-Alter, danach einmalig recalculate
- [x] 3.6 `POST /api/meal-plans/{meal_plan_id}/sync-event-participants/` — Event-Participants als GroupMembers synchronisieren. Bestehende manuelle GroupMembers löschen (nicht die synced). Aus Participants: name, age (aus birthday berechnet), gender, nutritional_tags, person_id übernehmen. `synced_from_event=True`.
- [x] 3.7 `GET /api/meal-plans/{id}/` Detail-Endpoint: `group_members` und `has_group_members` in die Response aufnehmen
- [x] 3.8 `PATCH /api/meal-plans/{id}/` Update-Endpoint: bei Änderung von `activity_factor` automatisch recalculate triggern
- [x] 3.9 Auth-Checks für alle GroupMember-Endpunkte: nur `meal_plan.can_edit` Benutzer (Owner + Collaborator mit Editor/Admin-Rolle)

## 4. Backend: Norm-Personen-Berechnung erweitern

- [x] 4.1 `supply/services/norm_person_service.py`: `PersonSpec` um `Gender.NO_ANSWER` erweitern oder Helper-Funktion `calculate_norm_factor_no_answer()` die Mittelwert aus MALE und FEMALE berechnet
- [x] 4.2 `planner/services/` — neue Datei `group_member_service.py`: `recalculate_meal_plan_norm_portions(meal_plan)` die alle GroupMembers des Plans als `PersonSpec`-Liste konvertiert und `calculate_group_norm_factor()` aufruft
- [x] 4.3 `recalculate_meal_plan_norm_portions()`: GroupMember-Konvertierung zu PersonSpec (age, gender→Gender Enum, pal=meal_plan.activity_factor). Bei gender="no_answer" Mittelwert berechnen
- [x] 4.4 `supply/services/norm_person_service.py` erweitern: `calculate_effective_norm_factor(age, gender, pal)` die bei NO_ANSWER den Mittelwert zurückgibt

## 5. Backend: Tests

- [x] 5.1 `planner/tests/test_group_members.py`: Model-Tests (Erstellung, Validierung, name-Pflicht bei Tags)
- [x] 5.2 API-Tests: CRUD-Endpunkte (Create, Read, Update, Delete) — Happy Path + Auth-Fehler (401/403)
- [x] 5.3 API-Tests: Bulk-Create über Stufen (woelflinge, jungpfadfinder, pfadfinder, rover) und über default_age
- [x] 5.4 API-Tests: norm_portions Neuberechnung nach Create/Update/Delete
- [x] 5.5 API-Tests: norm_portions Fallback auf previous_norm_portions nach Löschen aller Members
- [x] 5.6 API-Tests: Event-Sync (mit und ohne verknüpftes Event)
- [x] 5.7 Service-Tests: `recalculate_meal_plan_norm_portions()` mit verschiedenen PersonSpec-Kombinationen
- [x] 5.8 Service-Tests: Geschlecht "no_answer" berechnet korrekten Mittelwert

## 6. Frontend-Food: Zod Schemas

- [x] 6.1 `frontend-food/src/schemas/mealPlan.ts`: `GroupMemberSchema` (Zod) — 1:1 Match mit Backend `GroupMemberOut`
- [x] 6.2 `GroupMemberCreateSchema` — 1:1 Match mit `GroupMemberCreateIn`
- [x] 6.3 `GroupMemberUpdateSchema` — 1:1 Match mit `GroupMemberUpdateIn`
- [x] 6.4 `GroupMemberBulkCreateSchema` — 1:1 Match mit `GroupMemberBulkCreateIn`
- [x] 6.5 `MealPlanDetailSchema` erweitern: `activity_factor`, `group_members`, `has_group_members`
- [x] 6.6 `MealPlanUpdateSchema` erweitern: `activity_factor` optional, `norm_portions` als `z.number()` (statt `.int()`)

## 7. Frontend-Food: API Hooks

- [x] 7.1 `frontend-food/src/api/groupMembers.ts`: `useGroupMembers(mealPlanId)` — TanStack Query Hook für GET
- [x] 7.2 `useCreateGroupMember(mealPlanId)` — Mutation Hook für POST (mit invalidateQueries auf mealPlan + groupMembers)
- [x] 7.3 `useUpdateGroupMember(mealPlanId)` — Mutation Hook für PATCH
- [x] 7.4 `useDeleteGroupMember(mealPlanId)` — Mutation Hook für DELETE
- [x] 7.5 `useBulkCreateGroupMembers(mealPlanId)` — Mutation Hook für POST bulk/
- [x] 7.6 `useSyncEventParticipants(mealPlanId)` — Mutation Hook für POST sync-event-participants/
- [x] 7.7 `useNutritionalTags(search)` — Hook für Autocomplete (bestehenden Endpoint `/api/nutritional-tags/?search=` nutzen)

## 8. Frontend-Food: GroupMemberPanel Komponente

- [x] 8.1 `GroupMemberPanel.tsx` — Panel-Komponente (analog zu SharePanel/SettingsPanel): Collapse unter dem Header mit `border border-border bg-card rounded-xl p-5 shadow-soft`
- [x] 8.2 `QuickAddStufenDialog.tsx` — Dialog mit Anzahl-Eingabe pro Stufe: 4 Stufen-Buttons (Wölflinge 8, Jungpfadfinder 11, Pfadfinder 14, Rover 18), jeder öffnet einen Mini-Dialog mit Number-Input (1-50), Bestätigen erstellt per Bulk-API
- [x] 8.3 `AddPersonForm.tsx` — Formular: Name (Text, optional), Alter (Number, Pflicht), Geschlecht (Select: männlich/weiblich/keine Angabe, Default keine Angabe), Besonderheiten (Autocomplete-Textfeld mit NutritionalTag-Vorschlägen)
- [x] 8.4 `NutritionalTagAutocomplete.tsx` — Autocomplete-Komponente: Text-Eingabe, debounced API-Call (`GET /api/nutritional-tags/?search=`), Dropdown mit Vorschlägen, ausgewählte Tags als Badges unter dem Feld, Badges haben X zum Entfernen
- [x] 8.5 `GroupMemberList.tsx` — CardTable mit DataCardRows: pro Person Zeile mit Name (oder "Ohne Namen" italic), Alter, Geschlecht (Icon oder Text), Allergien (als NutriTagBadge), Löschen-Button (Trash2)
- [x] 8.6 `EventSyncSection.tsx` — Bereich nur sichtbar wenn `meal_plan.event` gesetzt: Info-Text "X Teilnehmer aus Event verfügbar", "Aus Event synchronisieren"-Button, Warn-Dialog vor Sync

## 9. Frontend-Food: Integration in MealEventDetailPage

- [x] 9.1 Gruppen-Button (Users Icon von Lucide) in die Header-Button-Gruppe neben "Essensplan teilen" einfügen (Zeile ~343 in `MealEventDetailPage.tsx`)
- [x] 9.2 `showGroupMembers` State + Toggle-Logik (analog zu `showShare`/`showSettings`)
- [x] 9.3 `GroupMemberPanel` unter dem Header rendern wenn `showGroupMembers` true (analog zu Share-Panel und Settings-Panel)

## 10. Frontend-Food: SettingsPanel Update

- [x] 10.1 `SettingsPanel.tsx`: norm_portions-Anzeige updaten — wenn `has_group_members` true, zeige "X → Y Norm-Personen (berechnet aus Z Personen)", sonst normales editierbares Feld
- [x] 10.2 PAL-Dropdown im SettingsPanel: Select mit Werten 1.2 / 1.5 / 1.75 / 2.0, onChange → PATCH mealPlan mit neuem activity_factor

## 11. Frontend-Food: MealPlanDetailSchema / Query-Integration

- [x] 11.1 `useMealPlanDetail` Hook prüfen: `group_members` und `has_group_members` aus der Response werden jetzt automatisch mitgeliefert
- [x] 11.2 Typen in allen Consumern aktualisieren, die `MealPlanDetail` verwenden (SettingsPanel, GroupMemberPanel, etc.)

## 12. Finalisierung

- [x] 12.1 Backend: `uv run python manage.py check` — keine Fehler
- [x] 12.2 Backend: `uv run python manage.py makemigrations --check` — keine pending migrations
- [ ] 12.3 Backend-Tests: `uv run pytest planner/tests/test_group_members.py -xvs`
- [x] 12.4 Frontend-Food: TypeScript-Check (`npm run typecheck` in frontend-food/)
- [ ] 12.5 Frontend-Food: Build (`npm run build` in frontend-food/)
- [ ] 12.6 Manuelle Test-Session: Gruppe anlegen → Norm-Portionen prüfen → Event-Sync testen
