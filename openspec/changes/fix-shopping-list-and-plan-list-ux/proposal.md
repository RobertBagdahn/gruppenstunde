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

## What Changes

- Einkaufsliste: Jeder manuelle Eintrag bekommt eine Löschen-Aktion (Menü oder Papierkorb-Icon, mit Bestätigung oder Undo). Rezept-/Plan-Einträge bleiben unlöschbar, wie bisher.
- Reserve wird in der Anzeigeeinheit des Eintrags angegeben (ml bei Flüssigkeiten mit ml-Menge, sonst g), berechnet aus der Packungsgröße in derselben Einheit; ohne Volumen-Packung entfällt die Zeile statt einer falschen Einheit.
- Menge und Reserve werden konsistent berechnet: Überschuss = Packungsgröße − angezeigte (gerundete) Menge. Menge + Reserve entspricht dann der Packungsgröße.
- Plan-Karten: Der Name hat Vorrang vor dem Badge. Das Badge wandert in eine eigene Zeile oder wird bei schmaler Karte zum Icon, der Name bricht auf bis zu zwei Zeilen um (statt auf einen Buchstaben zu kürzen).
- Lösch-Dialog für Pläne nennt den Plannamen („Essensplan „X“ löschen?“). Gleiches für Einkaufslisten, falls dort noch nicht der Fall.
- „Als Vorlage verwenden“ verwendet den eingegebenen Namen unverändert. Vorbelegung des Dialogfelds ist „<Quellname> (Kopie)“, der Nutzer kann es ändern.

## Capabilities

### Modified Capabilities
- `shopping-list`: Löschen manueller Einträge.
- `shopping-list-reserve-transparency`: Reserve in passender Einheit, konsistente Rundung.
- `meal-plan-list-dashboard`: Kartenlayout ohne Namenskürzung auf einen Buchstaben, Lösch-Dialog mit Plannamen.
- `meal-plan-duplicate`: Name wird nicht automatisch ergänzt.

## Impact

- **Backend:** keine Änderung (Menge, Einheit und `package_options[].volume_ml` liegen bereits vor).
- **Frontend (frontend-food):** `components/shopping/ShoppingListItemRow.tsx` und `pages/planning/ShoppingView.tsx`, `lib/shoppingItemDisplay.ts` (`formatItemPackageReserve`), bestehender Hook `useDeleteShoppingListItem` (jetzt in der UI genutzt) in `pages/shopping/ShoppingListDetailPage.tsx`, `components/planning/MealPlanCompactCard.tsx` und `MealPlanHeroCard.tsx`, `pages/planning/MealEventListPage.tsx` (Duplizieren, Lösch-Dialog).
- **Schemas:** unverändert.
