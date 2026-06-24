# meal-plan-frontend Specification

## Purpose
Defines requirements for the meal planning frontend.
## Requirements
### Requirement: Meal plan list page

The system SHALL display a list of meal plans at `/meal-plans/app` showing all plans the user owns or collaborates on. Each list item SHALL show name, date range, meal count, visibility badge (verified/community/personal), and portion count using `norm_portions`.

#### Scenario: User views their meal plans
- **WHEN** an authenticated user navigates to `/meal-plans/app`
- **THEN** the system shows a list of meal plans with name, date, meal count, and visibility badge

#### Scenario: MealPlan card shows visibility badge
- **WHEN** a MealPlan with `owner_id === null` is displayed
- **THEN** the card SHALL show "Inspi-verifiziert" badge

#### Scenario: MealPlan card shows public community plan
- **WHEN** a MealPlan with `visibility === "public"` and `owner_id !== null` is displayed
- **THEN** the card SHALL show "Community" badge

#### Scenario: MealPlan card shows personal plan
- **WHEN** a MealPlan with `visibility === "private"` and `owner_id === userId` is displayed
- **THEN** the card SHALL show "Mein Plan" badge

#### Scenario: User creates a new meal plan
- **WHEN** the user clicks the create button
- **THEN** a dialog opens with default values and optional source plan selector

#### Scenario: User opens a meal plan
- **WHEN** the user clicks a meal plan in the list
- **THEN** the system navigates to `/meal-plans/:id`

### Requirement: Meal plan creation page
The system SHALL provide a dialog-based meal plan creation flow on the list page (`/meal-plans/app`). The dialog SHALL NOT be a separate page/route but open as an overlay on the list page. The dialog SHALL support both creating an empty plan and copying an existing plan.

#### Scenario: User creates a new meal plan
- **WHEN** the user clicks "Neuer Essensplan" on the list page
- **THEN** a dialog opens with the fields Name (default "Neuer Essensplan"), Start (default next Friday 18:00), End (default next Sunday 14:00), Portionen (default 10), and optionally a source plan selector

#### Scenario: User creates a copy of an existing plan
- **WHEN** the user checks "Von Plan kopieren" in the dialog and selects a source plan
- **THEN** the system creates a deep copy of the source plan with the specified settings

#### Scenario: User cancels creation
- **WHEN** the user clicks "Abbrechen"
- **THEN** the dialog closes without creating anything

#### Scenario: User triggers "Als Vorlage verwenden" from card menu
- **WHEN** the user clicks "Als Vorlage verwenden" in a plan card's context menu
- **THEN** the create dialog opens with "Von Plan kopieren" pre-checked and the source plan pre-selected

### Requirement: Default date computation
The system SHALL compute the next weekend dates (Friday–Sunday) using smart logic based on the current day of the week.

#### Scenario: Default start is Friday 18:00
- **WHEN** the dialog opens
- **THEN** the start field is pre-filled to Friday at 18:00 (this Friday if Mon–Wed, next Friday if Thu–Sun)

#### Scenario: Default end is Sunday 14:00
- **WHEN** the dialog opens
- **THEN** the end field is pre-filled to Sunday at 14:00 of the same weekend

### Requirement: Meal plan detail page

The system SHALL display a meal plan detail view at `/meal-plans/:id` with a day-based layout showing meals grouped by date. The detail view MUST include tabs: Tagesplan, Tabelle, Nährwerte, Kosten, Einkaufsliste, Vorschläge, and optionally Allergie-Scanner (only when `nutritional_tag_ids.length > 0`).

#### Scenario: User views meal plan detail
- **WHEN** an authenticated user with access navigates to `/meal-plans/:id`
- **THEN** the system shows the plan name, days with meals, and items per meal

#### Scenario: User without access
- **WHEN** a user without access navigates to `/meal-plans/:id`
- **THEN** the system shows a 404 error

#### Scenario: Allergen scan tab visible only with tags
- **WHEN** a MealPlan has `nutritional_tag_ids.length > 0`
- **THEN** the "Allergie-Scanner" tab SHALL be visible

#### Scenario: Allergen scan tab hidden without tags
- **WHEN** a MealPlan has `nutritional_tag_ids.length === 0`
- **THEN** the "Allergie-Scanner" tab SHALL NOT be visible

