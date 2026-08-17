## Context

Die Rezept-Detailseite (`RecipeDetailPage`) im `frontend-food` erlaubt das Bearbeiten von Zutaten via `InlineIngredientEditor`. Dieser enthält eine `IngredientAutocomplete`-Komponente mit max. 8 Ergebnissen ohne Filterung oder Sortierung. Im Mahlzeiten-Planer (`MealSlot`) existiert bereits ein vollständiger `RecipeSearchDialog` mit Filter-Pills und Detailsuche als Referenzimplementierung.

Aktuelle Einschränkungen:
- Kein Backend-Support für Sortierung oder Nutritional-Tag-Filter auf `GET /api/ingredients/`
- `quality_score` fehlt im Frontend-Zod-Schema (wird stumm verworfen, obwohl Backend es sendet)
- `IngredientQuantityDialog` ist kein eigenständiges Modul — es ist privat in `RecipeSearchDialog.tsx` eingebettet
- Kein Mengenauswahl-Schritt beim Hinzufügen im `InlineIngredientEditor` (Zutat landet mit `quantity: 0`)

## Goals / Non-Goals

**Goals:**
- Neuer `IngredientDetailSearchDialog` mit Volltext-Suche, Filtern und Sortierung
- Mittlere Detailtiefe pro Ergebnis: Name, Abteilung, Preis/kg, Nutriscore-Badge, kcal, Protein
- Neuer Mengenauswahl-Schritt nach Auswahl (Menge + Einheit) vor Übernahme in die Liste
- Backend: `ordering` und `nutritional_tag` Parameter für `GET /api/ingredients/`
- Zod-Schema-Fix: `quality_score` zu `IngredientListItemSchema` hinzufügen

**Non-Goals:**
- Kein Umbau des bestehenden `IngredientAutocomplete` (bleibt als Schnelleinstieg)
- Keine Änderungen am MealSlot/RecipeSearchDialog-Flow
- Keine Volltext-Fuzzy-Suche im neuen Endpoint (bleibt `icontains`, Fuzzy-Suche ist separater `/suggest/`-Endpoint)
- Keine Vitamin-/Mineralstoff-Anzeige im Dialog

## Decisions

### 1. Neuer Endpoint-Parameter vs. separater Endpoint

**Entscheidung**: Bestehenden `GET /api/ingredients/` Endpoint erweitern.

Der Endpoint gibt bereits `energy_kcal`, `protein_g`, `nutri_class`, `price_per_kg` zurück — alle Felder die der Dialog braucht. Ein separater Endpoint wäre Overengineering.

Alternativen: Separater `/search/`-Endpoint (verworfen — doppelte Logik, kein Mehrwert).

### 2. `IngredientQuantityDialog` als eigenständige Komponente

**Entscheidung**: Aus `RecipeSearchDialog.tsx` extrahieren nach `components/recipe/IngredientQuantityDialog.tsx`.

Grund: Wird jetzt an zwei Stellen gebraucht (`RecipeSearchDialog` und neuer `IngredientDetailSearchDialog`). Die aktuelle Einbettung als private Funktion in `RecipeSearchDialog.tsx` verhindert Wiederverwendung.

Alternativen: Kopieren (verworfen — duplizierter Code).

### 3. Was `onSelect` im neuen Dialog zurückgibt

**Entscheidung**: Dialog gibt `(ingredientSlug: string, portionId: number, measuringUnitId: number | null, quantity: number)` zurück.

Grund: `InlineIngredientEditor.handleAddIngredient` braucht den Slug, um die Portionen zu laden und die neue Zeile zu initialisieren. Der `IngredientQuantityDialog` übernimmt die Menge+Einheit-Auswahl *innerhalb* des Dialogs — nach Bestätigung wird direkt die Zeile mit befüllter Menge angelegt.

Wichtige Erkenntnis aus der Analyse: Im aktuellen `InlineIngredientEditor`-Flow startet die Zutat mit `quantity: 0` und leerem Input — der Nutzer muss manuell ausfüllen. Der neue Dialog-Flow fügt die Zutat erst nach Mengenauswahl hinzu, was einen konsistenteren Zustand ergibt.

### 4. Sortieroptionen und Backend-Implementierung

**Entscheidung**: `ordering` Parameter mit Werten `relevance` (default), `price_asc`, `price_desc`, `nutri_class_asc`, `energy_kcal_asc`.

Backend-Umsetzung via `qs.order_by()`:
- `price_asc` → `order_by('price_per_kg')` (NULLs ans Ende via `nulls_last=True`)
- `nutri_class_asc` → `order_by('nutri_class')` (A=1 zuerst)
- `energy_kcal_asc` → `order_by('energy_kcal')`
- `relevance` → Default-Model-Ordering (kein explizites `order_by`)

### 5. Nutritional-Tag-Filter — Inklusion vs. Exklusion

**Entscheidung**: Inklusions-Filter: `nutritional_tag` Parameter filtert Zutaten die den Tag *haben* (z.B. `?nutritional_tag=5` zeigt nur vegane Zutaten).

Gegenüber dem MealSlot (der Tags *ausschließt*) ist die Richtung hier umgekehrt — der Nutzer sucht bewusst nach z.B. veganen Zutaten für sein Rezept.

Backend: `qs.filter(nutritional_tags__id=nutritional_tag)` (ManyToMany-Filter).

### 6. Nutriscore-Badge-Darstellung

**Entscheidung**: Farbiger Badge (`A`=grün, `B`=hellgrün, `C`=gelb, `D`=orange, `E`=rot) analog zu bestehenden Nutriscore-Badges in der Codebase (`nutri_class` int 1–5 → A–E).

## Risks / Trade-offs

**[Risk] Sortierung mit NULL-Werten** → Viele Zutaten haben kein `price_per_kg` oder `nutri_class`. Bei `price_asc` landen diese am Ende via `nulls_last=True`, was korrekt ist, aber dem Nutzer unklar sein könnte.
Mitigation: "Kein Preis" als graues Label im Ergebniscard anzeigen.

**[Risk] Performance bei großem Zutaten-Bestand mit ORDER BY** → `ORDER BY price_per_kg NULLS LAST` ohne Index ist ein Full-Table-Scan. Bei moderatem Datenbestand unkritisch.
Mitigation: Ggf. Index auf `price_per_kg`, `nutri_class` nach Bedarf — kein Blocker für jetzt.

**[Risk] Portionen-Fetch bleibt Raw-Fetch** → `handleAddIngredient` in `InlineIngredientEditor` lädt Portionen noch via rohem `fetch()` ohne TanStack Query. Das ist bekannte technische Schuld.
Mitigation: Nicht Teil dieses Changes — separates Refactoring wenn nötig.

**[Trade-off] Dialog zeigt `IngredientListOut`-Daten, nicht `IngredientDetailOut`** → Der Dialog benutzt den List-Endpoint ohne Vitamindaten, Lagerdaten etc. Das ist bewusst (Mittel-Detailtiefe). Für eine Vollansicht kann der Nutzer zur Zutat-Detailseite navigieren.
