## Context

Rezepte können aktuell ohne Zutaten (RecipeItems) in jedem Status existieren: draft, submitted und approved. Das System hat keinen Mechanismus, der ein Minimum an RecipeItems erzwingt — weder auf DB-Ebene (Constraint), noch auf API-Ebene (Pydantic/Validation), noch auf UI-Ebene. Die CreateRecipePage sagt explizit "Zutaten erst nach dem Erstellen hinzufügen" und leitet nach dem Speichern ohne Zutaten auf den Ingredient-Editor weiter.

Der Recipe-Status-Workflow ist:
- **draft** (default beim Anlegen): Persönlich, nicht öffentlich sichtbar
- **submitted**: Zur Freigabe eingereicht (wird gesetzt wenn `visibility=public` und status nicht already `approved`)
- **approved**: Von Staff freigegeben, öffentlich sichtbar
- **rejected**: Von Staff abgelehnt

## Goals / Non-Goals

**Goals:**
- Rezepte OHNE Zutaten dürfen nur im Status `draft` existieren
- Der `update_recipe_visibility`-Endpoint blockiert den Wechsel auf `visibility=public` (der `status` → `submitted` triggert) wenn keine RecipeItems existieren
- Der `update_recipe`-Endpoint blockiert das Löschen aller RecipeItems bei nicht-draft Rezepten
- Das Frontend deaktiviert den "Veröffentlichen"-Button auf der Detailseite wenn keine Zutaten vorhanden sind
- Der Info-Text auf der CreateRecipePage wird aktualisiert, um den neuen Flow zu reflektieren
- Tests für alle neuen Validierungen

**Non-Goals:**
- Kein DB-Constraint (CheckConstraint auf RecipeItem-Count) — Validierung lebt im API-Layer
- Keine Änderung am Pydantic-Schema `RecipeCreateIn` / `RecipeUpdateIn` — `recipe_items` bleibt optional im Schema
- Keine Änderung am Recipe-Model oder RecipeItem-Model
- Kein separater "Submit for Review"-Endpoint neben der Visibility-Änderung
- Keine Änderung am Fork-Flow (forked recipes starten immer als `draft`)
- Keine Änderung am AI-Create-Flow (AI erzeugt immer Zutaten)
- Keine Änderung am URL-Import-Flow (Import erzeugt immer Zutaten)
- Keine Admin-Umgehungsmöglichkeit (Staff darf weiterhin direkt approved setzen via Django Admin)

## Decisions

### 1. Validation Layer: API statt Pydantic/Frontend

**Entscheidung:** Validation passiert im API-Layer (Django Ninja Handler), nicht im Pydantic-Schema und nicht im Frontend.

**Begründung:**
- Die Pydantic-Schemas sind shared mit dem Frontend Zod — eine Schema-Änderung (`min_length=1`) würde bedeuten, dass das Frontend IMMER eine Zutat mitschicken muss, auch beim Anlegen als Draft. Das widerspricht dem status-gated Approach.
- API-Layer-Validation gibt uns vollen Zugriff auf die DB (`recipe.recipe_items.exists()`) und auf den aktuellen Status der Recipe.
- Frontend-Validation ist zusätzlich nice-to-have (UX), aber nicht hinreichend.

**Alternativen:**
- *Pydantic-Validator auf RecipeUpdateIn* → müsste die Recipe-ID kennen, geht nicht ohne custom validator mit DB-Zugriff
- *Frontend-only* → API kann immer noch direkt aufgerufen werden (keine Sicherheit)

### 2. Status-Gate: Nur `update_recipe_visibility` triggert den Check

**Entscheidung:** Der einzige Weg, ein Rezept von `draft` in `submitted` zu bekommen, ist der `update_recipe_visibility`-Endpoint mit `visibility=public`. Hier wird die Ingredient-Präsenz geprüft.

**Begründung:** Es gibt keinen separaten "submit to review"-Endpoint. Der natürliche Trigger ist die Visibility-Änderung auf "public", die automatisch `status="submitted"` setzt.

