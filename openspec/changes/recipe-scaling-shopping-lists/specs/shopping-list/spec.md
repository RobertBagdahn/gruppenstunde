## ADDED Requirements

### Requirement: ShoppingList Model
Das System SHALL ein persistentes `ShoppingList`-Model bereitstellen mit: `name` (CharField), `owner` (FK User), `source_type` (ChoiceField: manual/recipe/meal_event), `source_id` (IntegerField, nullable), `created_at`, `updated_at`.

#### Scenario: Manuelle Einkaufsliste erstellen
- **WHEN** ein authentifizierter Nutzer `POST /api/shopping-lists/` mit `name` sendet
- **THEN** SHALL eine neue ShoppingList mit `source_type=manual` erstellt werden
- **THEN** SHALL der angemeldete Nutzer als `owner` gesetzt werden

#### Scenario: Nicht-authentifizierter Nutzer
- **WHEN** ein nicht-authentifizierter Nutzer versucht eine Einkaufsliste zu erstellen
- **THEN** SHALL HTTP 403 mit "Anmeldung erforderlich" zurückgegeben werden

### Requirement: ShoppingListItem Model
Das System SHALL ein `ShoppingListItem`-Model bereitstellen mit: `shopping_list` (FK ShoppingList), `ingredient` (FK Ingredient, nullable), `name` (CharField), `quantity_g` (FloatField), `unit` (CharField, default="g"), `retail_section` (CharField), `is_checked` (BooleanField, default=False), `checked_by` (FK User, nullable), `checked_at` (DateTimeField, nullable), `sort_order` (IntegerField), `note` (CharField, optional).

#### Scenario: Item abhaken
- **WHEN** ein Nutzer mit Editor/Admin-Rolle `PATCH /api/shopping-lists/{id}/items/{item_id}/` mit `is_checked=true` sendet
- **THEN** SHALL `is_checked` auf True gesetzt werden
- **THEN** SHALL `checked_by` auf den aktuellen Nutzer gesetzt werden
- **THEN** SHALL `checked_at` auf den aktuellen Zeitpunkt gesetzt werden

#### Scenario: Item abhaken rückgängig machen
- **WHEN** ein Nutzer `PATCH /api/shopping-lists/{id}/items/{item_id}/` mit `is_checked=false` sendet
- **THEN** SHALL `is_checked` auf False gesetzt werden
- **THEN** SHALL `checked_by` und `checked_at` auf null gesetzt werden

### Requirement: ShoppingListCollaborator Model
Das System SHALL ein `ShoppingListCollaborator`-Model bereitstellen mit: `shopping_list` (FK ShoppingList), `user` (FK User), `role` (ChoiceField: viewer/editor/admin). Die Kombination `(shopping_list, user)` SHALL einzigartig sein.

#### Scenario: Collaborator einladen
- **WHEN** ein Owner oder Admin `POST /api/shopping-lists/{id}/collaborators/` mit `user_id` und `role` sendet
- **THEN** SHALL ein neuer ShoppingListCollaborator erstellt werden
- **THEN** SHALL der eingeladene Nutzer die Liste in seiner Übersicht sehen

#### Scenario: Doppelte Einladung verhindern
- **WHEN** ein Nutzer versucht einen bereits vorhandenen Collaborator hinzuzufügen
- **THEN** SHALL HTTP 400 mit "Nutzer ist bereits Mitglied" zurückgegeben werden

### Requirement: Rechte-Management
Das System SHALL rollenbasierte Zugriffsrechte für Einkaufslisten unterstützen.

#### Scenario: Viewer-Rechte
- **WHEN** ein Nutzer die Rolle `viewer` hat
- **THEN** SHALL er die Liste und Items sehen können
- **THEN** SHALL er KEINE Items bearbeiten, abhaken oder hinzufügen können

