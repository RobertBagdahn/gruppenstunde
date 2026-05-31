## 1. Backend Models & Migration

- [x] 1.1 Model `KitchenReminderCategory` erstellen in `backend/shopping/models.py` (name, sort_order, created_at)
- [x] 1.2 Model `KitchenReminder` erstellen in `backend/shopping/models.py` (name, category FK, sort_order, is_published, suggested_by FK nullable, created_at)
- [x] 1.3 Django Admin für beide Models konfigurieren (Filter nach is_published, Sortierung, Inline-Editing)
- [x] 1.4 Makemigrations + Data-Migration mit 5 Kategorien und 20 Artikeln

## 2. Backend API & Schemas

- [x] 2.1 Pydantic-Schemas erstellen: `KitchenReminderCategoryOut`, `KitchenReminderOut`, `KitchenReminderSuggestIn`
- [x] 2.2 API-Endpunkt `GET /api/kitchen-reminders/` — veröffentlichte + eigene unveröffentlichte, gruppiert nach Kategorie
- [x] 2.3 API-Endpunkt `POST /api/kitchen-reminders/suggest/` — Vorschlag einreichen

## 3. Frontend Schemas & API

- [x] 3.1 Zod-Schemas in `frontend-food/src/schemas/` erstellen (1:1 zu Pydantic)
- [x] 3.2 TanStack Query Hook `useKitchenReminders` und `useSuggestKitchenReminder` in `frontend-food/src/api/`

## 4. Frontend UI

- [x] 4.1 Komponente `KitchenReminderSection` erstellen (Kategorien als Accordion, Checkboxen mit lokalem State)
- [x] 4.2 Integration in `ShoppingListDetailPage` am Ende der Liste
- [x] 4.3 "Vorschlag hinzufügen"-Input mit Submit-Logik
