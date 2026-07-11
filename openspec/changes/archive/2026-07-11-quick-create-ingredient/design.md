## Context

Beim Rezept-Erstellungs- und Bearbeitungsprozess gibt es aktuell keine M�glichkeit, eine neue Zutat inline zu erstellen, ohne den Flow zu verlassen. Der Nutzer muss manuell auf `/ingredients/new` navigieren, den 3-Schritte-Wizard durchlaufen, und dann eigenst�ndig zur�ck zum Rezept finden. Diese Unterbrechung ist besonders st�rend, wenn die Schnellsuche keine Treffer liefert.

Existierende Komponenten und ihre Rollen:
- `IngredientAutocomplete` (Schnellsuche): Typ-ahead mit Debounce, zeigt bis zu 8 Treffer. Bei Enter ohne Treffer �ffnet `UnknownIngredientDialog`.
- `IngredientDetailSearchDialog` (Detailsuche): Vollbild-Dialog mit Filtern (Abteilung, Gruppe, Di�t-Tags, Sortierung). Nutzer klickt Zutat → `IngredientQuantityDialog` → Menge/Portion → zum Rezept.
- `CreateIngredientPage` (3-Step Wizard): `/ingredients/new` — Modus w�hlen → Stammdaten → Vorschau/Speichern.
- `UnknownIngredientDialog`: Fuzzy-Match-Vorschl�ge + "Neu anlegen"-Button, der zu `/ingredients/new` navigiert.
- `InlineIngredientEditor`: Kernkomponente f�r Rezept-Zutaten. H�lt `editItems`-State, ruft `handleAddIngredient` auf.

Backend: `POST /api/ingredients/` erstellt Zutat mit minimal `name`. Signal `create_base_portion_for_ingredient` erzeugt automatisch 3 System-Portionen (g, St�ck, Packung). Die "g"-Portion mit `weight_g=1` ist immer verf�gbar.

## Goals / Non-Goals

**Goals:**
- Nutzer kann aus dem Rezept-Editor heraus eine neue Zutat erstellen, ohne den Flow zu verlassen
- Nach der Erstellung wird die Zutat automatisch in das Rezept eingef�gt
- Der Weg vom "Ich finde meine Zutat nicht" bis "Zutat ist im Rezept" ist nahtlos

**Non-Goals:**
- Kein neuer Backend-Endpoint (existierende APIs reichen)
- Keine neuen UI-Komponenten f�r die Zutaten-Erstellung (CreateIngredientPage wird wiederverwendet)
- Keine �nderung am `UnknownIngredientDialog`-Verhalten (bleibt f�r Enter-auf-kein-Treffer)
- Kein Inline-Creation-Dialog (kein neues Modal)

## Decisions

### Decision 1: Existierende CreateIngredientPage statt neuem Modal

**Gew�hlt:** Navigation zur existierenden `CreateIngredientPage` mit Query-Parametern.

**Alternative erwogen:** Neuer minimaler Modal-Dialog (Name + optional Abteilung) direkt im Rezept-Editor.

**Begr�ndung:** Der 3-Schritte-Wizard bietet bereits einen bew�hrten Erstellungs-Workflow mit KI-Unterst�tzung, URL-Import und Validierung. Ein separates Modal w�rde diesen Flow duplizieren und warten m�ssen. Durch Query-Parameter wird die Seite kontextbezogen: `?prefillName=` �berspringt Step 0 und f�llt den Namen vor, `?redirectTo=` steuert die R�ckkehr.

### Decision 2: URL-basierte R�ckkehr-Handshake

**Gew�hlt:** `?redirectTo=recipe:123` → nach Speichern redirect zu `/recipes/123?newIngredientSlug=<slug>`. `InlineIngredientEditor` liest `newIngredientSlug`, l�dt Zutat + Portionen, �ffnet `IngredientQuantityDialog`.

**Alternative erwogen:** Callback-Funktion �bergeben (z.B. via React Router State).

**Begr�ndung:** URL-basiert ist robuster (�berlebt Page-Reloads, funktioniert mit Browser-Navigation), passt zum URL-Driven-State-Prinzip des Projekts, und ist einfach zu debuggen. React Router State w�re fragil bei mehreren Tabs oder Reload.

### Decision 3: "Neue Zutat anlegen" immer im Dropdown

**Gew�hlt:** Der Eintrag erscheint **immer** am Ende der Autocomplete-Dropdown-Liste, nicht nur wenn keine Treffer existieren.

**Begr�ndung:** Der Nutzer soll immer den Ausweg haben, eine neue Zutat anzulegen — auch wenn die Suche Treffer liefert, die nicht passen. Konsistente UX.

### Decision 4: Kein Fuzzy-Dialog beim Klick auf "neu anlegen"

**Gew�hlt:** Direkter Klick auf "Neue Zutat anlegen" �berspringt `UnknownIngredientDialog` und navigiert direkt zur CreateIngredientPage.

**Begr�ndung:** Der Nutzer hat bewusst "neu anlegen" gew�hlt. Ein Zwischenschritt mit "Meintest du...?" w�re ein unn�tiger Klick. Der Fuzzy-Dialog bleibt �ber Enter-auf-kein-Treffer erreichbar.

### Decision 5: Autonatische R�ckkehr nach Speichern

**Gew�hlt:** Nach erfolgreichem Speichern auf Step 3 wird sofort zur `redirectTo`-URL navigiert (kein "Zur�ck zum Rezept"-Button n�tig).

**Begr�ndung:** Schnellster Flow, ein Klick weniger. Der Nutzer hat die Zutat gerade erstellt und will sie sofort im Rezept verwenden.

## Risks / Trade-offs

- **[Risk] Schritt 0 wird �bersprungen** → Nutzer kann KI-Modus oder URL-Import nicht nutzen, wenn `?prefillName=` gesetzt ist. **Mitigation**: Step-0-Karten bleiben �ber den Stepper-Header (Schritt-Indikatoren) erreichbar. Nutzer kann zur�ck zu Step 0 navigieren und einen anderen Modus w�hlen.
- **[Risk] Doppelte Zutaten** → Da `UnknownIngredientDialog` (mit Fuzzy-Matches) �bersprungen wird, k�nnten Nutzer "Tomate" erstellen, obwohl "Tomaten" existiert. **Mitigation**: Die Slug-Autogenerierung verhindert echte Duplikate. Doppelte Namen sind akzeptabel (Nutzer kann sp�ter merged werden). Langfristig: Inline-Fuzzy-Check im Autocomplete-Dropdown.
- **[Risk] Abbruch im Wizard** → Wenn der Nutzer den Wizard abbricht, bleibt der `redirectTo`-Param in der URL, aber es gibt keinen R�ckkehr-Mechanismus. **Mitigation**: Der Wizard hat bereits einen "Abbrechen"-Button. Wir k�nnten bei Abbruch zur `redirectTo`-URL ohne `newIngredientSlug` navigieren.
- **[Risk] Refresh verliert `newIngredientSlug`** → Wenn der Nutzer die Seite nach der R�ckkehr refreshed, wird `newIngredientSlug` erneut verarbeitet und der QuantityDialog �ffnet sich wieder. **Mitigation**: `InlineIngredientEditor` entfernt den Param nach der ersten Verarbeitung aus der URL via `replaceState`. Ein erneuter Refresh hat dann keinen Param mehr.