#### Scenario: User filters nutrition by day
- **WHEN** the user selects a specific day from the horizontal day selector in the nutrition tab
- **THEN** the system fetches and displays nutrition totals specifically aggregated for that day

### Requirement: Meal plan editing
The system SHALL allow users with edit permission to add/remove days, add/remove meals, and add/remove recipe items.

#### Scenario: Editor adds a day via date picker
- **WHEN** a user with edit permission clicks "Tag hinzufügen" and selects a date
- **THEN** the system creates default meals for that date

#### Scenario: Editor adds a day before existing days
- **WHEN** a user with edit permission clicks "Tag davor hinzufügen"
- **THEN** the system creates default meals for the date one day before the first existing day

#### Scenario: Editor adds a day after existing days
- **WHEN** a user with edit permission clicks "Tag danach hinzufügen"
- **THEN** the system creates default meals for the date one day after the last existing day

#### Scenario: Quick-add buttons visibility
- **WHEN** no days exist in the plan
- **THEN** the "Tag davor" and "Tag danach" buttons are not shown

#### Scenario: Editor adds a recipe to a meal
- **WHEN** a user with edit permission clicks "Rezept hinzufügen" on a meal
- **THEN** the system shows a recipe search dialog and adds the selected recipe

#### Scenario: Viewer cannot edit
- **WHEN** a user with viewer role views the detail page
- **THEN** edit buttons are not displayed

### Requirement: Collaborator management on detail page
The system SHALL show a collaborator section on the meal plan detail page allowing owners/admins to add, change role, and remove collaborators.

#### Scenario: Owner adds a collaborator
- **WHEN** the owner enters a username and selects a role
- **THEN** the collaborator is added and appears in the list

#### Scenario: Owner removes a collaborator
- **WHEN** the owner clicks remove on a collaborator
- **THEN** the collaborator is removed after confirmation

#### Scenario: Viewer cannot manage collaborators
- **WHEN** a viewer views the detail page
- **THEN** the collaborator management controls are not shown (only the list)

### Requirement: Route registration
The system SHALL register routes `/meal-plans/app` and `/meal-plans/:id` in `App.tsx`. The create flow SHALL be dialog-based on the list page, not a separate route.

#### Scenario: Routes are accessible
- **WHEN** a user navigates to any of the meal plan routes
- **THEN** the correct page component renders

<!-- Added by ref-meal-sync -->

### Requirement: Verknüpfungs-Status in Planübersicht
Die Meal-Plan-Übersicht SHALL für jedes Meal visuell anzeigen, ob es mit einem RefMeal verknüpft ist (z.B. Link-Icon), entkoppelt ist, oder kein RefMeal für seinen Typ existiert.

#### Scenario: Verknüpftes Meal anzeigen
- **WHEN** ein Meal `is_synced=True` und `ref_meal` gesetzt hat
- **THEN** wird ein Verknüpfungs-Icon (🔗) neben dem Meal angezeigt

#### Scenario: Entkoppeltes Meal anzeigen
- **WHEN** ein Meal `is_synced=False` hat (mit oder ohne ref_meal)
- **THEN** wird kein Verknüpfungs-Icon angezeigt und das Meal erscheint als eigenständig

### Requirement: Sync-Dialog bei Änderung
Die UI SHALL beim Bearbeiten eines konkreten Meals (das einen RefMeal-Typ hat) fragen, ob die Änderung nur für dieses Meal oder für alle (via RefMeal-Update + Sync) übernommen werden soll.

#### Scenario: Änderung mit Sync-Option
- **WHEN** User ein verknüpftes Frühstücks-Meal bearbeitet und speichert
- **THEN** wird ein Dialog angezeigt: "Nur dieses Frühstück" oder "Alle Frühstücke (RefMeal aktualisieren)"

#### Scenario: Nur dieses Meal ändern
- **WHEN** User "Nur dieses Frühstück" wählt
- **THEN** wird das Meal entkoppelt (`is_synced=False`) und die Änderung nur lokal gespeichert

#### Scenario: Alle via RefMeal ändern
- **WHEN** User "Alle Frühstücke" wählt
- **THEN** wird das RefMeal mit den neuen Items aktualisiert und auf alle verknüpften Meals synchronisiert

### Requirement: RefMeal-Editor erreichbar aus Planübersicht
Die Planübersicht SHALL einen Button/Link zum RefMeal-Editor für jeden vorhandenen meal_type bereitstellen.

