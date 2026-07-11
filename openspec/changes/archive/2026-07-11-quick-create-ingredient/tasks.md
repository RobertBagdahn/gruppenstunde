## 1. CreateIngredientPage — Query-Parameter Support

- [x] 1.1 `?prefillName=` Parameter lesen: `useSearchParams()` in der Komponente verwenden, bei gesetztem Wert Step 0 überspringen (`setStep(1)`) und `formData.name` vorausfüllen
- [x] 1.2 `?redirectTo=` Parameter lesen und in einer lokalen Variable speichern (z.B. `redirectTo = searchParams.get('redirectTo')`)
- [x] 1.3 `handleSave()` anpassen: Nach erfolgreichem Speichern prüfen, ob `redirectTo` gesetzt ist. Falls ja: `navigate(\`${redirectTo}?newIngredientSlug=${slug}\`)`, sonst wie bisher `navigate(\`/ingredients/${slug}\`)`
- [x] 1.4 Step-0-Indikator prüfen: Sicherstellen, dass der Zurück-Button im Stepper den Nutzer zu Step 0 zurückkehren lässt, auch wenn `prefillName` gesetzt war
- [ ] 1.5 Manuell testen: `/ingredients/new?prefillName=Test&redirectTo=/recipes/42` → Step 0 skipped, Name pre-filled, Save → redirect

## 2. IngredientAutocomplete — "Neue Zutat anlegen" im Dropdown

- [x] 2.1 Dropdown-Sichtbarkeit erweitern: `isOpen && suggestions.length > 0` → `isOpen && (suggestions.length > 0 || debouncedQuery.length >= 2)`
- [x] 2.2 "Neue Zutat anlegen"-Item rendern: Am Ende der `suggestions.map()` ein separator + klickbares Item mit `✨ "{query}" neu anlegen`
- [x] 2.3 `onSelect` nicht für das create-new Item verwenden — stattdessen `onCreateNew(query)` aufrufen und Dropdown schließen
- [x] 2.4 `onCreateNew` callback im `InlineIngredientEditor` anpassen: Statt dummy ingredient → `navigate(\`/ingredients/new?prefillName=${name}&redirectTo=${window.location.pathname}${window.location.search}\`)`
- [ ] 2.5 Manuell testen: "Brokkolie" tippen → Item erscheint am Dropdown-Ende → Klick → /ingredients/new mit params

## 3. UnknownIngredientDialog — Navigation mit Params

- [x] 3.1 `onCreateNew` Aufruf anpassen: `navigate(\`/ingredients/new?prefillName=${query}&redirectTo=${...}\`)` statt `navigate('/ingredients/new')`
- [x] 3.2 Quell-URL ermitteln: `window.location.pathname + window.location.search` als `redirectTo` übergeben
- [ ] 3.3 Manuell testen: Im Rezept-Editor Zutat tippen, Enter ohne Treffer → UnknownIngredientDialog → "Neu anlegen" → correct params

## 4. IngredientDetailSearchDialog — "+" Button

- [x] 4.1 "+"-Button im `DialogHeader` hinzufügen: `<button>` mit `Plus`-Icon (lucide), positioned z.B. rechts im Header neben dem Titel
- [x] 4.2 Button-Action: `navigate(\`/ingredients/new?redirectTo=${window.location.pathname}${window.location.search}\`)`, Dialog schließen
- [x] 4.3 `newIngredientSlug`-Return-Handling (optional): Wenn der Dialog offen ist und die Seite mit `?newIngredientSlug=` geladen wird, Zutat laden und `IngredientQuantityDialog` öffnen — handled by InlineIngredientEditor (Task 5)
- [ ] 4.4 Manuell testen: Detail-Suche öffnen → "+"-Button → erstellt Zutat → zurück → Quantity-Dialog erscheint

## 5. InlineIngredientEditor — Return-from-Creation Handling

- [x] 5.1 `useSearchParams` (oder `useLocation`) in `InlineIngredientEditor` einbinden, `newIngredientSlug`-Param lesen
- [x] 5.2 `useEffect`: Wenn `newIngredientSlug` gesetzt ist, Zutat per `GET /api/ingredients/${newIngredientSlug}/` fetchen, dann Portionen per `GET /api/ingredients/${newIngredientSlug}/portions/`
- [x] 5.3 `handleAddIngredient`-ähnliche Logik anwenden: Beste Portion auswählen, `IngredientQuantityDialog` öffnen (oder direkt `handleAddIngredient` mit der geladenen Zutat aufrufen)
- [x] 5.4 Nach erfolgreichem Hinzufügen (oder bei Abbruch): `newIngredientSlug` aus der URL entfernen via `navigate(window.location.pathname, { replace: true })`
- [x] 5.5 Fehlerbehandlung: Bei 404/403 → Parameter still entfernen, kein Toast
- [ ] 5.6 Manuell testen: `/recipes/42?newIngredientSlug=brokkolie` laden → QuantityDialog öffnet → bestätigen → Zutat im Rezept → URL clean

## 6. Final Review & Cleanup

- [x] 6.1 Alle `console.log` / Debug-Outputs entfernen
- [ ] 6.2 Durchlauf testen: Rezept erstellen → Zutat suchen (keine Treffer) → "neu anlegen" klicken → Wizard → speichern → zurück im Rezept → Zutat ist da
- [ ] 6.3 Durchlauf testen: Rezept bearbeiten → Detailsuche öffnen → "+" → Wizard → speichern → zurück → QuantityDialog → Zutat im Rezept
- [ ] 6.4 Edge Case: `newIngredientSlug` mit ungültigem Slug → kein Crash
- [ ] 6.5 Edge Case: `redirectTo` mit Sonderzeichen → korrekt encodiert in URL
- [ ] 6.6 Edge Case: Nutzer bricht Wizard ab → bleibt auf `/ingredients/new` (kein broken redirect)
