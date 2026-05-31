## Why

Bei Pfadfinderlagern und Großküchen-Einsätzen werden regelmäßig Non-Food-Artikel vergessen, die über die Küche beschafft werden müssen (Klopapier, Spülmittel, Müllbeutel etc.). Diese Artikel tauchen in keinem Rezept auf und werden daher auch nicht automatisch in Einkaufslisten generiert. Eine Erinnerungs-Checkliste am Ende jeder Einkaufsliste löst dieses Problem.

## What Changes

- Neues Model `KitchenReminderCategory` zur flexiblen Verwaltung von Kategorien (Reinigung, Hygiene, Kochen, Aufbewahrung, Entsorgung)
- Neues Model `KitchenReminder` für einzelne Erinnerungsartikel mit Kategorie, Sortierung, Veröffentlichungsstatus und optionalem Vorschlagenden
- Django Admin Interface zur Verwaltung von Kategorien und Artikeln inkl. Vorschlags-Workflow (User schlägt vor → Admin veröffentlicht)
- API-Endpunkt zum Abrufen aller veröffentlichten Erinnerungen + eigener unveröffentlichter Vorschläge
- API-Endpunkt zum Einreichen eigener Vorschläge
- Frontend-Sektion am Ende der `ShoppingListDetailPage`, die alle Erinnerungen nach Kategorie gruppiert anzeigt
- Möglichkeit für User, eigene Vorschläge einzureichen

## Capabilities

### New Capabilities

- `kitchen-reminder`: Verwaltung und Anzeige von Küchenbedarf-Erinnerungen als Checkliste (nur visuell, kein persistenter Check-Status) am Ende jeder Einkaufsliste, inkl. User-Vorschläge mit Admin-Freigabe

### Modified Capabilities

<!-- Keine bestehenden Specs betroffen -->

## Impact

- **Backend**: `shopping` App bekommt zwei neue Models, Admin-Konfiguration, zwei neue API-Endpunkte, neue Pydantic-Schemas
- **Frontend**: `frontend-food` bekommt neue Zod-Schemas, API-Hook, Komponente in `ShoppingListDetailPage`
- **Migration**: Neue Django-Migration für `KitchenReminderCategory` und `KitchenReminder` + Data-Migration mit 20 initialen Artikeln
- **Schemas**: Neue Pydantic-Schemas (`KitchenReminderOut`, `KitchenReminderCategoryOut`, `KitchenReminderSuggestIn`) und entsprechende Zod-Schemas
