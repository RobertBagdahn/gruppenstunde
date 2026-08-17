# ingredient-merge-ui Specification

## Purpose
Definiert den Staff-only Zutaten-Merge-Flow: Von der IngredientEditPage und dem DuplicateDetectionList-Admin-Dashboard aus können zwei Zutaten zusammengeführt werden — mit Suche, Preview und Sicherheitswarnung.

## ADDED Requirements

### Requirement: Ingredient Soft-Delete
Das Ingredient-Model SHALL Soft-Delete unterstützen und weiche statt harte Löschung verwenden.

#### Scenario: Ingredient erbt SoftDeleteModel
- **GIVEN** das Ingredient-Model existiert
- **WHEN** die Migration angewendet wird
- **THEN** SHALL `Ingredient` von `SoftDeleteModel` erben
- **THEN** ein `deleted_at`-Feld (DateTimeField, nullable, db_index=True) SHALL existieren

#### Scenario: DELETE-Endpoint nutzt Soft-Delete
- **WHEN** ein Staff-User `DELETE /api/ingredients/{slug}/` aufruft
- **THEN** SHALL `ingredient.soft_delete()` aufgerufen werden statt `ingredient.delete()`
- **THEN** der Eintrag SHALL in der DB bleiben mit `deleted_at` gesetzt

#### Scenario: Soft-gelöschte Zutat ist unsichtbar
- **WHEN** ein User die URL einer soft-gelöschten Zutat aufruft
- **THEN** SHALL der Endpoint 404 zurückgeben
- **THEN** die Zutat SHALL in keiner Liste oder Suche erscheinen

### Requirement: Merge-Bugfix
Der Merge SHALL nie `RecipeItem.portion_id=NULL` setzen.

#### Scenario: Portion-Re-Parenting
- **WHEN** zwei Zutaten gemerged werden
- **THEN** SHALL `Portion.ingredient_id` auf die Target-Ingredient-ID aktualisiert werden
- **THEN** keine Portion SHALL gelöscht werden
- **THEN** `RecipeItem.portion_id` SHALL unverändert bleiben (da die Portion-Zeile erhalten bleibt)

#### Scenario: Test reproduziert den Bug
- **GIVEN** ein Test mit zwei Ingredients und einem RecipeItem
- **WHEN** der Merge-Endpoint OHNE Fix aufgerufen wird
- **THEN** SHALL der Test einen IntegrityError zeigen (portion_id=NULL bei non-nullable FK)

### Requirement: Merge-Endpoint-Fix
Der `POST /api/admin/data-quality/ingredients/merge/` Endpoint SHALL korrekt mergen mit Audit-Trail.

#### Scenario: Merge mit @transaction.atomic
- **WHEN** ein Merge ausgeführt wird
- **THEN** SHALL alle Änderungen in einer `@transaction.atomic`-Transaktion laufen
- **THEN** bei einem Fehler SHALL alles zurückgerollt werden

#### Scenario: Alias-Übernahme
- **WHEN** Source "Tomate" in Target "Tomaten" gemerged wird
- **THEN** SHALL `IngredientAlias(name="Tomate", ingredient=target)` angelegt werden
- **THEN** alle Source-Aliase SHALL ebenfalls als Target-Aliase angelegt werden (get_or_create)
- **THEN** bereits existierende Aliase SHALL stillschweigend übersprungen werden

#### Scenario: Portion-Re-Parenting
- **WHEN** Source hat Portionen "1 Stück", "100g"
- **THEN** SHALL jede Portion `portion.ingredient_id = target.id` erhalten

#### Scenario: MealItem-Remapping
- **WHEN** MealItem-Einträge direkt auf die Source-Zutat referenzieren
- **THEN** SHALL `MealItem.objects.filter(ingredient=source).update(ingredient=target)` ausgeführt werden

#### Scenario: UnitConversion-Handling
- **WHEN** die Source-Zutat UnitConversion-Einträge hat
- **THEN** SHALL `UnitConversion.objects.filter(ingredient=source).delete()` ausgeführt werden
- **THEN** Target-UnitConversions SHALL unverändert bleiben

#### Scenario: Embedding-Neuberechnung
- **WHEN** der Merge abgeschlossen ist
- **THEN** SHALL `update_ingredient_embedding(target, force=True)` synchron aufgerufen werden
- **THEN** die Merge-Response SHALL erst nach erfolgreicher Embedding-Aktualisierung zurückkommen

#### Scenario: Soft-Delete der Source
- **WHEN** der Merge abgeschlossen ist
- **THEN** SHALL `source.soft_delete()` aufgerufen werden
- **THEN** `ContentLink(link_type=DUPLICATE_MERGED, source=source, target=target)` SHALL erstellt werden

#### Scenario: Idempotenz
- **WHEN** dasselbe Source-Target-Paar erneut gemerged werden soll
- **THEN** SHALL der Endpoint 400 mit "Dieses Zutaten-Paar wurde bereits zusammengeführt" zurückgeben

#### Scenario: Merge auf sich selbst
- **WHEN** source_id == target_id
- **THEN** SHALL der Endpoint 400 mit "Quell- und Ziel-Zutat dürfen nicht identisch sein" zurückgeben

### Requirement: Strenge Staff-Berechtigung
Der Merge SHALL nur von Staff-Usern ausgeführt werden dürfen.

