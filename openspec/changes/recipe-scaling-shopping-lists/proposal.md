## Why

Rezepte, EventMeals und MealEvents arbeiten aktuell mit fixen Portionsangaben (`servings`, `norm_portions`), aber es fehlt ein durchgängiges Normportionen-System, das Mengen intelligent skaliert, Einheiten kontextgerecht umrechnet (g→kg, ml→l), natürliche Portionsanzeigen ermöglicht ("3 x Äpfel" statt "450g Apfel") und die Ergebnisse in persistente, teilbare Einkaufslisten exportiert. Gruppenführer müssen derzeit manuell rechnen und können Einkaufslisten nicht im Team abarbeiten.

## What Changes

- **Normportionen-Skalierung**: Rezepte werden immer für 1 Normportion gespeichert. Ein interaktiver Rechner skaliert Mengen für beliebige Personenzahlen hoch/runter.
- **Intelligente Einheiten-Umrechnung**: Automatische Umrechnung in sinnvolle Einheiten (g→kg ab ~1000g, ml→l ab ~1000ml) mit kontextgerechter Rundung. Umrechnung zwischen Gewicht und Volumen über Zutat-Dichte (`physical_density`).
- **Natürliche Portionsanzeige**: Neben der Gewichtsangabe wird die Menge in natürlichen Portionen angezeigt ("3 x Äpfel", "2 Dosen Tomaten"). Portionen erhalten eine Priorität, die konfigurierbar ist und die bevorzugte Anzeige steuert.
- **Einkaufslisten-Persistenz**: Export von MealEvent-Einkaufslisten und Rezept-Zutaten in persistente, benannte Einkaufslisten (neues `ShoppingList`-Model).
- **Einkaufslisten-Sharing & Kollaboration**: Einkaufslisten können über User-Accounts im System geteilt werden mit konfigurierbaren Rechten (Viewer/Editor/Admin). Echtzeit-Kollaboration via WebSocket für gemeinsames Abarbeiten (Items abhaken).
- **Alle Portionen anzeigen**: Im Rezept und in der Einkaufsliste werden alle verfügbaren Portionsdarstellungen einer Zutat angezeigt (z.B. "1kg Apfel" = "6-7 x Äpfel").

## Capabilities

### New Capabilities

- `recipe-portion-scaling`: Normportionen-basierte Skalierung für Rezepte und MealEvents mit intelligentem Einheiten-Rechner, natürlicher Portionsanzeige und Portions-Prioritäten.
- `shopping-list`: Persistente, benannte Einkaufslisten mit Export aus Rezepten/MealEvents, User-basiertem Sharing, konfigurierbaren Rechten und Echtzeit-Kollaboration via WebSocket.

### Modified Capabilities

- `recipe`: RecipeItems werden auf Normportionen (1 Portion) umgestellt. `servings`-Feld wird durch Skalierungslogik ersetzt. Portionsanzeige in Rezeptdetails.
- `meal-plan`: MealEvent-Shopping-List-Endpunkt wird erweitert um Export in persistente Einkaufslisten. Skalierung nutzt das neue Normportionen-System.
- `ingredient-database`: Portion-Model erhält `priority`-Feld und `is_default`-Flag für bevorzugte Portionsanzeige. Dichte-basierte Umrechnung wird systematisiert.

## Impact

### Backend (Django)
- **Neue App**: `shopping` — ShoppingList, ShoppingListItem, ShoppingListCollaborator Models
- **Betroffene Apps**: `recipe` (Normportionen-Umstellung RecipeItem), `supply` (Portion-Priorität), `planner` (Shopping-List-Export)
- **Neue API-Endpunkte**: `/api/shopping-lists/` (CRUD, Share, WebSocket)
- **WebSocket**: Django Channels für Echtzeit-Updates auf Einkaufslisten
- **Migrations**: recipe (servings-Logik), supply (Portion priority/is_default), neue shopping-App

### Frontend (React)
- **Betroffene Pages**: RecipeDetailPage, MealEventDetailPage
- **Neue Pages**: ShoppingListPage, ShoppingListDetailPage
- **Neue Komponenten**: PortionScaler, UnitConverter, ShoppingListView, CollaboratorManager
- **Neue Schemas (Zod)**: ShoppingList, ShoppingListItem, ShoppingListCollaborator

### Pydantic/Zod Schema-Änderungen
- `PortionOut` / `PortionSchema`: + `priority`, `is_default`
- `RecipeItemOut` / `RecipeItemSchema`: + skalierte Mengenfelder
- Neue Schemas: `ShoppingListOut`, `ShoppingListDetailOut`, `ShoppingListItemOut`, `ShoppingListCollaboratorOut`

### Dependencies
- `channels` + `channels-redis` (Django Channels für WebSocket)
- `daphne` oder `uvicorn[standard]` für ASGI WebSocket-Support
