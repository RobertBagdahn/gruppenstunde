## Context

Die Zutaten-Erstellung in Inspi hat drei fundamentale Probleme:

1. **Tote Sackgasse im Rezept-Editor**: `InlineIngredientEditor.tsx:211` enthält einen expliziten `TODO`-Kommentar — wenn ein User "neu anlegen" klickt, feuert ein Guard und zeigt nur einen Toast-Fehler.
2. **Ungenutztes Backend**: `POST /api/ingredients/ai-create/` ist vollständig implementiert (Gemini, Portionen, Aliase, Nährwerte), hat aber keinen einzigen Frontend-Aufrufer.
3. **UX-Inkonsistenz**: Rezepte haben einen geführten 3-Schritt-Flow mit Modus-Auswahl. Zutaten haben ein monolithisches Formular mit 30+ Feldern ohne Orientierung.

Das Rezept-Erstellungssystem (`CreateRecipePage` + `ContentStepper`) ist das bewährte Pattern, das repliziert werden soll.

## Goals / Non-Goals

**Goals:**
- Neue `CreateIngredientPage` unter `/ingredients/new` mit `ContentStepper`-basiertem 3-Schritt-Flow
- Drei Modi: KI-Erstellung (nutzt vorhandenes `ai-create`), Manuell, Mit Link (neuer URL-Import-Endpoint)
- Sackgasse in `UnknownIngredientDialog` auflösen: "neu anlegen" navigiert zu `/ingredients/new`
- Neuer Backend-Endpoint `POST /api/ingredients/import-from-url/` für URL-basierten Import
- Neuer Frontend-Hook `useAiCreateIngredient()` und `useIngredientImportUrl()`
- Im Stepper nur Stammdaten (Name, Beschreibung, Status, Retail Section) — alle anderen Felder bleiben auf der Detailseite editierbar

**Non-Goals:**
- Keine inline-Erstellung im Rezept-Editor (Modal/Dialog) — Navigation zu `/ingredients/new` ist der gewählte Weg
- Keine Änderungen am `Ingredient`-Model oder Datenbankmigrationen
- Kein vollständiges Formular im Stepper (Nährwerte, Scores etc. sind auf der Detailseite)
- Kein Zurück-Navigations-State vom Rezept-Editor (der User navigiert selbst zurück)

## Decisions

### Entscheidung 1: ContentStepper wiederverwenden statt eigenem Stepper

`ContentStepper` ist eine generische Komponente, die über Props (`renderExtraStep0Cards`, `onRefurbishComplete`, `initialStep` etc.) gesteuert wird. Das Pattern für den URL-Import bei Rezepten (extra Karte in Step 0, Modal, jump to step 1) ist direkt übertragbar.

**Alternative**: Eigener `IngredientStepper` — abgelehnt, weil es Code-Duplizierung ohne Mehrwert wäre. Der `ContentStepper` ist bewusst generisch gehalten.

**Konsequenz**: Die Felder in Step 1 müssen auf das angepasst werden, was für Zutaten relevant ist (Stammdaten-Subset von `ContentFormData` oder ein eigenes `IngredientFormData`-Interface).

### Entscheidung 2: Stammdaten-only im Stepper

Der Stepper zeigt nur: Name, Beschreibung, Status, Retail Section (Warengruppe). Alle 30+ Nährwert-, Score-, Physik- und Pfadfinder-Felder sind auf der Detailseite per "KI-Vorschläge"-Button (bereits implementiert) befüllbar.

**Rationale**: Der Nutzer soll schnell zur Zutat kommen. KI (`ai-create`) füllt bereits alle Felder — der Stepper ist nur die Bestätigungsschicht für das Wesentliche. Wer mehr will, nutzt die Detailseite.

### Entscheidung 3: URL-Import via neuen Backend-Endpoint

Analog zu `recipe/services/url_import_service.py` wird ein `supply/services/ingredient_url_import_service.py` erstellt. Gemini scraped die URL und gibt ein strukturiertes Ergebnis zurück — die KI entscheidet selbst, ob es eine Produktseite (Rewe, Edeka), Open Food Facts oder eine andere Quelle ist.

**Endpoint**: `POST /api/ingredients/import-from-url/`

**Request-Schema** (`IngredientImportUrlIn`):
```python
class IngredientImportUrlIn(Schema):
    url: str
```

**Response-Schema** (`IngredientImportUrlOut`):
```python
class IngredientImportUrlOut(Schema):
    ingredient_draft: IngredientDraftOut  # name, description, status, retail_section_id
    # Optionale Nährwerte (werden direkt an /api/ingredients/ weitergegeben)
    nutrition: IngredientNutritionDraftOut | None = None
```

### Entscheidung 4: UnknownIngredientDialog — Navigation statt Modal

"neu anlegen" navigiert zu `/ingredients/new`. Kein State-Transfer via navigation state (zu fragil). Der User erstellt die Zutat, kommt zurück, tippt den Namen erneut — jetzt findet ihn die Autocomplete.

**Alternative**: Navigation state (wie `RecipeImportPage` → `CreateRecipePage`) — abgelehnt, weil der Rezept-Editor-Kontext nach einem Full-Navigate verloren geht und der Mehraufwand für fragwürdige UX-Verbesserung nicht lohnt.

## Risks / Trade-offs

**[Risiko] ContentStepper-Kopplung** → Der Stepper war für Content-Objekte mit `ContentFormData` gedacht. Zutaten haben ein anderes Datenmodell. Die Entkopplung kann zu einem komplexen Props-Interface führen.
*Mitigation*: `IngredientFormData` als eigenes Interface definieren, Stepper über ein generisches `formData`-Prop oder eigene Render-Props steuern. Wenn die Kopplung zu stark wird, ist ein eigener schlanker `IngredientStepper` die Fallback-Option.

**[Risiko] URL-Import-Qualität** → Gemini scraped unbekannte Produktseiten — die Datenqualität ist variabel. Fehlende oder falsche Nährwerte sind wahrscheinlich.
*Mitigation*: Alle gescrapten Werte sind nur Vorschläge, der User sieht sie in Step 1 und kann korrigieren. Nährwerte werden nur gespeichert, wenn explizit mitgegeben.

**[Trade-off] Kein Inline-Create im Rezept-Editor** → Der User muss die Seite wechseln, um eine neue Zutat anzulegen. Das ist ein Navigation-Bruch.
*Abwägung*: Bewusste Entscheidung. Ein vollständiger Ingredient-Create-Modal wäre zu komplex und redundant zur neuen Page. Der Bruch ist akzeptabel, weil `ai-create` die Zutat in Sekunden anlegt.

## Migration Plan

1. Neuer Backend-Endpoint und Service hinzufügen (kein Breaking Change, kein Deploy-Blocker)
2. Neue Frontend-Hooks hinzufügen
3. `CreateIngredientPage` ersetzen (Route `/ingredients/new` bleibt gleich — kein Breaking Change für Bookmarks)
4. `UnknownIngredientDialog` patchen (Sackgasse entfernen)
5. Kein Rollback-Risiko — nur additive Änderungen und UX-Fixes

## Open Questions

- Sollen URL-importierte Nährwerte direkt beim Erstellen gespeichert werden, oder nur Stammdaten und dann über die Detailseite/KI-Vorschläge nachgezogen werden?
