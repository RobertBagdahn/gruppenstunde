## Context

Die Rezepterstellung im Food-Frontend läuft über `RecipeWizard` (`frontend-food/src/components/recipe/RecipeWizard.tsx`) mit drei Methoden in Step 0 und eine vierte, nirgends verlinkte Route `/recipes/import`. Alle Wege teilen sich dieselbe Backend-Pipeline.

Sechs Fehler wurden gegen die lokale Entwicklungsdatenbank reproduziert:

| # | Symptom | Ort | Nachweis |
|---|---------|-----|----------|
| 1 | HTTP 500 beim URL-Import | `url_import_service.py:1114-1118` | `IntegrityError: unique_portion_name_per_ingredient`, Key `(tl, 7126)` |
| 2 | Import scheitert trotz HTTP 200 | `import_schemas.py:62` vs. `recipeImport.ts:43` | Backend `list[str]` (UUID), Zod `z.array(z.number())` |
| 3 | Zutaten verdoppeln sich | `url_import_service.py:738` | 10 geparste Zutaten werden zu 17 Items, nur 3 von 10 Merge-Keys treffen |
| 4 | Mengen werden zu Gramm | `url_import_service.py:1207` | `Möhre 4.0 portion_id: None`, laut Modell-Hilfetext gilt `NULL = Gramm` |
| 5 | KI-Inhalte werden gelöscht | `RecipeWizard.tsx:205-216` | PATCH mit Leerstrings liefert HTTP 200, `description` danach `''` |
| 6 | Zubereitung nicht bearbeitbar | `RecipeDetailPage.tsx:1032` | `{recipe.description && ...}` blendet den Editor bei leerem Text komplett aus |

Zur Klarstellung: `can_edit` ist bei KI-Rezepten korrekt `True`. Ein realer Aufruf von `GET /api/recipes/by-slug/` liefert `can_edit=True, is_owner=True`. Die Bearbeitung scheitert nicht an Berechtigungen, sondern an Fehler 5 in Kombination mit Fehler 6.

Fehler 1 ist datenabhängig und tritt nur auf, wenn für dieselbe Zutat bereits eine Portion mit dem Zielnamen existiert. Das erklärt, warum der URL-Import mal funktioniert und mal nicht.

## Goals / Non-Goals

**Goals:**

- Ein einziger, KI-gestützter Erstellungsweg ersetzt die drei Methoden und die verwaiste Import-Seite.
- Der URL-Import ist deterministisch stabil: keine 500er, keine Duplikate, keine stillen Null-Portionen.
- Bereits vorhandene Rezeptinhalte können durch den Wizard nicht mehr verloren gehen.
- Pydantic- und Zod-Schemas sind für die Import-Antwort nachweislich synchron.
- Playwright deckt den Weg deterministisch ab; ein separater Live-Test prüft die echte Integration.

**Non-Goals:**

- Keine Änderung an Rezept-Modellen oder Migrationen.
- Keine Überarbeitung des `breakfast-wizard` oder anderer Content-Typen (`GroupSession`, `Blog`, `Game` behalten `ContentStepper`).
- Keine Änderung an der internen Normierung auf eine Portion. Sie wird nur transparent erklärt.
- Keine automatische Reparatur bestehender defekter `RecipeItem`-Zeilen. Es wird lediglich ein Report-Command bereitgestellt.
- Kein Wechsel des KI-Anbieters.

## Decisions

### Entscheidung 1: Import verändert bestehende Portionen nicht mehr

`_resolve_portion()` in `backend/recipe/services/url_import_service.py` benennt heute eine gefundene Portion um, sofern sie keine `recipe_items` hat (Zeilen 1114–1118). Dieser Zweig führt **überhaupt keine Kollisionsprüfung** durch — anders als der Anlege-Zweig, der bei Zeile 1165 prüft. Der Datenbank-Constraint `unique_portion_name_per_ingredient` ist partiell (`UNIQUE (lower(name), ingredient_id) WHERE deleted_at IS NULL`) und greift damit für zwei aktive Zeilen.

Reproduziert: Portion `92211 'Teelöffel'` (aktiv) sollte in `'TL'` umbenannt werden, während `15245 'TL'` bereits aktiv existierte.

Soft-gelöschte Portionen sind vom Constraint ausgenommen und dürfen denselben Namen tragen. Die bestehenden Prüfungen im Anlege-Zweig filtern korrekt mit `deleted_at__isnull=True` und bleiben unverändert.

