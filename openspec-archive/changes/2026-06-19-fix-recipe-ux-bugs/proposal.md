## Why

Sechs zusammenhängende UX-Bugs im Food-Frontend blockieren Kern-Workflows: Portionszahlen lassen sich nicht löschen, manuell ausgewählte Zutaten verschwinden beim Speichern, neue Zutaten können aus dem Rezepteditor nicht angelegt werden, Autocomplete-Vorschläge versagen in Produktion und das Einheiten-Dropdown ist verwirrend. Die Bugs machen Rezeptarbeit und Essensplanung für Nutzer schwer benutzbar.

## What Changes

- **Number-Input-Bug**: Alle `type="number"`-Felder in Essensplan-Erstellung, Plan-Einstellungen, Rezept-Erstellung und Edit-Modus auf String-State + eigenes Parse umstellen, damit leere Eingabe nicht sofort zu 0/1 wird.
- **Rezept-Servings im Bearbeitungsmodus**: Servings-Zahl des Rezepts wird zum Skalieren der Zutaten-Anzeige genutzt, aber beim Speichern bleibt `servings=1` (Datenmodell unverändert).
- **Zutaten-Auswahl fixen**: Nach Auswahl einer Zutat im Create-Flow sofort Portionen laden und Nutzer die Portion manuell wählen lassen, bevor `portion_id` gesetzt und die Zutat speicherbar wird.
- **Neue Zutat inline anlegen**: `UnknownIngredientDialog`-„Neu anlegen“ echt implementieren — `useCreateIngredient` aufrufen, Default-Portion anlegen, dann in den Editor einfügen.
- **API-URLs korrigieren**: Alle hardcodierten `/api/...`-Pfade in `IngredientAutocomplete`, `UnknownIngredientDialog` und `InlineIngredientEditor` auf `API_BASE_URL` umstellen.
- **Einheiten-Dropdown eindeutig labeln**: Im Inline-Editor `<option>`-Labels von `{measuring_unit_name || name}` auf `{quantity} {measuring_unit_name || name}` ändern (z.B. „1 Gramm“, „100 Gramm“, „1 Stück“).

## Capabilities

### New Capabilities

Keine — alle Änderungen sind Bugfixes innerhalb bestehender Features.

### Modified Capabilities

- `recipe-inline-edit`: InlineIngredientEditor bekommt echten `createIngredient`-Flow und eindeutigere Portionen-Labels.
- `ingredient-autocomplete`: API-Pfade werden auf `API_BASE_URL` umgestellt; UnknownIngredientDialog erhält funktionierendes „Neu anlegen“.
- `recipe-portion-scaling-edit`: Servings-Wert wird im Editor nur noch zur Anzeige-Skalierung verwendet, nicht mehr beim Speichern überschrieben.

## Impact

- **Frontend Food**: `CreateRecipePage`, `EditRecipePage`, `MealEventListPage`, `SettingsPanel` (Number-Inputs); `InlineIngredientEditor`, `IngredientAutocomplete`, `UnknownIngredientDialog` (API-URLs, Portion-Auswahl, Neu-Anlage); `RecipeDetailPage` (Servings-Prop an Editor).
- **Backend**: Keine Änderungen nötig. Ingredient- und Recipe-APIs bleiben unverändert.
- **Keine Migrationen**, keine Schema-Änderungen an `RecipeItemCreateIn`/`RecipeItemUpdateIn`.
