# Einkaufsliste und Planübersicht: Löschen, Einheiten, Namen

## Why

Der Produktivtest (2026-10-03) hat in der Einkaufsliste und der Planübersicht mehrere Mängel gezeigt:

Einkaufsliste:
- Manuell hinzugefügte Einträge („Sonstiges“) lassen sich nicht löschen. Das Backend hat `DELETE /api/shopping-lists/{id}/items/{item_id}/`, im Frontend gibt es dafür keine Bedienung.
- „Reserve“ (Rest der Packung, `package_surplus_g`) wird immer in Gramm angezeigt, auch wenn die Menge in ml steht (Olivenöl: „22 ml · 1 × 815-ml-Flasche, + 730 g Reserve“).
- Menge plus Reserve ergibt nicht die Packungsgröße: „75 g + 930 g“ im 1-kg-Netz, „280 g + 730 g“, „38 g + 160 g“ im 200-g-Stück. Ursache: Die Menge wird für die Anzeige gerundet, der Überschuss aber aus der ungerundeten Menge berechnet.

Planübersicht:
- In der Kartenansicht werden Plannamen mit „Mein Plan“-Badge bei schmalen Karten auf einen Buchstaben gekürzt („H…“, „Z…“, „B…“).
- Der Lösch-Dialog nennt den Plan nicht beim Namen, bei mehreren ähnlichen Plänen ist unklar, welcher gelöscht wird.
- „Als Vorlage verwenden“ hängt automatisch „ (Kopie)“ an den vom Nutzer gewählten Namen an.
- Review 2026-10-11: Bei „Demnächst“ erscheint ein Monat doppelt („Oktober 2026“ für kommende und vergangene Pläne, doppelter React-Key). „Als Vorlage verwenden“ belegt das Ende mit der Dauer in Millisekunden vor; startet die Kopie abends, zählt das Backend einen Kalendertag mehr und lehnt mit „Tagesanzahl muss übereinstimmen“ ab.

- Review 2026-10-11 (WP-06): In der Übersicht der Einkaufslisten ist der Lösch-Dialog nie erreichbar und nennt die Liste nicht. Ein gelöschter Eintrag bleibt bis zum Neuladen sichtbar; „Rückgängig“ verliert Häkchen und Position. Fremde oder anonym aufgerufene Listen zeigen „API error: 401 Unauthorized“ bzw. „404 Not Found“ ohne Login-Hinweis. `DELETE` einer fremden Liste antwortet 403 statt 404 und verrät so ihre Existenz. Im lokalen Dev-Setup verbindet der WebSocket nie (kein `/ws`-Proxy, `runserver` ohne ASGI).

## What Changes

- Einkaufsliste: Jeder manuelle Eintrag bekommt eine Löschen-Aktion (Menü oder Papierkorb-Icon, mit Bestätigung oder Undo). Rezept-/Plan-Einträge bleiben unlöschbar, wie bisher.
- Reserve wird in der Anzeigeeinheit des Eintrags angegeben (ml bei Flüssigkeiten mit ml-Menge, sonst g), berechnet aus der Packungsgröße in derselben Einheit; ohne Volumen-Packung entfällt die Zeile statt einer falschen Einheit.
- Menge und Reserve werden konsistent berechnet: Überschuss = Packungsgröße − angezeigte (gerundete) Menge. Menge + Reserve entspricht dann der Packungsgröße.
- Plan-Karten: Der Name hat Vorrang vor dem Badge. Das Badge wandert in eine eigene Zeile oder wird bei schmaler Karte zum Icon, der Name bricht auf bis zu zwei Zeilen um (statt auf einen Buchstaben zu kürzen).
- Lösch-Dialog für Pläne nennt den Plannamen („Essensplan „X“ löschen?“). Gleiches für Einkaufslisten auf der Detailseite und in der Übersicht; die Übersicht bekommt dafür eine Löschen-Aktion je Liste mit `can_delete`.
- Gelöschte Einträge verschwinden sofort (optimistisch); „Rückgängig“ stellt sie mit Häkchen und Position wieder her.
- Einkaufslisten-Fehler erscheinen deutsch; anonym erscheint ein Login-Hinweis. Fremde Listen liefern auch beim Löschen 404.
- Lokale Entwicklung: Vite leitet `/ws` an das Backend weiter, `manage.py runserver` läuft über Daphne (ASGI).
- „Als Vorlage verwenden“ verwendet den eingegebenen Namen unverändert. Vorbelegung des Dialogfelds ist „<Quellname> (Kopie)“, der Nutzer kann es ändern.
- „Als Vorlage verwenden“ belegt das Ende so vor, dass die Kalendertage der Vorlage übereinstimmen, und meldet Abweichungen vor dem Absenden.
- Die Planliste trennt bei „Demnächst“ aktuelle/kommende und vergangene Pläne, damit kein Monat doppelt erscheint.

## Capabilities

### Modified Capabilities
- `shopping-list`: Löschen manueller Einträge.
- `shopping-list-reserve-transparency`: Reserve in passender Einheit, konsistente Rundung.
- `meal-plan-list-dashboard`: Kartenlayout ohne Namenskürzung auf einen Buchstaben, Lösch-Dialog mit Plannamen.
- `meal-plan-duplicate`: Name wird nicht automatisch ergänzt.

## Impact

- **Backend:** Menge, Einheit und `package_options[].volume_ml` liegen bereits vor; `duplicate_meal_plan` zählt die Kalendertage von Quelle und Ziel in Ortszeit. `shopping/api.py`: `_require_owner` prüft zuerst den Zugriff (404), Lese-Endpunkte melden 401 „…um deine Einkaufslisten zu sehen“, `add_item` übernimmt `is_checked`. `inspi/settings/local.py`: `daphne` als erste App.
- **Frontend (frontend-food):** `components/shopping/ShoppingListItemRow.tsx` und `pages/planning/ShoppingView.tsx`, `lib/shoppingItemDisplay.ts` (`formatItemPackageReserve`), bestehender Hook `useDeleteShoppingListItem` (jetzt in der UI genutzt) in `pages/shopping/ShoppingListDetailPage.tsx`, `pages/planning/MealEventListPage.tsx` (`PlanRow`, Monatsgruppen, Duplizieren, Lösch-Dialog), `lib/mealPlanListDisplay.ts`; die ungenutzten Karten `MealPlanSection`, `MealPlanCompactCard` und `MealPlanHeroCard` entfallen.
- **Schemas:** `ShoppingListItemCreateIn.is_checked` (optional, Standard `false`); Frontend-Payload in `useAddShoppingListItem` ergänzt. Ausgabe-Schemas unverändert.