Der Umbenennungspfad entfällt ersatzlos. Der Import liest Stammdaten und legt bei Bedarf neue Portionen an.

*Alternative:* Umbenennen mit `try/except IntegrityError` und Namenssuffix absichern. Verworfen, weil der Import damit weiterhin Stammdaten mutiert, die von anderen Rezepten referenziert werden. Eine Umbenennung von `Teelöffel` nach `TL` ändert die Anzeige in fremden Rezepten ohne Zutun ihrer Besitzer.

### Entscheidung 2: Nicht auflösbare Einheiten werden im Wizard geklärt

`_resolve_portion()` gibt heute `None` zurück, wenn keine Einheit erkannt wurde (Zeile 1207). Das Ergebnis wird als `RecipeItem` mit `portion = NULL` gespeichert und laut Modell-Hilfetext als Gramm interpretiert. Aus vier Möhren werden vier Gramm. Im `RecipeItemOut` fallen dann `ingredient_id`, `ingredient_portions` und `measuring_unit_name` auf `null` beziehungsweise `[]`, `resolve_ingredient_name` liefert `"Zutat"`. Die Zeile ist im Editor nicht mehr reparierbar.

Solche Positionen erhalten künftig einen expliziten Klärungsstatus. Der Wizard zeigt sie hervorgehoben mit Einheiten-Auswahl und blockiert das Speichern, bis alle geklärt sind. Ein KI-Vorschlag wird vorbelegt, aber nicht stillschweigend übernommen.

*Alternative:* Automatischer Fallback auf eine geschätzte Stück-Portion. Verworfen, weil dieselbe Klasse stiller Fehlinterpretationen entsteht, nur mit plausibleren Zahlen. Falsche Mengen wirken sich direkt auf Einkaufslisten, Kosten und Nährwerte aus.

### Entscheidung 3: Strukturierte Zutatenübergabe an Gemini

`_call_gemini_for_metadata()` übergibt Zutaten als konkatenierten String (`url_import_service.py:738`):

```
Zutaten: 300 g Hähnchenbrustfilet(s), 4  m.-große Möhre(n), ...
```

Gemini spiegelt daraufhin `"300 g hähnchenbrustfilet(s)"` als `original_name` zurück. `_ingredient_key()` normalisiert nur Kleinschreibung und Whitespace, trifft also nie. Ergebnis: 3 von 10 Zutaten gematcht, 7 Duplikate, 17 statt 10 Items. Zusätzlich landet der Mengen-Präfix als Suchbegriff im `IngredientMatcher` (Zeile 266).

Zutaten werden künftig als indizierte Liste mit getrennten Feldern übergeben, und die Antwort referenziert den Index statt eines Freitextnamens. Der Merge wird damit unabhängig von der Textnormalisierung.

*Alternative:* `_ingredient_key()` toleranter machen (Mengen und Einheiten strippen). Verworfen, weil es eine Heuristik gegen eine andere Heuristik stellt und bei jeder Prompt- oder Modelländerung erneut brechen kann.

### Entscheidung 4: Wizard sendet nur geladene oder geänderte Werte

`metadataRef` in `RecipeWizard.tsx:140-148` startet mit Leerstrings. `WizardStepMetadata` ruft `notify()` ausschließlich in `onChange`-Handlern (`WizardStepMetadata.tsx:93-164`). Wer den Schritt nur durchklickt, sendet die leeren Defaults. `handleNext` (Zeilen 205–216) und `handleBack` (Zeilen 251–262) schreiben sie unkonditioniert.

Der Metadaten-Schritt meldet seinen Zustand künftig nach der Initialisierung aus den geladenen Rezeptdaten. Zusätzlich werden nur veränderte Felder in den PATCH aufgenommen.

Als zweite, unabhängige Absicherung lehnt `update_recipe` leere Werte für die Auswahlfelder `difficulty`, `execution_time` und `preparation_time` mit HTTP 422 ab. Heute akzeptiert der Endpunkt sie mit HTTP 200, weil `setattr` plus `save()` keine `full_clean()`-Validierung auslöst.

*Alternative:* Nur das Frontend korrigieren. Verworfen, weil derselbe Endpunkt auch von der Inline-Bearbeitung auf der Detailseite genutzt wird und die Validierung laut Projektregeln serverseitig gehören.

