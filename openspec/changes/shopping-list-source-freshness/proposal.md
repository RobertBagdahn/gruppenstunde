# Aktualitätshinweis für planbasierte Einkaufslisten

## Status

Produktentscheidung vom 2026-10-11 (Entscheidung 6 der Review): **Snapshot mit Hinweis.** Eine aus einem Essensplan erzeugte Einkaufsliste bleibt unverändert. Hat sich der Plan seit der Erstellung geändert (`MealPlan.updated_at` > `ShoppingList.created_at`), zeigt die Liste „Essensplan wurde seit Erstellung geändert“ mit der Aktion „Neue Liste erstellen“. Es gibt keine automatische Synchronisierung.

## Why

Eine aus einem Essensplan erzeugte Einkaufsliste kann nach Änderungen an Personenzahl, Mahlzeiten oder Mengen fachlich veraltet sein, ohne dass Nutzer das sehen. Gleichzeitig ändert `MealPlan.updated_at` sich heute nur, wenn die Plan-Zeile selbst gespeichert wird; Änderungen an Mahlzeiten und Einträgen bleiben unsichtbar. Wiederholtes Erstellen erzeugt außerdem unbemerkt gleichnamige Listen.

## What Changes

- Die Liste bleibt ein Snapshot: Einträge, abgehakte Positionen und manuelle Ergänzungen werden nie automatisch verändert.
- Änderungen an Mahlzeiten und Einträgen eines Plans (anlegen, ändern, löschen, kopieren, Wizard, Buffet) aktualisieren `MealPlan.updated_at`.
- Listen-Schemas liefern für planbasierte Listen `source_status` (`current`, `changed`, `deleted`) und `source_updated_at`.
- Die Listen-Detailseite und die Listen-Übersicht zeigen bei `changed` den Hinweis „Essensplan wurde seit Erstellung geändert“ mit „Neue Liste erstellen“; bei `deleted` „Der Essensplan wurde gelöscht“ ohne Aktion.
- „Neue Liste erstellen“ legt eine weitere Liste aus dem aktuellen Plan an und öffnet sie; die alte Liste bleibt erhalten.
- Vorschlag (Owner-Freigabe offen): Die Erstellaktion im Essensplan zeigt vorhandene Listen dieses Plans mit Status und fragt nach, bevor eine weitere Liste angelegt wird, solange eine aktuelle Liste existiert.

## Non-Goals

- Keine automatische oder manuelle Synchronisierung bestehender Listen mit dem Plan.
- Keine Erkennung von Änderungen an verwendeten Rezepten, Zutaten oder Portionsgewichten außerhalb des Plans.
- Rezeptbasierte Listen erhalten keinen Hinweis.

## Capabilities

### New Capabilities
- `shopping-list-source-freshness`: Aktualitätsstatus planbasierter Einkaufslisten, Hinweis und Neuerstellung.

### Modified Capabilities
- Keine. Bestehende Anforderungen an `shopping-list` und `shopping-list-item-sources` bleiben unverändert gültig.

## Impact

- Django-Apps: `planner` (Signale/Service zum Aktualisieren von `MealPlan.updated_at`), `shopping` (Schemas, Detail- und Listen-Endpunkte).
- Pydantic: `ShoppingListOut`, `ShoppingListDetailOut` um `source_status` und `source_updated_at`. Zod: `frontend-food/src/schemas/shoppingList.ts` synchron.
- React (frontend-food): `pages/shopping/ShoppingListDetailPage.tsx`, `pages/shopping/ShoppingListPage.tsx`, `pages/planning/ShoppingView.tsx`, `api/shoppingLists.ts`.
- Migrationen: keine (es werden vorhandene Felder `MealPlan.updated_at` und `ShoppingList.created_at` verglichen).
- Abhängigkeit: `fix-shopping-list-and-plan-list-ux` (WP-06) ändert dieselben Seiten; Umsetzung danach beginnen.
