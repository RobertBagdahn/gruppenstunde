## Why

Die Zutaten-Suche im Autocomplete nutzt `icontains`-Filterung mit alphabetischer Sortierung. Häufige Zutaten wie "Salz" erscheinen nicht oben, weil reine Substring-Treffer alphabetisch sortiert werden. Nutzer sehen zu wenige Informationen im Dropdown (nur Name + Kategorie) und die Auswahl ist auf 8 Ergebnisse begrenzt. Der bestehende `suggest`-Endpunkt mit Trigram-Ähnlichkeit wird nur im Fehlerfall (UnknownIngredientDialog) genutzt, nicht im Haupt-Autocomplete.

## What Changes

- **Autocomplete nutzt `suggest`-Endpunkt**: Der `IngredientAutocomplete` im Food-Frontend wird von der alphabetischen List-API (`GET /api/ingredients/?name=`) auf den Trigram-Suggest-Endpunkt (`GET /api/ingredients/suggest/`) umgestellt. Ergebnislimit wird von 8 auf 15 erhöht.
- **`usage_count` auf Ingredient-Model**: Neues `usage_count`-Feld (IntegerField, default=0) zählt wie oft eine Zutat in Rezepten verwendet wird (via `RecipeItem`). Wird als Sekundär-Sortierung bei gleichem Trigram-Score genutzt und im Frontend als "23× verwendet" angezeigt.
- **Suggest-Endpunkt erweitert**: Der `suggest`-Endpunkt gibt zusätzlich `nutri_class`, `price_per_kg` und `usage_count` zurück. Sortierung: 1. `similarity DESC`, 2. `usage_count DESC`.
- **Dropdown-Info erweitert**: Der Autocomplete zeigt pro Ergebnis: Name, Nutri-Score-Badge (farbig A–E), Preis pro kg und Verwendungshäufigkeit.

## Capabilities

### New Capabilities
- `ingredient-usage-count`: `usage_count`-Feld auf Ingredient-Model mit Background-Update bei RecipeItem-Änderungen. API-exponiert im Suggest- und Detail-Endpoint.

### Modified Capabilities
- `ingredient-autocomplete`: Umstellung von List-API auf Suggest-API, erweiterte Dropdown-Info (Nutri-Score, Preis, Häufigkeit), Limit 15 statt 8.
- `ingredient-fuzzy-match`: Suggest-Endpunkt gibt zusätzliche Felder zurück (`nutri_class`, `price_per_kg`, `usage_count`), Sekundär-Sortierung nach `usage_count`, konfigurierbares Limit.

## Impact

- **Backend** (`supply`): Ingredient-Model (neues Feld `usage_count` + Migration), `suggest_ingredients`-Service (erweiterte Response-Felder, Sortierung), Signal/Callback für `usage_count`-Update bei RecipeItem-Änderungen. Suggest-Schema erweitert.
- **Frontend-Food** (`IngredientAutocomplete`): Wechsel von List-API zu Suggest-API, erweiterte Darstellung (Nutri-Score-Badge, Preis, Häufigkeit), angepasste Keyboard-Navigation für mehr Ergebnisse.
- **Migration**: Eine Migration für `usage_count`-Feld + Data-Migration zum Befüllen aus bestehenden RecipeItem-Referenzen.
