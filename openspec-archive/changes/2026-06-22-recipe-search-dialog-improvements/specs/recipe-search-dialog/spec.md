## ADDED Requirements

### Requirement: Fallback-Banner zeigt ehrlichen Text
Wenn der Suchlauf einen Typ-Filter anwendet, aber weniger Rezepte findet als das Limit, und daraufhin den Pool auffüllt (fallback_applied = true), SHALL das System einen informativen Hinweis anzeigen — nicht "Keine Rezepte gefunden".

#### Scenario: Fallback mit vorhandenen Rezepten
- **WHEN** `fallback_applied` ist `true` und die Ergebnisliste enthält Rezepte
- **THEN** zeigt das System den Text "Nicht genug Rezepte für diesen Typ — zeige auch andere" (oder ähnlich)
- **THEN** zeigt das System NICHT den Text "Keine Rezepte gefunden"

#### Scenario: Kein Fallback
- **WHEN** `fallback_applied` ist `false`
- **THEN** wird kein Fallback-Banner angezeigt

### Requirement: RecentlyUsedSection ist im Dialog klickbar
Die "Kürzlich verwendet"-Chips im Dialog SHALL anklickbar sein und beim Klick das jeweilige Rezept direkt auswählen (ohne Preview-Zwischenschritt).

#### Scenario: Klick auf kürzlich verwendetes Rezept
- **WHEN** der Nutzer auf einen Chip in der RecentlyUsedSection klickt
- **THEN** wird `onSelect(recipe.id)` aufgerufen
- **THEN** schließt sich der Dialog

#### Scenario: RecentlyUsed-Sektion erscheint im Dialog
- **WHEN** der Dialog geöffnet wird und der Nutzer mind. ein Rezept zuvor verwendet hat
- **THEN** ist die RecentlyUsedSection im Dialog sichtbar

### Requirement: Schema verwendet `portions` statt `servings`
Das Frontend-Zod-Schema für `RecipeSearchResult` und `RecipeRecentlyUsed` SHALL das Feld `portions` verwenden, konsistent mit dem Backend-Modell und der API-Response.

#### Scenario: `portions`-Feld ist im Schema vorhanden
- **WHEN** die API ein Rezept mit `portions: 10` zurückgibt
- **THEN** ist `recipe.portions === 10` im Frontend verfügbar

### Requirement: `snack`-Slot-Filter enthält nur gültige recipe_types
Der Default-Typ-Filter für Snack-Slots SHALL nur `['snack']` enthalten — nicht `['snack', 'ingredient']`, da `ingredient` kein gültiger `recipe_type` für Rezepte ist.

#### Scenario: Snack-Slot öffnet Dialog ohne ingredient-Filter
- **WHEN** ein Snack-Slot den Dialog öffnet
- **THEN** wird `recipe_types=snack` an die API geschickt (ohne `ingredient`)
- **THEN** ist `fallback_applied` nicht durch den ungültigen Typ ausgelöst

### Requirement: CategoryPills enthält den `ingredient`-Chip
Die CategoryPills-Komponente SHALL einen Chip für den Typ `ingredient` (Label: "Zutat") anbieten.

#### Scenario: ingredient-Chip erscheint in der Filterliste
- **WHEN** der Dialog geöffnet wird
- **THEN** ist ein Chip "Zutat" in der Typ-Filterzeile sichtbar und klickbar

### Requirement: RECIPE_TYPE_LABELS ist zentral definiert
`RECIPE_TYPE_LABELS` SHALL nur in `CategoryPills.tsx` definiert sein. Alle anderen Komponenten, die Labels benötigen, SHALL daraus importieren.

#### Scenario: Kein Duplikat in RecipeSearchCard
- **WHEN** `RecipeSearchCard` einen Typ-Label anzeigt
- **THEN** verwendet sie die importierte Map aus `CategoryPills`

### Requirement: RecipeSearchCard verwendet Design-Token-Farben
Die Typ-Badges in `RecipeSearchCard` SHALL keine hardcodierten Tailwind-Farbklassen (`bg-amber-100`, `text-blue-800` etc.) verwenden, sondern ausschließlich Design-Token-Klassen (`bg-muted`, `text-muted-foreground`).

#### Scenario: Typ-Badge rendert ohne hardcodierte Farben
- **WHEN** ein Rezept mit beliebigem `recipe_type` gerendert wird
- **THEN** verwendet der Typ-Badge nur `bg-muted` und `text-muted-foreground`

### Requirement: useEffect-Dependency ist vollständig
Der `useEffect` in `RecipeSearchDialog`, der den State beim Öffnen zurücksetzt, SHALL `mealType` als Dependency enthalten, damit sich die vorausgewählten Chips aktualisieren wenn sich der mealType ändert.

#### Scenario: mealType-Wechsel aktualisiert Chip-Auswahl
- **WHEN** `mealType` sich ändert (z.B. durch erneutes Öffnen mit anderem Slot)
- **THEN** werden die vorausgewählten Chips entsprechend dem neuen `mealType` gesetzt

### Requirement: Backend filtert Ernährungs-Tags vor dem Limit-Schnitt
Die Tag-Filter `nutritional_tag_ids` und `exclude_nutritional_tag_ids` im `search_recipes`-Endpunkt SHALL als SQL-Queryset-Filter angewendet werden, bevor `[:limit]` die Ergebnismenge beschneidet.

#### Scenario: Ausreichend Rezepte trotz Tag-Ausschluss
- **WHEN** `exclude_nutritional_tag_ids` einen verbreiteten Tag ausschließt
- **THEN** enthält die Response bis zu `limit` Rezepte (soweit verfügbar), nicht weniger

### Requirement: useRandomRecipeSuggestion handhabt leeres Array
`useRandomRecipeSuggestion` SHALL sicher mit einem leeren Array-Response umgehen. Konsumenten SHALL prüfen ob ein Element vorhanden ist, bevor sie `[0]` verwenden.

#### Scenario: Kein Resultat beim Random-Request
- **WHEN** die API ein leeres Array zurückgibt
- **THEN** wird kein Fehler geworfen
- **THEN** zeigt die UI keinen Shuffle-Vorschlag an

### Requirement: RecentlyUsed-Schema enthält `portions`
`RecipeRecentlyUsedSchema` SHALL das Feld `portions` enthalten, konsistent mit dem `RecipeSearchResultSchema`.

#### Scenario: portions ist im RecentlyUsed-Objekt verfügbar
- **WHEN** die API ein kürzlich verwendetes Rezept mit `portions: 8` zurückgibt
- **THEN** ist `recipe.portions === 8` im Frontend verfügbar