#### Scenario: Editor-Rechte
- **WHEN** ein Nutzer die Rolle `editor` hat
- **THEN** SHALL er Items abhaken, bearbeiten und hinzufügen können
- **THEN** SHALL er KEINE Collaborators verwalten oder die Liste löschen können

#### Scenario: Admin-Rechte
- **WHEN** ein Nutzer die Rolle `admin` hat
- **THEN** SHALL er alle Editor-Rechte haben
- **THEN** SHALL er zusätzlich Collaborators einladen, entfernen und Rollen ändern können
- **THEN** SHALL er die Liste NICHT löschen können (nur Owner)

#### Scenario: Owner-Rechte
- **WHEN** ein Nutzer der Owner einer Liste ist
- **THEN** SHALL er alle Admin-Rechte haben
- **THEN** SHALL er zusätzlich die Liste löschen können

### Requirement: Einkaufslisten-API CRUD
Das System SHALL vollständige CRUD-Endpunkte für Einkaufslisten bereitstellen.

#### Scenario: Eigene und geteilte Listen abrufen
- **WHEN** ein authentifizierter Nutzer `GET /api/shopping-lists/` aufruft
- **THEN** SHALL die Response alle Listen enthalten, bei denen er Owner oder Collaborator ist
- **THEN** SHALL die Response paginiert sein (page, page_size, total, total_pages, items)
- **THEN** SHALL jede Liste `name`, `owner`, `items_count`, `checked_count`, `collaborators_count`, `source_type`, `created_at`, `updated_at` enthalten

#### Scenario: Listen-Detail abrufen
- **WHEN** ein Nutzer `GET /api/shopping-lists/{id}/` aufruft und Zugriff hat
- **THEN** SHALL die Response die Liste mit allen Items und Collaborators enthalten
- **THEN** SHALL Items nach `retail_section` gruppiert und nach `sort_order` sortiert sein
- **THEN** SHALL ein `can_edit`-Feld anzeigen ob der Nutzer Bearbeitungsrechte hat

#### Scenario: Kein Zugriff
- **WHEN** ein Nutzer versucht eine fremde Liste ohne Collaborator-Zugang abzurufen
- **THEN** SHALL HTTP 404 zurückgegeben werden

### Requirement: Export aus Rezept
Das System SHALL ermöglichen, die Zutaten eines Rezepts als Einkaufsliste zu exportieren.

#### Scenario: Einkaufsliste aus Rezept erstellen
- **WHEN** ein authentifizierter Nutzer `POST /api/shopping-lists/from-recipe/{recipe_id}/` aufruft mit optionalem `servings`-Parameter
- **THEN** SHALL eine neue ShoppingList mit `source_type=recipe` und `source_id=recipe_id` erstellt werden
- **THEN** SHALL der Name "Einkaufsliste: {recipe.title}" sein
- **THEN** SHALL jedes RecipeItem als ShoppingListItem übernommen werden, skaliert auf die angegebene Portionszahl
- **THEN** SHALL die Einheiten-Umrechnung angewendet werden

#### Scenario: Rezept mit Skalierung exportieren
- **WHEN** ein Nutzer den Export mit `servings=8` aufruft
- **THEN** SHALL jede RecipeItem-Menge mit 8 multipliziert werden
- **THEN** SHALL die Einheiten intelligent umgerechnet werden (g→kg, ml→l)

### Requirement: Export aus MealEvent
Das System SHALL ermöglichen, die aggregierte Einkaufsliste eines MealEvents persistent zu speichern.

#### Scenario: Einkaufsliste aus MealEvent erstellen
- **WHEN** ein authentifizierter Nutzer `POST /api/shopping-lists/from-meal-event/{meal_event_id}/` aufruft
- **THEN** SHALL eine neue ShoppingList mit `source_type=meal_event` und `source_id=meal_event_id` erstellt werden
- **THEN** SHALL der Name "Einkaufsliste: {meal_event.name}" sein
- **THEN** SHALL die bestehende `generate_shopping_list`-Logik verwendet werden
- **THEN** SHALL der MealEvent-Skalierungsfaktor angewendet werden