#### Scenario: RefMeal-Editor öffnen
- **WHEN** User auf "RefMeal bearbeiten" für Frühstück klickt
- **THEN** wird der RefMeal-Editor für das Frühstücks-RefMeal des Plans geöffnet

<!-- Added from recipe-search-enhancement -->

### Requirement: Prominenter CTA-Button im leeren Mahlzeiten-Slot
Ein leerer MealSlot (items.length === 0, nicht is_external, canEdit true) MUSS einen prominenten "Rezept wählen"-Button anzeigen, der den RecipeSearchDialog öffnet.

#### Scenario: Leerer MealSlot zeigt CTA
- **WHEN** ein MealSlot keine Items hat, nicht external ist und canEdit true ist
- **THEN** ein großer Button "🔍 Rezept oder Zutat wählen" wird im Slot-Body gerendert

#### Scenario: MealSlot mit Items zeigt keinen CTA
- **WHEN** ein MealSlot bereits Items zugewiesen hat
- **THEN** der CTA-Button wird nicht angezeigt; bestehende + und Sliders-Buttons bleiben

#### Scenario: Externer MealSlot zeigt keinen CTA
- **WHEN** ein MealSlot is_external true hat
- **THEN** der CTA-Button wird nicht angezeigt

### Requirement: Leerer-Status als Klickfläche
Der Hinweis-Text "Noch kein Rezept zugeordnet" in einem leeren MealSlot MUSS anklickbar sein und den RecipeSearchDialog öffnen.

#### Scenario: Klick auf leeren Hinweis
- **WHEN** User auf "Noch kein Rezept zugeordnet" klickt
- **THEN** der RecipeSearchDialog öffnet sich

### Requirement: Rezept-vorschlagen-Button
Ein leerer MealSlot MUSS einen "Rezept vorschlagen"-Button zeigen, der ein zufälliges filterkonformes Rezept aus den Top-20 Ergebnissen abruft und den RecipePreviewDialog öffnet.

#### Scenario: Zufalls-Vorschlag
- **WHEN** User auf "Rezept vorschlagen" klickt
- **THEN** ein zufälliges Rezept aus den Top-20 passenden Ergebnissen wird abgerufen und der RecipePreviewDialog geöffnet

#### Scenario: Nutzer bestätigt Vorschlag
- **WHEN** User im PreviewDialog auf "Hinzufügen" klickt
- **THEN** das Rezept wird dem Meal hinzugefügt und der Dialog schließt sich

#### Scenario: Nutzer lehnt Vorschlag ab
- **WHEN** User im PreviewDialog auf "Abbrechen" klickt
- **THEN** das Rezept wird nicht hinzugefügt und der Dialog schließt sich

#### Scenario: Keine passenden Rezepte
- **WHEN** keine Rezepte die aktuellen Filter (Diät, Kategorie) erfüllen
- **THEN** der Button zeigt "Keine passenden Rezepte" und ist deaktiviert

### Requirement: Recipe selection excludes plan tags

The inline recipe search and RecipeSearchDialog SHALL exclude recipes that match the MealPlan's nutritional tags (exclusion semantics). The dietary filter checkbox SHALL be removed or relabeled to reflect exclusion semantics.

#### Scenario: Recipe search excludes plan tags
- **WHEN** the user searches recipes for a MealPlan with nutritional tags [Erdnuss, Milch]
- **THEN** recipes containing those tags SHALL NOT appear in results

#### Scenario: Random recipe suggestion excludes plan tags
- **WHEN** the user clicks "Rezept vorschlagen"
- **THEN** the random suggestion SHALL NOT contain any of the plan's nutritional tags

### Requirement: Verbesserte Inline-Suchergebnisse
Die Inline-Such-Ergebnisliste im MealSlot MUSS für jeden Vorschlag anzeigen: Ampel-Farbpunkt (recipe_badge), Preis pro Portion, und Verwendungshäufigkeit.

#### Scenario: Inline-Ergebnis mit Ampel und Preis
- **WHEN** Suchergebnisse in der Inline-Suche angezeigt werden
- **THEN** jedes Ergebnis zeigt farbigen Punkt (grün/gelb/rot), Preis ("X,XX €"), und Verwendungszähler ("12×")

#### Scenario: Inline-Ergebnis ohne Preis
- **WHEN** ein Rezept keinen Preis hat (price_per_serving null)
- **THEN** "—" wird anstelle des Preises angezeigt
