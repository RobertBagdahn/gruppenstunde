## Context

Rezepte speichern aktuell `servings` (default=4), und RecipeItems haben `quantity` + `quantity_type` (once/per_person). MealEvents haben `norm_portions`, `activity_factor`, `reserve_factor` und berechnen daraus einen `scaling_factor`. Die bestehende Shopping-List-Generierung (`supply/services/shopping_service.py`) ist rein transient -- sie berechnet beim Abruf und gibt eine flache Liste zurück, ohne Persistenz oder Sharing.

Portionen (`Portion`) haben `name`, `quantity`, `weight_g`, `rank`, und eine FK zu `MeasuringUnit`. Es fehlt ein `priority`-Feld und ein `is_default`-Flag, um die bevorzugte Portionsdarstellung zu steuern.

Für WebSocket-Echtzeit-Kollaboration wird Django Channels benötigt, das über Cloud Run mit HTTP/2 und WebSocket-Support betrieben werden kann.

## Goals / Non-Goals

**Goals:**
- Rezepte normieren: Alle Mengen immer für 1 Normportion speichern und anzeigen
- Interaktiver Skalierungsrechner für beliebige Personenzahlen
- Intelligente Einheiten-Umrechnung mit sinnvoller Rundung (g→kg, ml→l, Dichte-basiert)
- Alle verfügbaren Portionsdarstellungen anzeigen (Gewicht + natürliche Portionen)
- Portions-Priorität konfigurierbar
- Persistente, benannte Einkaufslisten mit CRUD
- User-basiertes Sharing mit Rechte-Management (Viewer/Editor/Admin)
- Echtzeit-Kollaboration via WebSocket (Items abhaken, hinzufügen)
- Export von Rezept-Zutaten und MealEvent-Einkaufslisten in persistente Listen

**Non-Goals:**
- Öffentliches Link-Sharing (nur User-basiert im System)
- Offline-Support / PWA
- Barcode-Scanner für Einkaufslisten
- Preisvergleich zwischen Supermärkten
- Druckansicht (kann später ergänzt werden)

## Decisions

### 1. Normportionen-Standard: 1 Portion als Basis

**Entscheidung**: Alle Rezepte speichern Mengen für exakt 1 Normportion. Das `servings`-Feld auf Recipe wird auf `1` als Default gesetzt und dient als reine Referenz. Die Skalierung erfolgt rein clientseitig.

**Rationale**: 1 Normportion als Basis ist mathematisch einfach (Multiplikation statt Division) und konsistent mit dem MealEvent-System, das bereits `norm_portions` hat. 

**Alternative**: 4 Portionen als Default beibehalten und durch `servings` dividieren -- führt zu Rundungsfehlern und inkonsistenter Basis.

### 2. Skalierung: Client-seitig mit Server-Daten

**Entscheidung**: Die Skalierungsberechnung (Menge * Personenzahl) erfolgt im Frontend. Der Server liefert die Basisdaten (RecipeItems mit Gewicht pro Portion, alle Portionen einer Zutat mit Gewicht).

**Rationale**: Vermeidet unnötige API-Calls bei Slider-Änderungen. Die Berechnung ist trivial (Multiplikation) und erfordert keine serverseitige Logik. MealEvent-Skalierung verwendet weiterhin den bestehenden `scaling_factor`.

**Alternative**: Server-seitige Berechnung mit `?servings=N` Parameter -- unnötige Latenz bei interaktivem Slider.

### 3. Einheiten-Umrechnung: Frontend Utility mit Zutat-Metadaten

**Entscheidung**: Eine `formatQuantity()`-Utility im Frontend rechnet Einheiten intelligent um:
- g → kg ab 1000g (Anzeige: "1,2 kg")
- ml → l ab 1000ml (Anzeige: "1,5 l")
- Umrechnung g↔ml über `physical_density` der Zutat
- Default-Einheit pro Zutat: Gewicht (g/kg) oder Volumen (ml/l) basierend auf `physical_viscosity` (solid → g, beverage → ml)
- Rundung: 5g-Schritte unter 100g, 10g-Schritte unter 1kg, 50g-Schritte über 1kg

**Rationale**: Die Zutat kennt ihre physikalischen Eigenschaften (`physical_density`, `physical_viscosity`). Der Server liefert diese Daten, das Frontend formatiert.

### 4. Portionsanzeige: Alle Portionen mit Priorität

**Entscheidung**: Neben der Gewichts/Volumen-Anzeige werden alle verfügbaren `Portion`-Einträge einer Zutat angezeigt, sortiert nach neuem `priority`-Feld. Die Portion mit der höchsten Priorität (`is_default=True`) wird prominent angezeigt. Beispiel: "1,2 kg Äpfel (ca. 8 Stück)".

**Rationale**: Nutzer denken in natürlichen Einheiten ("3 Äpfel"), die Gewichtsangabe ist aber für Präzision nötig. Alle Portionen zeigen gibt Flexibilität.

**Betroffene Dateien**:
- `backend/supply/models/ingredient.py` — Portion: + `priority` (IntegerField), `is_default` (BooleanField)
- `backend/supply/schemas/ingredient.py` — PortionOut: + `priority`, `is_default`
- `frontend/src/schemas/supply.ts` — PortionSchema: + `priority`, `isDefault`

### 5. Neue `shopping` Django-App für persistente Einkaufslisten

