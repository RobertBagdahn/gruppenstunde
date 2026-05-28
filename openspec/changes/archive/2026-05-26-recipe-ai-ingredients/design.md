## Context

Der Rezept-Erstellungs-Wizard nutzt aktuell `POST /api/content/ai/refurbish/` um aus Freitext strukturierte Felder zu generieren. Parallel existiert `POST /api/content/ai/suggest-supplies/` mit `suggest_recipe_supplies()` + `match_ingredients_to_database()`, das Zutaten aus Titel/Beschreibung extrahiert und gegen die DB matcht. Beide Systeme sind unverbunden.

## Goals / Non-Goals

**Goals:**
- Ein einziger Ladevorgang im Wizard liefert Titel, Beschreibung UND Zutaten
- Zutaten in Schritt 2 bearbeitbar (Menge, Einheit, löschen, hinzufügen)
- Existierenden Code wiederverwenden, keine Duplikation
- Gematchte Zutaten (mit `ingredient_id`) direkt als `RecipeItem`s speicherbar

**Non-Goals:**
- Kitchen Equipment (kommt später)
- Neuer AI-Prompt oder neuer Endpoint
- Änderungen am `suggest_recipe_supplies()`-Service selbst
- Zutaten-Bilder oder Nährwert-Anzeige im Wizard

## Decisions

1. **Inline-Aufruf im Refurbish-Endpoint**: Nach `service.refurbish()` wird für `content_type=="recipe"` synchron `suggest_recipe_supplies(title, description)` + `match_ingredients_to_database()` aufgerufen. Kein paralleler Frontend-Call.

2. **Optionales Feld**: `suggested_ingredients` ist `list[...] = []` — für nicht-Rezept Content-Typen bleibt es leer. Kein Breaking Change.

3. **Bearbeitbare Liste im Wizard**: Frontend hält `suggested_ingredients` als lokalen State in Schritt 2. User kann Menge/Einheit editieren, Einträge löschen, neue via bestehendes `IngredientAutocomplete` hinzufügen.

4. **Save-Logik**: Beim Speichern des Rezepts werden die Zutaten als `RecipeItem`s über die existierende Recipe-Item-API angelegt (sequentiell nach Rezept-Erstellung).

5. **Nicht-gematchte Zutaten**: Wenn `ingredient_id == null` (kein DB-Match), wird die Zutat im Wizard trotzdem angezeigt aber beim Speichern übersprungen (oder User wird aufgefordert eine DB-Zutat auszuwählen via Autocomplete).

## Risks / Trade-offs

- **Latenz**: Refurbish-Call dauert jetzt länger (~5-10s statt ~3-5s) weil zwei AI-Calls sequentiell laufen. Akzeptabel da der User bereits einen Spinner sieht und nur einen Ladevorgang hat.
- **Fehlertoleranz**: Wenn `suggest_recipe_supplies()` fehlschlägt, soll der Refurbish trotzdem erfolgreich sein — Zutaten-Array bleibt dann leer, Rest-Daten werden normal geliefert.
- **Nicht-gematchte Zutaten**: AI generiert manchmal Zutaten-Namen die kein DB-Match haben. Diese werden angezeigt aber der User muss manuell eine passende DB-Zutat auswählen.
