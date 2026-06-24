## Context

Die Rezept-Detailseite zeigt Zutaten read-only an. Bearbeitung erfordert Navigation zu `/recipes/:slug/edit`. Es existiert bereits:
- Ein Inline-Modifikationssystem ("Magic Buttons" via Zustand Store) für User-seitige Anpassungen
- `RecipeAiIngredientsService` für AI-basierte Zutaten-Vorschläge (Gemini structured output)
- PATCH-Endpoint für einzelne RecipeItems mit `can_edit`-Prüfung
- Ingredient-Suggest-Endpoint (`/api/ingredients/suggest/?q=...`)

## Goals / Non-Goals

**Goals:**
- Admin/Staff/Owner können Basis-Portionen und Zutaten direkt auf der Detailseite bearbeiten
- AI-Zauberstab schätzt Mengen für bestehende Zutaten (pro Person + total)
- Neue Zutaten können gesucht und hinzugefügt werden (inkl. Neuanlage)
- Änderungen werden per PATCH pro Item gespeichert

**Non-Goals:**
- Titel, Beschreibung, Schritte inline editieren (nur Zutaten + Portionen)
- Bulk-Endpoint für Massenänderungen (einzelne PATCHes reichen)
- Ersetzen des bestehenden Modifikationssystems (koexistiert)

## Decisions

### 1. Edit-Mode als Toggle-State auf der Detailseite
- Einfacher Boolean `isEditMode` in Component-State
- Kein separater Zustand-Store nötig (lokaler State reicht)
- Bei Abbrechen: State verwerfen, kein PATCH

### 2. AI-Mengen-Schätzung: Neuer dedizierter Endpoint
- `POST /api/recipes/{id}/estimate-quantities/`
- Nutzt bestehenden Gemini-Client, aber mit angepasstem Prompt der die **existierenden** Zutaten des Rezepts nimmt (nicht neue vorschlägt)
- Response enthält pro Item: `item_id`, `quantity_per_person`, `quantity_total`, `unit`
- Frontend zeigt Vorschau-Dialog → User bestätigt → Werte werden in lokalen Edit-State übernommen (noch nicht gespeichert)

### 3. Speichern: Parallele PATCHes
- Beim Klick auf "Speichern" werden nur geänderte Items per PATCH aktualisiert
- `Promise.all()` für parallele Requests
- Bei Fehler: Toast mit Fehlermeldung, erfolgreiche Items bleiben gespeichert
- Servings-Update: separater PATCH auf Recipe selbst (`/api/recipes/{id}/`)

### 4. Zutat hinzufügen
- Autocomplete mit bestehendem `/suggest/`-Endpoint
- "Neu erstellen"-Option am Ende der Suchergebnisse → POST neues Ingredient mit `status=draft`
- Neues RecipeItem via POST `/api/recipes/{id}/recipe-items/`

### 5. Frontend-Komponenten-Struktur
```
RecipeDetailPage
  └─ InlineEditToolbar        (Bearbeiten/Speichern/Abbrechen)
  └─ PortionEditor            (Basis-Portionen Input)
  └─ IngredientEditList       (Liste editierbarer Zeilen)
       └─ IngredientEditRow   (Menge, Einheit, Name, Notiz, Löschen)
  └─ IngredientSearchAdd      (Autocomplete + Neu erstellen)
  └─ AiEstimatePreview        (Dialog mit Vorschau der AI-Schätzung)
```

## Risks / Trade-offs

- **Parallele PATCHes**: Bei vielen Zutaten (>20) könnten viele gleichzeitige Requests entstehen. Akzeptabel für Admin-Nutzung.
- **AI-Schätzung Qualität**: Gemini kann unrealistische Werte liefern. Mitigation: User reviewt immer vor Übernahme.
- **Race Conditions**: Wenn ein anderer User gleichzeitig bearbeitet. Akzeptabel da Admin-Tool, kein kollaboratives Editing nötig.