**Validierungspunkte:**
```python
# recipe/api/recipes.py ~ line 730
if payload.visibility == "public" and recipe.status != "approved":
    if not recipe.recipe_items.exists():
        raise HttpError(400, "Rezept benötigt mindestens eine Zutat zum Veröffentlichen")
    recipe.status = "submitted"
```

### 3. Schutz gegen Ingredient-Removal bei nicht-draft Rezepten

**Entscheidung:** Im `update_recipe`-Endpoint prüfen wir, ob `recipe_items_data` explizit als leere Liste gesendet wurde und das Rezept nicht im `draft`-Status ist.

**Begründung:** Ein submitted/approved recipe darf nicht aller Zutaten beraubt werden. Eine leere `recipe_items`-Liste im Update bedeutet "alle bestehenden Items löschen" — das muss blockiert werden wenn der Status > draft ist.

```python
# recipe/api/recipes.py ~ line 466
if recipe_items_data is not None:
    if not recipe_items_data and recipe.status != "draft":
        raise HttpError(400, "Bei veröffentlichten Rezepten können nicht alle Zutaten entfernt werden")
    recipe.recipe_items.all().delete()
    ...
```

**Wichtig:** `recipe_items_data = None` bedeutet "keine Änderung" (exclude_unset=True). Nur explizit gesendetes `recipe_items: []` triggert die Löschung.

### 4. Frontend: UX-Nudges statt Hard Block

**Entscheidung:** Das Frontend zeigt auf der RecipeDetailPage den "Veröffentlichen"-Button deaktiviert wenn das Rezept keine Zutaten hat, mit Tooltip "Erst Zutaten hinzufügen". Der Button im Admin-Bereich (Staff) bleibt aktiv (Staff darf direkt approved setzen).

**Begründung:** Staff braucht die Möglichkeit, auch ingredient-lose Rezepte zu bearbeiten (z.B. um sie zu löschen). Die Validierung im API-Layer schützt trotzdem — falls ein Staff-User den Status ändert ohne Zutaten, schlägt der API-Call fehl.

### 5. CreateRecipePage Info-Box

**Entscheidung:** Der bisherige Text "Zutaten erst nach dem Erstellen hinzufügen" wird ersetzt durch: "Zutaten können später im Zutaten-Editor hinzugefügt werden. Zum Veröffentlichen wird mindestens eine Zutat benötigt."

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Bestehende Recipes ohne Zutaten** — Es könnte bereits submitted/approved Recipes ohne Ingredients geben (keine Produktionsdaten, aber lokale Dev-Daten) | Keine Migration nötig — Validierung greift nur bei neuen Status-Änderungen. Alte Daten bleiben konsistent, können aber nicht mehr veröffentlicht/geupdated werden. |
| **Staff kann approved setzen ohne Zutaten** — Der `update_recipe`-Endpoint prüft nur bei `recipe_items_data`, nicht bei `status`-Änderungen | Staff kann direkt über Django Admin approved setzen, aber das ist Absicht. Die API-Endpunkte für normale User sind geschützt. |
| **Quality Score Widerspruch** — Der Quality Score gibt 0 Punkte für Ingredients, wenn keine Items existieren. Das ist jetzt konsistent: Drafts haben low quality, submitted/approved müssen Ingredients haben | Keine Änderung nötig — der Score reflektiert bereits korrekt, dass das Rezept unvollständig ist. |
| **Forked Recipe ohne Zutaten** — Wenn das Original keine Zutaten hat, hat der Fork auch keine. Bleibt draft — OK. | Kein Problem. Der Fork kann Zutaten bekommen (über InlineIngredientEditor) und dann veröffentlicht werden. |

## Open Questions

- Soll der `update_recipe`-Endpoint auch bei `status`-Änderungen prüfen (z.B. ein Staff-User, der per API direkt `status="approved"` setzt)? Aktuell nicht im Scope — Staff kann direkt approved setzen.
- Soll der `recipe-items`-Delete-Endpunkt (`DELETE /{recipe_id}/recipe-items/{item_id}/`) blockieren, wenn das letzte Item gelöscht würde und das Rezept nicht draft ist? — Current scope: nicht explizit behandelt, sollte aber analog zur update_recipe-Logik sein.