### Requirement: WebSocket Echtzeit-Kollaboration
Das System SHALL WebSocket-basierte Echtzeit-Updates für Einkaufslisten bereitstellen.

#### Scenario: WebSocket-Verbindung herstellen
- **WHEN** ein Nutzer mit Zugriff die Einkaufslisten-Detailseite öffnet
- **THEN** SHALL eine WebSocket-Verbindung zu `ws://host/ws/shopping-lists/{id}/` hergestellt werden
- **THEN** SHALL die Verbindung nur für authentifizierte Nutzer mit Zugriff akzeptiert werden

#### Scenario: Item abhaken in Echtzeit
- **WHEN** Nutzer A ein Item abhakt
- **THEN** SHALL ein `item.checked`-Event an alle verbundenen Nutzer gesendet werden
- **THEN** SHALL das Event `item_id`, `checked_by` (Username) und `checked_at` enthalten
- **THEN** SHALL Nutzer B die Änderung sofort sehen

#### Scenario: Item hinzufügen in Echtzeit
- **WHEN** Nutzer A ein Item hinzufügt
- **THEN** SHALL ein `item.added`-Event an alle verbundenen Nutzer gesendet werden
- **THEN** SHALL das neue Item bei allen verbundenen Nutzern erscheinen

#### Scenario: Verbindung nur für berechtigte Nutzer
- **WHEN** ein Nutzer ohne Zugriff versucht eine WebSocket-Verbindung herzustellen
- **THEN** SHALL die Verbindung abgelehnt werden (WebSocket close code 4403)

### Requirement: Frontend Einkaufslisten-UI
Das System SHALL eine moderne, interaktive Einkaufslisten-Oberfläche bereitstellen.

#### Scenario: Einkaufslisten-Übersicht
- **WHEN** ein Nutzer zu `/shopping-lists/` navigiert
- **THEN** SHALL eine Liste aller eigenen und geteilten Einkaufslisten angezeigt werden
- **THEN** SHALL jede Liste Name, Fortschritt (x/y abgehakt), Quelle und letztes Update zeigen
- **THEN** SHALL ein "Neue Liste" Button vorhanden sein

#### Scenario: Einkaufslisten-Detailansicht
- **WHEN** ein Nutzer zu `/shopping-lists/{id}` navigiert
- **THEN** SHALL die Liste mit Items gruppiert nach Supermarkt-Abteilung (`retail_section`) angezeigt werden
- **THEN** SHALL jedes Item eine Checkbox zum Abhaken haben
- **THEN** SHALL abgehakte Items visuell anders dargestellt werden (durchgestrichen, ausgegraut)
- **THEN** SHALL ein Fortschrittsbalken den Gesamtfortschritt anzeigen

#### Scenario: Collaborator-Verwaltung
- **WHEN** ein Owner oder Admin die Collaborator-Verwaltung öffnet
- **THEN** SHALL eine Liste aller Collaborators mit ihren Rollen angezeigt werden
- **THEN** SHALL ein Formular zum Einladen neuer Nutzer vorhanden sein
- **THEN** SHALL Rollen änderbar und Nutzer entfernbar sein

#### Scenario: Mobile-optimierte Checkboxen
- **WHEN** ein Nutzer die Einkaufsliste auf einem Smartphone (320px) öffnet
- **THEN** SHALL die Checkboxen groß genug für Touch-Bedienung sein (mindestens 44x44px Tap-Target)
- **THEN** SHALL das Layout einspaltig und übersichtlich sein

#### Scenario: Echtzeit-Anzeige wer abhakt
- **WHEN** ein anderer Nutzer ein Item abhakt
- **THEN** SHALL neben dem Item kurzzeitig der Name des abhakenden Nutzers angezeigt werden
- **THEN** SHALL die Checkbox-Animation smooth sein
