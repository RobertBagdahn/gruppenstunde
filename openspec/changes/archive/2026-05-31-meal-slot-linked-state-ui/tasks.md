## 1. MealSlot Header bereinigen

- [x] 1.1 Entferne das 🔗 Emoji (`meal.is_synced` Span mit Emoji) aus dem MealSlot Header (Zeile ~816-819)
- [x] 1.2 Stelle sicher, dass das `link`/`link_off` Icon weiterhin korrekt angezeigt wird (bereits implementiert)

## 2. Read-only Zustand bei verknüpften Meals

- [x] 2.1 Verstecke den Add-Recipe-Button (+) wenn `meal.is_synced === true` (Zeile ~843-851)
- [x] 2.2 Ersetze das Factor-Input durch reinen Text wenn `meal.is_synced === true` (in der Items-Schleife, Zeile ~895-898)
- [x] 2.3 Verstecke den Item-Delete-Button (×) wenn `meal.is_synced === true` (Zeile ~902-909)

## 3. Visuelles Feedback für Referenz-Mahlzeit

- [x] 3.1 Füge Label "Referenz-Mahlzeit" mit `sync` Icon über den Items ein wenn `meal.is_synced === true` (nach dem Header, vor der Items-Schleife)
- [x] 3.2 Füge `text-muted-foreground` Klasse zu den Items hinzu wenn `meal.is_synced === true` (auf dem äußeren div der Items-Schleife, Zeile ~872)
