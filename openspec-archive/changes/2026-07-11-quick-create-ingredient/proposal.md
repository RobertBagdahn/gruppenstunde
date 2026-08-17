## Why

Beim Erstellen und Bearbeiten von Rezepten fehlt aktuell die M�glichkeit, eine neue Zutat direkt im Flow anzulegen. Der Nutzer muss den Rezept-Editor verlassen, auf `/ingredients/new` navigieren, den 3-Schritte-Wizard durchlaufen, und dann manuell zur�ck zum Rezept finden. Das unterbricht den Arbeitsfluss und f�hrt zu Frustration, besonders wenn die gesuchte Zutat nicht in der Datenbank existiert.

## What Changes

- **IngredientAutocomplete**: Zeigt immer einen "Neue Zutat anlegen"-Eintrag am Ende der Dropdown-Liste, wenn `query.length >= 2`. Klick navigiert direkt zur CreateIngredientPage mit vorausgef�lltem Namen und Redirect-Param.
- **IngredientDetailSearchDialog**: Erh�lt einen permanenten "+"-Button im Header, der zur CreateIngredientPage navigiert (ohne prefill, mit Redirect-Param).
- **CreateIngredientPage**: Unterst�tzt neue Query-Parameter `?prefillName=` und `?redirectTo=`. Bei `prefillName` wird Step 0 �bersprungen und der Name im Formular vorausgef�llt. Nach erfolgreichem Speichern wird automatisch zur `redirectTo`-URL navigiert, mit `?newIngredientSlug=` angeh�ngt.
- **InlineIngredientEditor**: Erkennt den `?newIngredientSlug=` Parameter, l�dt die Zutat samt Portionen, �ffnet den `IngredientQuantityDialog` und f�gt die Zutat nach Best�tigung zum Rezept hinzu.
- **UnknownIngredientDialog**: Bleibt unver�ndert f�r Enter-auf-kein-Treffer. Der "Neu anlegen"-Button navigiert jetzt ebenfalls mit `prefillName` + `redirectTo` Parametern.

## Capabilities

### New Capabilities

Keine. Die �nderungen erweitern bestehende F�higkeiten.

### Modified Capabilities

- `ingredient-autocomplete`: "Neue Zutat anlegen"-Eintrag am Dropdown-Ende + Navigation mit Query-Parametern
- `ingredient-detail-search`: Permanenter "+"-Button im Dialog-Header + Return-Handling
- `ingredient-creation-stepper`: `?prefillName=` und `?redirectTo=` Parameter, Step-0-�berspringen, Redirect nach Speichern
- `recipe-inline-edit`: `?newIngredientSlug=` Parameter erkennen, Zutat laden + QuantityDialog + Einf�gen

## Impact

- **Frontend**: Enhancer an `IngredientAutocomplete`, `IngredientDetailSearchDialog`, `CreateIngredientPage`, `UnknownIngredientDialog`, `InlineIngredientEditor` (alle in `frontend-food/`)
- **Backend**: Keine �nderungen n�tig (existierende APIs decken alles ab)
- **Schemas**: Keine Pydantic/Zod-�nderungen n�tig
- **Migrations**: Keine
- **Routen**: `/ingredients/new` unterst�tzt neue optionale Query-Parameter (r�ckw�rtskompatibel)