### Entscheidung 5: Smart-Feld mit serverseitiger Quellenerkennung

Statt drei Methodenkarten ein Feld. Die Typerkennung erfolgt serverseitig, damit Frontend und Backend nicht zwei divergierende Heuristiken pflegen.

```
Eingabe
   │
   ├── beginnt mit http(s)://  ──▶ URL-Pfad
   │                                 ├─ import_from_url()          direkter Abruf
   │                                 └─ bei SourceUnreachableError:
   │                                    Gemini + Google Search Grounding
   │
   ├── mehrzeilig / enthält Mengenangaben ──▶ Textextraktion
   │
   └── sonst ──▶ Freitext-Generierung (ai_create_recipe)
```

Alle drei Pfade münden in dieselbe Ergebnisstruktur, sodass die Folgeschritte des Wizards unverändert bleiben.

*Alternative:* Tabs nach Quellentyp. Verworfen zugunsten der einfacheren Oberfläche; die Erkennungsregeln sind eindeutig genug.

### Entscheidung 6: Grounding-Fallback statt Fehlermeldung

Bei `SourceUnreachableError` wird Gemini mit Google Search Grounding auf die URL angesetzt. Der Nutzer wird darüber informiert, dass die Daten rekonstruiert wurden und geprüft werden sollten. Die bestehende Fehlermeldung `IMPORT_SOURCE_UNREACHABLE` bleibt als letzte Stufe erhalten, falls auch das Grounding nichts liefert.

*Trade-off:* Rekonstruierte Daten können ungenauer sein als geparste. Deshalb ist der nachgelagerte Prüfschritt im Wizard verpflichtend und der Ursprung wird gekennzeichnet.

### Entscheidung 7: Zod und Pydantic für `tag_ids` auf UUID-Strings vereinheitlichen

`Tag.id` ist ein UUID-Feld. Backend liefert korrekt `list[str]`, das Zod-Schema erwartet `z.array(z.number())`. Sobald Gemini einen Tag zurückgibt, wirft `RecipeImportUrlResponseSchema.parse()` und der Nutzer sieht "Import fehlgeschlagen" trotz erfolgreicher Backend-Antwort.

Das Zod-Schema wird auf `z.array(z.string())` korrigiert. Ein Vertragstest in `frontend-food/src/schemas/contractSchemas.test.ts` prüft die Antwortform gegen ein aus dem Backend-Schema abgeleitetes Beispiel.

### Entscheidung 8: Wizard-Schnitt und Hilfetexte

```
[1] Smart-Eingabe      URL, Rezepttext oder Idee; KI analysiert
[2] Basis & Portionen  Titel, Rezeptart, Original-Personenzahl
                       Hilfetext zur Normierung auf eine Portion
[3] Zutaten            Mengen für die Original-Personenzahl
                       Klärungsbedürftige Positionen blockieren "Weiter"
[4] Zubereitung        Schritte, Zeiten, Schwierigkeit
[5] Vorschau           Nährwerte, Kosten, Sichtbarkeit, Speichern
```

Die Original-Personenzahl wird in Schritt 2 statt wie bisher innerhalb des Zutatenschritts abgefragt, damit sie feststeht, bevor Mengen angezeigt werden.

### Entscheidung 9: Testaufteilung

Der Standard-Playwright-Lauf mockt `POST /api/recipes/ai-create/` und den Smart-Eingabe-Endpunkt mit Fixtures. Ohne API-Key lauffähig und deterministisch. Abgedeckt: Erfolgsfall, blockierte Quelle mit Grounding-Hinweis, unklare Einheit, Metadaten-Erhalt beim Durchklicken.

Ein separater, nicht im Standardlauf enthaltener Live-Test prüft den echten Chefkoch-Import und die echte KI-Erstellung.

### Entscheidung 10: Gemeinsamer SSRF-Validator mit NAT64-Dekodierung

Bei der Umsetzung zeigte sich, dass der URL-Import nach dem Portions-Fix mit `IMPORT_INVALID_URL` scheiterte. Ursache ist `_validate_public_hostname()` in `backend/recipe/services/import_service.py`: Auf DNS64/NAT64-Netzen löst jeder öffentliche Host zusätzlich auf `64:ff9b::/96` auf, was Python als `is_reserved` klassifiziert. Die Prüfung lehnte deshalb legitime Ziele ab.