**Entscheidung**: Neue App `shopping` mit Models:
- `ShoppingList`: name, owner, created_at, updated_at, source_type (manual/recipe/meal_event), source_id
- `ShoppingListItem`: shopping_list FK, ingredient FK (nullable), name, quantity_g, unit, retail_section, is_checked, checked_by, checked_at, sort_order
- `ShoppingListCollaborator`: shopping_list FK, user FK, role (viewer/editor/admin)

**Rationale**: Eigene App statt Erweiterung von `supply` oder `planner`, weil Einkaufslisten ein eigenständiges Feature mit eigenem Lebenszyklus, Sharing und Echtzeit-Logik sind.

**API-Endpunkte**:
| Methode | Pfad | Beschreibung |
|---------|------|--------------|
| GET | `/api/shopping-lists/` | Liste eigener + geteilter Listen (paginiert) |
| POST | `/api/shopping-lists/` | Neue Liste erstellen |
| GET | `/api/shopping-lists/{id}/` | Detail mit Items und Collaborators |
| PATCH | `/api/shopping-lists/{id}/` | Liste bearbeiten |
| DELETE | `/api/shopping-lists/{id}/` | Liste löschen (nur Owner/Admin) |
| POST | `/api/shopping-lists/{id}/items/` | Item hinzufügen |
| PATCH | `/api/shopping-lists/{id}/items/{item_id}/` | Item bearbeiten/abhaken |
| DELETE | `/api/shopping-lists/{id}/items/{item_id}/` | Item entfernen |
| POST | `/api/shopping-lists/{id}/collaborators/` | Collaborator einladen |
| PATCH | `/api/shopping-lists/{id}/collaborators/{collab_id}/` | Rolle ändern |
| DELETE | `/api/shopping-lists/{id}/collaborators/{collab_id}/` | Collaborator entfernen |
| POST | `/api/shopping-lists/from-recipe/{recipe_id}/` | Liste aus Rezept erstellen |
| POST | `/api/shopping-lists/from-meal-event/{meal_event_id}/` | Liste aus MealEvent erstellen |

### 6. WebSocket für Echtzeit-Kollaboration

**Entscheidung**: Django Channels mit Redis als Channel Layer. Ein WebSocket-Consumer pro Einkaufsliste, der folgende Events handled:
- `item.checked` / `item.unchecked` — Item ab-/anhaken
- `item.added` / `item.removed` — Item hinzufügen/entfernen
- `item.updated` — Item bearbeiten
- `list.updated` — Listenname geändert

**Rationale**: WebSocket ist nötig für echte Echtzeit-Kollaboration beim gemeinsamen Einkaufen. Polling wäre für diesen Use-Case zu langsam (Items müssen sofort als abgehakt erscheinen).

**Betroffene Dateien**:
- Neue: `backend/shopping/consumers.py` — WebSocket Consumer
- Neue: `backend/shopping/routing.py` — WebSocket URL Routing
- `backend/core/asgi.py` — ASGI Application mit Channels Routing

**Dependencies**:
- `channels>=4.0` + `channels-redis>=4.0`
- Redis-Instanz (Cloud Memorystore oder Container)

### 7. Frontend-Routing

**Entscheidung**: Einkaufslisten unter `/shopping-lists/`, Skalierungsrechner als interaktive Komponente auf der Rezeptdetailseite.

**Betroffene Pages**:
- `frontend/src/pages/recipes/RecipeDetailPage.tsx` — PortionScaler integrieren
- `frontend/src/pages/planning/MealEventDetailPage.tsx` — Export-Button zu Einkaufsliste
- Neue: `frontend/src/pages/shopping/ShoppingListPage.tsx`
- Neue: `frontend/src/pages/shopping/ShoppingListDetailPage.tsx`

### 8. Datenbank-Migrations

1. `supply`: Portion + `priority` (default=0), `is_default` (default=False)
2. `shopping`: Neue App mit ShoppingList, ShoppingListItem, ShoppingListCollaborator
3. `recipe`: Keine Schema-Änderung nötig (Normportionen-Umstellung ist logisch, nicht schema-basiert)

## Risks / Trade-offs

**[WebSocket-Komplexität]** → Django Channels + Redis erhöht die Infrastruktur-Komplexität.  
**Mitigation**: Redis kann als kleiner Cloud Memorystore oder als Sidecar-Container in Cloud Run betrieben werden. Fallback auf REST-Polling, falls WebSocket-Probleme auftreten.

**[Normportionen-Migration]** → Bestehende Rezepte haben Mengen für `servings=4`, müssen auf 1 Portion umgerechnet werden.  
**Mitigation**: Data-Migration, die alle RecipeItem-Quantities durch `recipe.servings` teilt. Keine Rückwärtskompatibilität nötig.

**[Portions-Genauigkeit]** → Natürliche Portionen ("3 Äpfel") sind Schätzungen, da Portionsgewichte variieren.  
**Mitigation**: Anzeige als "ca. 3 Äpfel" mit Tilde/ca.-Prefix. Gewichtsangabe bleibt die Primäranzeige.

**[Performance Shopping-List WebSocket]** → Viele gleichzeitige WebSocket-Verbindungen auf Cloud Run.  
**Mitigation**: Cloud Run unterstützt WebSocket nativ. Connection-Limit pro Instanz beachten, ggf. horizontal skalieren.
