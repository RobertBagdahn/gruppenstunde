## 1. Einkaufsliste: Reserve

- [x] 1.1 `formatItemPackageReserve` und `displayedAmountValue` in `lib/shoppingItemDisplay.ts`: Reserve = Packungsgröße − angezeigte Menge, in g oder ml, ohne Volumen-Packung keine ml-Reserve
- [x] 1.2 `ShoppingListItemRow.tsx` und `pages/planning/ShoppingView.tsx` auf die neue Funktion umstellen
- [x] 1.3 Tests: Zwiebel (275 g zeigt 280 g, Reserve 720 g; 75 g → 925 g), Parmesan (140 g/200 g → 60 g), Olivenöl in ml (793 ml), ml ohne Volumen, Fallback

## 2. Einkaufsliste: Löschen

- [x] 2.1 Bestehenden Hook `useDeleteShoppingListItem` im Detail der Liste nutzen: Undo-Toast mit Wiederherstellen über `useAddShoppingListItem`
- [x] 2.2 Löschen-Icon in `ShoppingListItemRow.tsx` nur für manuelle Einträge (ohne Quellen) mit Bearbeitungsrecht
- [x] 2.3 Tests: Löschen manueller Eintrag, kein Icon bei Rezept-Eintrag oder ohne Recht

## 3. Planübersicht (frontend-food)

- [x] 3.1 `PlanRow` in `pages/planning/MealEventListPage.tsx`: Name bis zwei Zeilen (`line-clamp-2`), Badge außerhalb der Überschrift, Tooltip mit vollem Namen; die ungenutzten Karten `MealPlanSection`, `MealPlanCompactCard` und `MealPlanHeroCard` sind entfernt
- [x] 3.2 `MealEventListPage.tsx`: Lösch-Dialog mit Plannamen, `createName` beim Duplizieren ohne angehängtes „ (Kopie)“, Vorbelegung des Namensfelds mit „<Quellname> (Kopie)“
- [x] 3.3 Komponententests: Namens-Layout (zwei Zeilen, Badge außerhalb der Überschrift, Tooltip), Dialog-Titel mit Plannamen, Plan-Name nach „Als Vorlage verwenden“ (echtes Layout bei 320 px und 1024 px in 5.2)
- [x] 3.4 Sortierung „Demnächst“: Abschnitte „Aktuell & kommend“ und „Vergangen“, Monatsgruppen je Abschnitt eindeutig (`groupPlansForList` in `lib/mealPlanListDisplay.ts`), Tests ohne doppelte React-Keys
- [x] 3.5 „Als Vorlage verwenden“: Ende = Startdatum + (Kalendertage der Vorlage − 1) mit der Endzeit der Vorlage; abweichende Tagesanzahl oder Ende vor Start wird vor dem Absenden auf Deutsch gemeldet; Backend zählt Kalendertage in Ortszeit

## 4. Einkaufslisten: Übersicht, Undo, Fehler, Live-Abgleich (Review 2026-10-11, WP-06)

- [x] 4.1 `ShoppingListPage.tsx`: Löschen-Aktion je Liste mit `can_delete`, Dialogtitel „Einkaufsliste „<Name>“ löschen?“; Komponententest
- [x] 4.2 `useDeleteShoppingListItem` entfernt den Eintrag optimistisch und stellt ihn bei Fehler wieder her; „Rückgängig“ legt ihn mit `is_checked` und `sort_order` neu an (`ShoppingListItemCreateIn.is_checked`); Hook-, Seiten- und Backend-Tests
- [x] 4.3 `api/shoppingLists.ts` über `fetchWithCsrf`/`parseApiResponse` (deutsche `ApiError`-Texte); Detailseite zeigt anonym `UnauthGate`, bei 404 „Einkaufsliste nicht gefunden“
- [x] 4.4 Backend: `DELETE` einer fremden Liste 404 statt 403, 401 beim Lesen „…um deine Einkaufslisten zu sehen“; Tests inkl. Viewer-`DELETE` eines Eintrags → 403
- [x] 4.5 Dev-WebSocket: `/ws`-Proxy (`ws: true`) in `frontend-food/vite.config.ts`, `daphne` als erste App in `inspi/settings/local.py`; Handshake-Tests über `inspi.asgi.application` (`shopping/tests/test_websocket.py`)

## 5. Abschluss

- [x] 5.1 Frontend-Typecheck, Lint, Tests; Backend `ruff`, `pytest`
- [ ] 5.2 Manuell prüfen: Einkaufsliste aus dem Rezept (3 Portionen) mit Olivenöl, manuellen Eintrag anlegen und löschen, Plan kopieren, Plankarten bei 320 px und 1024 px, Einkaufsliste in der Übersicht löschen, Live-Abgleich zweier Browser über `make food`
