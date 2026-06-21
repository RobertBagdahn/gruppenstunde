## Context

Der `InlineIngredientEditor` ist die zentrale Eingabe-Komponente für Rezept-Zutaten auf der Detailseite (`RecipeDetailPage`). Die `CreateRecipePage` bietet einen ähnlichen Add-Flow im Stepper. Beide nutzen das `IngredientAutocomplete` für die Zutatensuche und `selectSmartDefaultPortion` für die Default-Portionsauswahl (Spec: `smart-ingredient-default`).

Aktueller Zustand (Stand Juni 2026):
- `InlineIngredientEditor.handleAddIngredient` (`frontend-food/src/components/recipe/InlineIngredientEditor.tsx:178`) fügt ein neues `EditableItem` ein, ohne zu prüfen, ob die Zutat bereits in `editItems` existiert — auch nicht, wenn sie als `isDeleted: true` markiert ist.
- Das Hinzufügen-Feld (Zeile 517–531) ist nur ein nacktes `IngredientAutocomplete`-Input ohne visuelle Behausung; User erkennen es nicht als Eingabe-Element.
- `handleApplyEstimate` (Zeile 278–295) setzt `quantity: estimate.quantity_per_portion` direkt als Display-Wert, ignoriert aber den aktuellen `servings`-Skalierungsfaktor. Da `handleSave` am Ende durch `effectiveServings` teilt, entsteht eine falsche Per-1-Portion-Menge.
- `handleApplyAiSuggestions` (Zeile 323) ruft den Backend-Apply-Endpunkt ohne CSRF-Token und ohne client-seitigen Duplikat-Check gegen den Editor-State auf.
- Backend `ai_apply_ingredients` (`backend/recipe/api/items.py:124`) erzeugt `RecipeItem`s ohne Prüfung, ob für dieselbe `ingredient_id` (via `portion.ingredient_id`) bereits ein Item existiert.
- `RecipeQuantityEstimationService._build_response` (`backend/recipe/services/ai_ingredients_service.py:381`) verwendet die Default-Portion statt der im Rezept gespeicherten Portion für die Mengen-Angabe. Schätzt der User eine Zutat, die gerade in "Esslöffel" angezeigt wird, bekommt er die Antwort in "Gramm" Default-Portion — Frontend kann das nicht korrekt zuordnen.

## Goals / Non-Goals

**Goals:**
- Das Hinzufügen-Feld ist eindeutig als Input-Element erkennbar (Card-Container, Plus-Icon, Label)
- Dieselbe Zutat kann nicht mehrfach in ein Rezept eingefügt werden — weder manuell noch via AI
- Gelöschte Zutaten werden beim erneuten Hinzufügen wiederhergestellt (statt neu angelegt)
- AI-Mengenschätzung funktioniert korrekt unter jedem Display-Servings-Wert
- Backend-Apply-Endpunkt ist idempotent gegen Duplikate
- AI-Mengenschätzung antwortet in der Portion, in der das Item gerade gespeichert ist

**Non-Goals:**
- Keine Änderung an `selectSmartDefaultPortion` (Spec `smart-ingredient-default` bleibt unverändert — Default `quantity=1` für sinnvolle Portionen, `100` für Gramm-Fallback ist korrekt)
- Keine Änderung an `IngredientAutocomplete` selbst (nur Verwendung als Kind im Card-Container)
- Keine Änderung an den `servings`-Speicher-Regeln (Per-1-Portion in DB, Display × N) — Spec `recipe-portion-scaling-edit` bleibt gültig
- Kein Refactor des gesamten Editor-State-Managements (nur gezielte Bugfixes)
- Kein Undo-Stack für gelöschte Items (Wiederherstellen nur via erneutes Hinzufügen)

## Decisions

### 1. Card-Container-Pattern für Hinzufügen-Feld

**Entscheidung**: Das `IngredientAutocomplete` wird in einen sichtbaren Card-Container mit Plus-Icon und Label "Zutat hinzufügen" eingebettet — passend zum `food-design-system`-Pattern (Card mit `border-border`, `bg-card`, `rounded-xl`).

**Begründung**: Ein nacktes Input-Feld am Seitenende wird von Usern nicht als Handlungsmöglichkeit wahrgenommen. Die Card macht die Aktion sichtbar und konsistent mit anderen Card-basierten Elementen der Seite.

### 2. Duplikat-Handling: Restore statt Block

**Entscheidung**: Beim Versuch, eine Zutat hinzuzufügen, die bereits in `editItems` existiert (egal ob `isDeleted` oder aktiv), SHALL kein neues Item angelegt werden. Stattdessen:
- Wenn das bestehende Item `isDeleted: true` hat → auf `isDeleted: false` setzen, `isDirty: true` markieren, Toast "Zutat bereits vorhanden – wiederhergestellt"
- Wenn das bestehende Item aktiv ist → nur Toast "Zutat bereits vorhanden", kein Item-Feld ändern

Match-Schlüssel: `ingredient_id` (nicht `name`, da der via Autocomplete kommt).

**Begründung**: Restore ist UX-mäßig besser als Block, weil User oft aus Versehen löschen. Bei Activity-Duplikat ist Block klar — zwei gleiche Zutaten in einem Rezept sind nicht sinnvoll.

