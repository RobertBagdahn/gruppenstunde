## Why

Der Frühstücksassistent hat aktuell drei hartcodierte Getränke (Kaffee, Kakao, Tee) mit festen Prozent-Sliddern. Es gibt keine Möglichkeit, andere Getränke-Rezepte auszuwählen oder die Auswahl dynamisch zu erweitern. Gleichzeitig fehlt ein Mechanismus, um Rezepte für bestimmte Frühstückstage zu kennzeichnen und im Wizard danach zu filtern.

## What Changes

- **Step 4 (Getränke) wird dynamisch**: Statt drei festen Kaffee/Kakao/Tee-Sliddern eine beliebig erweiterbare Liste von Drink-Rezepten, jeweils mit Prozent-Anteil
- **Neues DrinkState-Format**: `{ mlPerPerson, selected: [{ recipeId, title, sharePercent }] }` — kein Milch-Feld mehr (Milch fliegt aus Step 4)
- **RecipeSearchDialog erhält Frühstückstag-Filter**: Neue Filter-Pill-Reihe im Dialog, die nach content.Tag (breakfast day) filtert
- **Neues content.Tag group-Feld**: Zur Unterscheidung von Frühstückstag-Tags vs. anderen Tags (`group="breakfast_day"`)
- **Rezept-Edit-Formular erweitert**: Frühstückstage als Multi-Select-Tag-Auswahl
- **Tag-Verwaltungs-UI**: CRUD-Oberfläche für Frühstückstag-Tags (anlegen, umbenennen, löschen)
- **Seed-Daten**: Standard-Frühstückstage (Tag 1–5) als content.Tags mit `group="breakfast_day"`
- **Alt-Daten werden ignoriert**: Bestehende RefMeals mit coffee/cocoa/tea-Format bleiben lesbar, werden nicht konvertiert

## Capabilities

### New Capabilities
- `breakfast-days`: Frühstückstag-Tags auf Rezepten — Verwaltung (CRUD), Zuordnung zu Rezepten, Filter im RecipeSearchDialog

### Modified Capabilities
- `breakfast-wizard`: Step 4 (Getränke) wird von hartcodierten Kaffee/Kakao/Tee-Sliddern auf dynamische, rezeptbasierte Drink-Auswahl umgestellt

## Impact

- **Backend**: `content.Tag` erhält neues `group`-Feld; neuer Endpunkt für breakfast day Tags; BreakfastCatalog API optionaler `day_tag_id`-Filter; Recipe-Search-API optionaler `tag_ids`-Filter; bestehende Drink-Speicherlogik in RefMeal-Items ändert sich
- **Frontend (food)**: `WizardState.drinks` neues Format; `StepGetraenke` komplett neu (dynamische Drink-Liste statt fester Slider); `RecipeSearchDialog` neue Filter-Pill-Reihe; neues `BreakfastDayManager`-UI; `refMealToWizardState` angepasst für neues Drink-Format
- **Neue Abhängigkeiten**: keine
- **Migration**: Alt-RefMeals mit altem Drink-Format werden ignoriert (keine Rückwärtskonvertierung)
