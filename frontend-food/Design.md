# Design-Entscheidungen — Inspi Food Frontend

Dieses Dokument sammelt konkrete Design-/Layout-Entscheidungen und Bugfixes, die über die
generellen Regeln in [AGENTS.md](./AGENTS.md#design-system--visuelle-richtlinien) hinausgehen.
Es dient als Gedächtnis für Copilot/Agents und Entwickler:innen, damit dieselben Fehler nicht
erneut gemacht werden.

## Backend: `dict`-Body-Parameter in django-ninja (2026-07-11)
- `payload: dict` als Endpoint-Parameter (ohne `= Body(...)`) wird von django-ninja NICHT
  automatisch als JSON-Request-Body erkannt — es wird stattdessen als **Query-Parameter** namens
  `payload` interpretiert. Ein per `fetch(..., { body: JSON.stringify(...) })` gesendeter JSON-Body
  führt dann zu `422 {"detail":[{"type":"missing","loc":["query","payload"],...}]}`.
  Betroffen waren `suggest_ingredient_assignment` und `improve_step_instruction` in
  `backend/recipe/api/steps.py`. **Fix:** `payload: dict = Body(...)` (Import: `from ninja import Body`).
  **Merke:** Jeden neuen `dict`-typisierten Body-Parameter in django-ninja-Endpoints IMMER mit
  `= Body(...)` annotieren, sonst 422 in Produktion.

## Frontend: Mutation-Aufruf im Render-Body statt in `useEffect` (2026-07-11)
- `IngredientSuggestions.tsx` rief `suggestIngredients(...)` (eine React-Query-Mutation, löst einen
  Netzwerk-Request aus) DIREKT im Render-Body auf, nur abgesichert durch `if (isLoadingInitial)`.
  Da der Mutation-Call selbst React-Query-State-Updates auslöst (z.B. `isPending`), re-rendert die
  Komponente währenddessen mehrfach — und weil `isLoadingInitial` bis zur Server-Antwort `true`
  bleibt, feuert JEDER dieser Re-Renders einen NEUEN Request. Ergebnis in Produktion: dutzende
  identische `POST .../suggest-ingredients/`-Requests pro Sekunde (sichtbar in den Server-Logs).
  **Fix:** Der Aufruf wurde in einen `useEffect(() => {...}, [])` verschoben, zusätzlich abgesichert
  mit einem `useRef`-Flag (`hasFetchedRef`) gegen React StrictMode's Doppel-Invoke von Effects in Dev.
  **Merke:** Mutations/Side-Effects NIE direkt im Render-Body auslösen, auch nicht hinter einem
  `if (loading)`-Guard — nur `useEffect` (oder Event-Handler) garantiert "läuft nur einmal pro
  Trigger", nicht "läuft nicht bei jedem Re-Render".

## Fehlendes `favicon.ico` (2026-07-11)
- `index.html` verlinkt nur `/images/favicon.png` — Browser fragen aber unabhängig davon oft
  zusätzlich `/favicon.ico` an der Domain-Wurzel an (Legacy-Konvention), was zu einem `404` im
  Devtools-Log führte (kein funktionaler Bug, aber Rauschen/schlechter erster Eindruck).
  **Fix:** `public/favicon.ico` ergänzt (kopiert von `inspi/static/images/favicon/favicon.ico` als
  Platzhalter — ggf. später durch ein zum Inspi-Food-Branding passendes `.ico` ersetzen).

## Farb-Token — Vorsicht bei `accent`

`--accent` ist in diesem Theme **kein neutraler Grauton**, sondern ein kräftiges Orange
(`--accent: 38 92% 50%`). Klassen wie `bg-accent`, `hover:bg-accent`, `text-accent` dürfen daher
**nicht** als "dezenter Hover/Highlight"-Zustand verwendet werden — das Ergebnis ist ein grell
oranger Block statt eines subtilen Hovers.

**Empfehlung:** Für Hover-/Active-States stattdessen verwenden:
- Hover: `hover:bg-muted`
- Ausgewählt/aktiv: `bg-primary/5 border-l-2 border-l-primary` (oder `bg-primary/10 text-primary`)

## Buttons & Toolbars

- Immer die geteilte `Button`-Komponente (`@/components/ui/button`) mit `variant`
  (`default` / `outline` / `secondary` / `destructive` / `ghost` / `link`) und `size`
  (`sm` / `default` / `lg` / `icon`) verwenden — keine rohen `<button className="bg-... px-...">`
  mit hartcodierten Farben (`gray-300`, `blue-500`, `purple-600`, `rose-500`, `violet-500` etc.).
- Ausnahme: `PortionScaler.tsx` verwendet bewusst durchgehend Amber/Orange als eigenständigen
  "Portionen"-Akzent (`RecipeSidebar`, `PortionBottomSheet`, `InlineIngredientEditor`). Das ist
  Absicht und soll nicht auf neutrale Farben "korrigiert" werden.

## Icons

- Material-Symbols-Ligaturen sind **snake_case** (`format_list_numbered`, `description`,
  `auto_fix_high`), **nicht** kebab-case. `list-ordered` z.B. ist ungültig und wird als kaputter
  Text gerendert statt als Icon.
- Icons in interaktiven Listen/Reihen (z.B. Zutaten-Zeilen) nicht zu klein/blass wählen:
  mindestens 20px, Standard-Opazität (`text-muted-foreground`, nicht `/40` oder `/50`) — sonst
  wirken sie kaputt/übersehen. Farbige Icons (destructive, primary, amber für "optional") behalten
  ihre semantische Farbe.

## Rezept-Detailseite — "Strukturierte Schritte" (Recipe Steps)

- `AnalysisSection` (`RecipeDetailHelpers.tsx`) ist der Standard-Collapsible-Card-Wrapper auf der
  gesamten `RecipeDetailPage.tsx` (Zubereitung, Strukturierte Schritte, Analyse-Tabs, …). Neue
  Sektionen sollen ihn wiederverwenden statt eigene Card-Wrapper zu bauen.
- Step-Editor-Komponentenbaum: `StepEditor` → `StepActionsBar` (Toolbar), `StepCard` →
  `StepInstructionEditor`, `StepZutatenPanel` (+ `IngredientAssignmentDropdown`,
  `IngredientSuggestions`, `PlaceholderInsertMenu`, `ToneSelector`, `LivePreview`). Alle wurden auf
  Design-Tokens vereinheitlicht (siehe Farb-Token-Regel oben).

## Portionen-Skalierung in der Zutatenbearbeitung (`InlineIngredientEditor.tsx`)

- Es gibt genau **einen** Weg, Mengen beim Bearbeiten zu skalieren: den Personenzahl-Regler
  (`PortionScaler`, steuert `editPortions`). Ein früher zusätzlich vorhandener
  Faktor-Multiplikator-Dialog ("Skalieren", z.B. ×1,5) wurde entfernt — er hat `item.quantity`
  direkt multipliziert, **ohne** `editPortions`/`scale` zu aktualisieren, wodurch die
  Pro-Portion-Normalisierung beim Speichern (`toBasePerServing(quantity, scale)`) kaputtging.
  **Merke:** Bevor ein neuer "Skalieren"-Mechanismus hinzugefügt wird, prüfen, ob er mit dem
  bestehenden Personenzahl-Modell (`editPortions`/`scale`) konsistent ist statt es zu umgehen.
- `RecipeSidebar` hat einen eigenen `PortionScaler` (steuert `portionsMultiplier`, für die
  Ansicht/Anzeige). Damit dieser nicht gleichzeitig mit dem Editier-`PortionScaler` sichtbar ist
  (zwei "Portionen -/+"-Regler gleichzeitig = verwirrend), wird er über die Prop
  `hidePortionScaler={isInlineEditMode}` ausgeblendet, solange der Inline-Editor offen ist.

## RecipeSidebar — kompakte Action-Buttons

- Die Sidebar-Action-Buttons (Kochen starten, Drucken, Einkaufsliste, Teilen, Rezept clonen) waren
  als 5 volle Buttons gestapelt und durch die `RecipeMetaCard` + `PortionScaler` darüber oft aus dem
  sichtbaren Bereich der `sticky`-Sidebar herausgeschoben (sah aus wie "verschwunden").
  Lösung: "Kochen starten" und "Einkaufsliste" bleiben volle Buttons, "Drucken"/"Teilen"/"Clonen"
  wurden zu einer kompakten `grid grid-cols-3`-Icon-Reihe zusammengefasst (Label ab `xl:` sichtbar,
  sonst nur Icon + `title`-Tooltip).
- **Kontrast-Falle:** Der "Clonen"-Button hatte zuerst `border-dashed border-primary/30 bg-primary/5`
  — auf der weißen Sidebar (`bg-card`) war das fast unsichtbar ("Button verschwunden"). Fix: kräftigere
  Werte (`border-primary/40 bg-primary/10`, Hover `bg-primary/20`). **Merke:** Bei `primary/5`-
  `primary/10`-Hintergründen auf hellen/weißen Flächen immer im Browser gegenprüfen, ob genug Kontrast
  zum Rand/Hintergrund bleibt — nicht nur im Design gedanklich validieren.

## "Zutaten"-Sektionsheader (`RecipeDetailPage.tsx`) — vereinheitlicht 2026-07-11
- Der Header hatte ein zusätzliches `<select>` ("Für wie viele Personen bearbeiten") NUR um den
  initialen Personenwert für den Inline-Editor vorzuwählen — obwohl es bereits einen Portionen-Regler
  in der Sidebar UND (nach Klick auf "Bearbeiten") den eigenen `PortionScaler` im Editor gibt. Redundant
  → entfernt. `editPortionsChoice`-State bleibt bestehen (synct weiter automatisch mit
  `portionsMultiplier` aus der Sidebar), wird aber nicht mehr über eine eigene Dropdown-UI editierbar
  gemacht — der Editor selbst reicht als Stellschraube.
- "Bearbeiten"-Button war ein roher `<button className="...">` — jetzt die geteilte `Button`-Komponente
  (`variant="outline" size="sm"`) mit `Pencil`-Icon aus `lucide-react`, konsistent mit den übrigen
  Buttons auf der Seite.
- Die "X Zutaten"-Badge neben der Überschrift wirkte schlecht ausgerichtet (`px-2 py-0.5`, kein
  `leading-none`). Fix: `inline-flex items-center px-2.5 py-1 leading-none`, damit Text und Badge
  sauber auf einer Grundlinie sitzen.

## Zutatenliste im Edit-Modus — absteigend nach Gewicht sortiert (2026-07-11)
- Read-only Ansicht (`IngredientList.tsx`) sortiert Zutaten immer absteigend nach `weight_g`. Der
  Inline-Editor (`InlineIngredientEditor.tsx`) tat das bisher NICHT — Zeilen erschienen in
  Insertions-/`sort_order`-Reihenfolge, was beim Wechsel zwischen Ansicht und Bearbeiten wie
  "Platzierungen springen hin und her" wirkte. Fix: eigene Sortierung (Standalone-Items +
  Austauschgruppen-Quellen kombiniert, Alternativen bleiben unter ihrer Quelle) nach Gewicht
  absteigend, live neu berechnet bei jeder Mengenänderung.
- **Wichtige Erkenntnis beim Gewicht-Berechnen:** NICHT `ingredient_portions[].weight_g` per
  `portion_id`-Lookup verwenden, um das Gewicht eines Items zu berechnen — `portion_id` kann auf eine
  Portion verweisen, die GAR NICHT in der eigenen `ingredient_portions`-Liste des Items auftaucht
  (in freier Wildbahn beobachtet), wodurch der Lookup `undefined` liefert und ein Fallback-Default
  (z.B. `?? 1`) benutzt wird — führt zu drastisch falschen (zu kleinen) Gewichten und damit falscher
  Sortierung. **Stattdessen:** Das Backend liefert bereits ein autoritatives `weight_g`-Feld direkt
  auf dem `RecipeItem` (`item.weight_g` für `item.quantity`). Ratio `weight_g / quantity` = Gramm pro
  Einheit — diese Ratio (gespeichert als `baseWeightG`/`baseQuantity` auf `EditableItem`) ist die
  verlässliche Quelle für Gewichtsberechnungen, nicht der Portion-Array-Lookup. Bei Portionswechsel
  (`handlePortionChange`) muss diese Ratio mit aktualisiert werden (auf Basis der neu berechneten
  Gramm-Menge), sonst wird sie nach einem Einheitenwechsel wieder ungültig.

## Zutaten in Rezeptschritten ("Strukturierte Schritte") — Bugfix + Feature (2026-07-11)
- **"Item #123" statt Zutatenname:** `StepZutatenPanel.tsx`s `getIngredientDisplay()` löste den Namen
  NUR über `availableRecipeItems.find(i => i.id === recipe_item_id)` auf — schlägt fehl (zeigt rohe
  "Item #123") wenn die aktuelle Zutatenliste der Rezept-Query noch nicht den referenzierten
  `recipe_item_id` enthält (z.B. kurz nach dem Hinzufügen an anderer Stelle, vor Refetch). Das Backend
  liefert aber bereits `ingredient_name` direkt auf jedem `step_ingredient` (Schema
  `RecipeStepIngredientSchema.ingredient_name`) — das wird jetzt zuerst geprüft, bevor der
  `availableRecipeItems`-Lookup als Fallback greift.
- **Drag & Drop von Zutaten in die Anweisung:** Zutaten-Zeilen in `StepZutatenPanel` sind jetzt
  `draggable` (Griff-Icon `GripVertical`) und übergeben beim Drag ihren `{n}`-Platzhalter (1-basiert,
  passend zu `resolveStepPlaceholders()`s nummerierten Referenzen) als `text/plain`. Das Textarea in
  `StepInstructionEditor.tsx` hat `onDragOver`/`onDrop`, die den Platzhalter über den bereits
  bestehenden `handleInsertPlaceholder()`-Mechanismus einfügen (gleicher Code-Pfad wie beim Klick im
  Platzhalter-Menü). **Bekannte Einschränkung:** Es gibt keine zuverlässige Cross-Browser-API, um die
  exakte Zeichenposition an den Mauskoordinaten in einem `<textarea>` zu ermitteln — der Platzhalter
  wird an der aktuellen Cursor-/Selection-Position eingefügt (wie beim Menü-Klick), nicht exakt an der
  Drop-Position. Für exakte Positionierung wäre ein Wechsel zu einem `contenteditable`-Editor nötig.

## Zutaten-Suche/Autocomplete (`IngredientAutocomplete.tsx`)

- Siehe Farb-Token-Regel: Der Bug mit dem grellen orangen "neu anlegen"-Balken kam von
  `bg-accent`/`hover:bg-accent`.
- Dropdown hat jetzt `max-h-80 overflow-y-auto`, damit er bei vielen Treffern nicht visuell mit
  nachfolgendem Seiteninhalt kollidiert.
- Eingabefeld-Icon (`+`) ist ein farbiger Kreis (`bg-primary/10 text-primary`), nicht ein kleines
  graues Icon — Ghost-Text-Padding (`pl-11`) muss dabei exakt mit dem Input-Padding übereinstimmen.
- **Overflow-Bug**: Die Zeile mit `IngredientAutocomplete` + Detailsuche-Button lag in einem
  `flex` Container, dessen `flex-1`-Kind KEIN `min-w-0` hatte. Flex-Items haben standardmäßig
  `min-width: auto`, wodurch sie NICHT unter ihre Inhalts-Breite schrumpfen — der interne
  `overflow-x-auto`-Scrollcontainer für die Filter-Pills griff dadurch nie, und das ganze Eingabefeld
  wurde über den Seitenrand hinaus breiter gezogen. **Fix:** `min-w-0` auf den `flex-1`-Wrapper
  in `InlineIngredientEditor.tsx` UND auf den `IngredientAutocomplete`-Root-Container gesetzt.
  **Merke:** Bei `flex` + `flex-1`/`flex-grow` IMMER `min-w-0` (bzw. `min-h-0` bei Spalten)
  mitdenken, sobald der Inhalt scrollbare/lange Elemente enthalten kann (Text, Pills, Tabellen).