### 3. AI-Mengenschätzung: Mit Display-Servings multiplizieren

**Entscheidung**: In `handleApplyEstimate` wird die eingesetzte Display-`quantity` berechnet als `estimate.quantity_per_portion * effectiveServings`, wobei `effectiveServings = servings ?? 1`. Der bestehende `handleSave` teilt dann durch `effectiveServings`, womit die gespeicherte Per-1-Portion-Menge = `estimate.quantity_per_portion` ist (korrekt).

**Begründung**: Die AI liefert Gramm pro Person. Die DB speichert pro Person. Der Editor zeigt × N. Also muss die eingesetzte Display-Menge = `pro Person × N` sein, damit nach `÷ N` beim Save wieder `pro Person` herauskommt.

### 4. AI-Quantity-Estimation: portion_id in Response

**Entscheidung**: `EstimateQuantityItemOut` wird um `portion_id: int` erweitert. Das Backend liefert die Portion, auf der die Schätzung basiert (die aktuell gespeicherte Portion des Items). Das Frontend `handleApplyEstimate` setzt zusätzlich `portion_id` und konvertiert `quantity` via `handlePortionChange`-Logik.

**Begründung**: Aktuell schätzt das Backend in der Default-Portion des Ingredients, nicht in der gespeicherten. Entweder wir ändern das Backend, sodass es in der gespeicherten Portion schätzt, ODER wir liefern die `portion_id` zurück und das Frontend konvertiert. Zweiteres ist sicherer, weil die AI "Gramm pro Person" denkt — und die Portion des Items die Zielportion ist.

Implementierung: Backend nutzt `item.portion` (aktuell gespeicherte) als `target_portion` statt `default_portion`. Response enthält `portion_id = item.portion_id`. Frontend setzt beides.

### 5. Backend `ai_apply_ingredients`: Dedup gegen `portion.ingredient_id`

**Entscheidung**: In `ai_apply_ingredients` werden vor dem Erstellen alle `item_in.portion_id`s gefiltert, deren zugehörige `Portion.ingredient_id` bereits in einem existierenden `RecipeItem` des Rezepts vorkommt.

**Begründung**: Race-Condition-Schutz. Wenn das Frontend zweimal applyt oder zwischen Suggest und Apply manuell eine Zutat hinzugefügt wurde, sollen keine Duplikate entstehen. Die bestehende `get_full_suggestions`-Filterung reicht nicht, weil sie nur zum Suggest-Zeitpunkt filtert.

### 6. Client-seitiges Filtern der AI-Vorschläge gegen Editor-State

**Entscheidung**: In `handleAiSuggest` werden nach Backend-Response die Vorschläge herausgefiltert, deren `ingredient_id` bereits in `editItems` (aktiv oder `isDeleted`) vorkommt. Übrig bleibt nur wirklich Neues.

**Begründung**: Die Backend-Filterung in `get_full_suggestions` kennt nur die gespeicherten Items, nicht die Editor-Änderungen (z.B. gerade gelöschte Zutaten sollen nicht erneut vorgeschlagen werden, gerade hinzugefügte auch nicht).

### 7. CSRF-Token bei Fetch-Calls

**Entscheidung**: `handleAiSuggest` und `handleApplyAiSuggestions` verwenden `getCsrfToken()` aus `@/lib/api` und senden `X-CSRFToken`-Header, passend zu `handleAddIngredient` (Zeile 188), der das bereits macht.

**Begründung**: Django mit Session-Auth benötigt CSRF bei POST. Aktuell sind die Calls funktionieren — vermutlich weil der Endpoint `@csrf_exempt` oder ähnlich ist — aber für Konsistenz und Sicherheit soll CSRF überall mitgesendet werden.

## Risks / Trade-offs

- **Restore statt Block**: Wenn ein User bewusst zwei Portionen derselben Zutat anlegen will (z.B. "100g Zucker für Teig" + "50g Zucker für Deko"), ist das nicht mehr möglich. Trade-off: aktuell ist das auch nicht möglich (ohne Workaround), und der Default-Use-Case ist Duplikat-Vermeidung. Akzeptabel.
- **AI-Mengenschätzung mit Display-Servings**: Wenn User die Portionen im Editor ändert (skaliert auf 4), dann AI-Schätzung macht, wird die Display-Menge = Schätzung × 4. Bei Save → ÷ 4 → Schätzung gespeichert. Korrekt, aber optisch irritierend (große Zahlen). Hinweis-Toast beim Apply ist erwägenswert, aber nicht spezifiziert.
- **Backend-Dedup-Filter**: Wenn das Frontend ein Item sendet, das vom Backend gefiltert wird, bekommt der User weniger Items als ausgewählt. Das Frontend muss darauf reagieren (Toast "X von Y hinzugefügt – Duplikate übersprungen"). Im Apply-Response des Backends steht die Anzahl erstellter Items — Frontend kann das vergleichen.
- **portion_id in EstimateQuantityItemOut**: BREAKING für Frontend, die alte Response nutzen. Da keine Rückwärtskompatibilität nötig (Projekt-Regel), ok. Frontend muss synchron angepasst werden.
- **Keine Migration nötig**: Alle Änderungen sind Logik/UX, keine Model-Feld-Änderungen.