Die naheliegende Lockerung auf `is_global` wäre ein Sicherheitsloch: `64:ff9b::a9fe:a9fe` bettet `169.254.169.254` ein — den Cloud-Metadata-Endpunkt — und meldet `is_global == True`. Da Inspi auf Cloud Run läuft, wäre das direkt ausnutzbar.

Adressen, die eine IPv4 einbetten, werden daher zuerst dekodiert und die eingebettete Adresse geprüft. Betroffen sind NAT64 (`64:ff9b::/96`), IPv4-mapped (`::ffff:0:0/96`) und 6to4 (`2002::/16`). NAT64-Local-Use (`64:ff9b:1::/48`) und Teredo werden blockiert, da die eingebettete Adresse dort nicht verlässlich dekodierbar ist.

Dieselbe fehlerhafte Prüfung existierte dupliziert in `download_external_image()` (`backend/content/services/image_service.py`). Beide nutzen jetzt `backend/core/services/url_safety.py`.

*Alternative:* Nur `is_reserved` aus der Denylist streichen. Verworfen, weil damit `64:ff9b::a9fe:a9fe` erlaubt würde und die Metadata-Lücke offen bliebe.

## Risks / Trade-offs

- **Bestehende `RecipeItem`-Zeilen mit `portion_id = NULL` bleiben falsch interpretiert** → Ein Management Command listet betroffene Rezepte auf. Keine automatische Korrektur, da die ursprünglich gemeinte Einheit nicht rekonstruierbar ist.
- **Der Wegfall der Portions-Umbenennung kann zu mehr Portionen pro Zutat führen** → Die bestehende Rang- und Namenslogik im Import bleibt aktiv; zusätzlich deckt `portion-data-integrity` die Bereinigung ab.
- **Grounding-Ergebnisse können ungenauer sein als geparste Daten** → Kennzeichnung der Herkunft und verpflichtender Prüfschritt im Wizard.
- **Serverseitige Ablehnung leerer Auswahlfelder kann andere Aufrufer brechen** → Vor der Umsetzung werden alle Aufrufer von `PATCH /api/recipes/{id}/` geprüft, insbesondere die Inline-Bearbeitung auf `RecipeDetailPage`.
- **Der Wegfall der Methodenwahl nimmt erfahrenen Nutzern den rein manuellen Weg** → Das Smart-Feld akzeptiert weiterhin einen bloßen Titel; die Folgeschritte sind vollständig manuell bearbeitbar.
- **Playwright-Fixtures können vom echten KI-Vertrag abweichen** → Fixtures werden aus den Pydantic-Schemas abgeleitet, und der Live-Test deckt die reale Antwortform ab.

## Migration Plan

Keine Datenbank-Migration erforderlich. Es werden keine Modellfelder geändert.

1. Backend-Fixes für die Fehler 1 bis 4 mit Regressionstests umsetzen und einzeln verifizieren.
2. Zod-Schema angleichen und Vertragstest ergänzen.
3. Wizard-Datenverlust beheben, serverseitige Validierung ergänzen, Aufrufer prüfen.
4. `RecipeDetailPage` so anpassen, dass der Zubereitungs-Editor auch bei leerem Text erreichbar bleibt.
5. Wizard auf den vereinheitlichten Weg umbauen, Hilfetexte ergänzen.
6. `/recipes/import` und `RecipeImportPage.tsx` entfernen, Deeplink `?ingredient=` auswerten.
7. Playwright-Suite umstellen, Live-Test ergänzen.
8. Report-Command für `portion_id = NULL` bereitstellen und Ergebnis bewerten.

Rollback: Alle Schritte sind rein code-seitig und ohne Schemaänderung revidierbar.

## Open Questions

- Sollen `RecipeItem`-Zeilen mit `portion_id = NULL` nach Auswertung des Reports aktiv bereinigt werden, und falls ja, in einem eigenen Change?
- Soll der Grounding-Fallback auch dann greifen, wenn der Abruf zwar gelingt, aber kein Rezept gefunden wird (`NoRecipeFoundError`), oder nur bei `SourceUnreachableError`?
- Ist eine Obergrenze für die Länge der Smart-Feld-Eingabe nötig, um Prompt-Kosten bei eingefügten Langtexten zu begrenzen?
