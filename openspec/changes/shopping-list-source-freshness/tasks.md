## 0. Freigabe

- [ ] 0.1 Offene Fragen aus `design.md` klären (Rückfrage vor weiterer Liste, Hinweis für Collaborators)
- [ ] 0.2 Umsetzung erst nach Abschluss von `fix-shopping-list-and-plan-list-ux` (WP-06) beginnen

## 1. Backend

- [ ] 1.1 `planner/services/plan_touch.py` mit `touch_meal_plan`; `post_save`/`post_delete`-Signale für `Meal` und `MealItem`
- [ ] 1.2 Schreibpfade ohne Signale (Einträge kopieren, Plan duplizieren, Wizard-Bulk, Buffet speichern, Referenzmahlzeit-Sync) rufen `touch_meal_plan` auf
- [ ] 1.3 `source_status` und `source_updated_at` in `ShoppingListOut` und `ShoppingListDetailOut`; Pläne der Übersicht gebündelt laden; Lesezugriff auf den Plan prüfen
- [ ] 1.4 Filter `source_type` und `source_id` für `GET /api/shopping-lists/`

## 2. Schema-Sync

- [ ] 2.1 Zod `schemas/shoppingList.ts` und `api/shoppingLists.ts` synchron zu Pydantic

## 3. Food-Frontend

- [ ] 3.1 Hinweis „Essensplan wurde seit Erstellung geändert“ mit „Neue Liste erstellen“ auf `ShoppingListDetailPage.tsx`; „Der Essensplan wurde gelöscht.“ bei `deleted`
- [ ] 3.2 Status-Kennzeichnung in `ShoppingListPage.tsx`
- [ ] 3.3 Nach Freigabe: Rückfrage vor weiterer aktueller Liste in `ShoppingView.tsx`

## 4. Tests

- [ ] 4.1 Backend: `updated_at` je Schreibpfad (Signal und Bulk), Status `current`/`changed`/`deleted`/`null`, Snapshot bleibt unverändert, kein N+1 in der Übersicht, 401 ohne Anmeldung, kein Status ohne Planzugriff
- [ ] 4.2 Frontend: Hinweis und Aktion, Navigation zur neuen Liste, kein Hinweis bei `current`, 320 px
- [ ] 4.3 `uv run pytest planner shopping`, `uv run ruff check`, Food-Typecheck, Lint, Tests