#### Scenario: Non-Staff bekommt 403
- **WHEN** ein nicht-Staff-User den Merge-Endpoint aufruft
- **THEN** SHALL 403 Forbidden zurückgegeben werden

#### Scenario: Merge-Button nur für Staff sichtbar
- **WHEN** ein nicht-Staff-User die IngredientEditPage aufruft
- **THEN** SHALL der Merge-Button NICHT gerendert werden

### Requirement: Zutaten-Suche im Merge-Dialog
Der Merge-Dialog SHALL die Suche nach der zweiten Zutat ermöglichen.

#### Scenario: Embedding-basierte Vorschläge
- **WHEN** der Merge-Dialog mit einer aktuellen Zutat geöffnet wird
- **THEN** SHALL `GET /api/ingredients/{slug}/similar/` aufgerufen werden
- **THEN** bis zu 6 ähnliche Zutaten (≥70% Similarity) SHALL als Vorschläge angezeigt werden

#### Scenario: Freitext-Suche als Fallback
- **WHEN** der Nutzer einen Suchbegriff eingibt
- **THEN** SHALL `GET /api/ingredients/suggest/?name=<query>` aufgerufen werden
- **THEN** die Ergebnisse SHALL unterhalb des Suchfelds als Liste angezeigt werden

### Requirement: Quelle-Ziel-Auswahl
Der Nutzer SHALL explizit wählen können, welche Zutat Quelle und welche Ziel ist.

#### Scenario: Standard-Richtung
- **WHEN** der Dialog von der IngredientEditPage geöffnet wird
- **THEN** SHALL die aktuelle Zutat als Target vorgewählt sein
- **THEN** die gesuchte/gewählte Zutat SHALL als Source verwendet werden

#### Scenario: Richtung umkehren
- **WHEN** der Nutzer die Richtung umkehrt (Swap-Button)
- **THEN** SHALL Source und Target getauscht werden
- **THEN** die UI SHALL die neue Zuordnung klar anzeigen

### Requirement: Vereinfachte Preview
Vor dem Merge SHALL eine Preview mit der Anzahl betroffener Rezepte angezeigt werden.

#### Scenario: Preview zeigt Rezeptanzahl
- **WHEN** der Merge-Dialog eine zweite Zutat gewählt hat
- **THEN** SHALL die Anzahl `RecipeItem.objects.filter(portion__ingredient=source).count()` angezeigt werden
- **THEN** das Format SHALL "Betrifft 12 Rezepte" sein

#### Scenario: Keine betroffenen Rezepte
- **WHEN** die Source-Zutat in keinen Rezepten verwendet wird
- **THEN** SHALL "Betrifft 0 Rezepte" angezeigt werden
- **THEN** der Merge SHALL trotzdem möglich sein

### Requirement: Sicherheitswarnung bei hoher Nutzung
Bei stark genutzten Zutaten SHALL eine zusätzliche Sicherheitswarnung erscheinen.

#### Scenario: Warnung bei usage_count > 20
- **WHEN** `source.usage_count > 20`
- **THEN** SHALL ein Warnungstext angezeigt werden: "Diese Zutat wird in über 20 Rezepten verwendet. Das Zusammenführen kann viele Rezepte beeinflussen."
- **THEN** eine Checkbox "Ich bin sicher" SHALL erscheinen
- **THEN** der "Zusammenführen"-Button SHALL deaktiviert sein, bis die Checkbox angehakt wird

#### Scenario: Keine Warnung bei geringer Nutzung
- **WHEN** `source.usage_count <= 20`
- **THEN** SHALL keine Warnung und keine Checkbox angezeigt werden

### Requirement: Erfolgsmeldung
Nach erfolgreichem Merge SHALL eine detaillierte Erfolgsmeldung erscheinen.

#### Scenario: Erfolgsmeldung zeigt Kennzahlen
- **WHEN** der Merge erfolgreich war
- **THEN** SHALL ein Toast/Success-Dialog erscheinen mit: "Zutaten zusammengeführt: X Rezepte aktualisiert, Y Portionen übernommen, Z Aliase hinzugefügt"

### Requirement: Gemeinsame Komponente
Der Merge-Dialog SHALL als gemeinsame Komponente für IngredientEditPage und DuplicateDetectionList dienen.

#### Scenario: IngredientEditPage-Nutzung
- **WHEN** die Komponente von der IngredientEditPage verwendet wird
- **THEN** SHALL die aktuelle Zutat als initiales Target übergeben werden
- **THEN** kein `preSelectedTarget` übergeben werden

#### Scenario: DuplicateDetectionList-Nutzung
- **WHEN** die Komponente von der DuplicateDetectionList verwendet wird
- **THEN** SHALL `preSelectedTarget` (die zweite Zutat aus der Duplikat-Erkennung) übergeben werden
- **THEN** der Dialog SHALL direkt zum Schritt Quelle/Ziel springen

#### Scenario: Nach erfolgreichem Merge
- **WHEN** der Merge von der IngredientEditPage ausgeführt wurde
- **THEN** SHALL auf die Target-Zutat weitergeleitet werden
- **WHEN** der Merge von der DuplicateDetectionList ausgeführt wurde
- **THEN** SHALL die Duplikat-Liste neu geladen werden
