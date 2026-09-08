## 1. Backend — Portions-Integrität (Bug 1 & 4)

- [x] 1.1 Regressionstest in `backend/recipe/tests/` schreiben, der die Portions-Namenskollision reproduziert: zwei aktive Portionen derselben Zutat, von denen eine den Zielnamen der anderen trägt, danach `_resolve_portion()` aufrufen und ein Ergebnis ohne `IntegrityError` erwarten
- [x] 1.2 Umbenennungspfad in `_resolve_portion()` (`backend/recipe/services/url_import_service.py`, aktuell Zeilen 1114–1118) ersatzlos entfernen; nur exakt passende Portionen wiederverwenden
- [x] 1.3 Bestätigen, dass der verbleibende Anlege-Zweig seine Eindeutigkeitsprüfung mit `deleted_at__isnull=True` durchführt und damit exakt dem partiellen DB-Constraint `UNIQUE (lower(name), ingredient_id) WHERE deleted_at IS NULL` entspricht; Test ergänzen, dass eine soft-gelöschte Portion mit gleichem Namen das Anlegen nicht blockiert
- [ ] 1.4 `_resolve_portion()` so umbauen, dass es bei fehlender Einheit kein `None` mehr zurückgibt, sondern einen expliziten Klärungsstatus signalisiert
- [ ] 1.5 `_build_recipe_items_v2()` anpassen: Positionen mit Klärungsstatus als solche markieren und den KI-Einheitenvorschlag mitführen
- [ ] 1.6 Test ergänzen: Zutat ohne erkennbare Einheit ("4 Möhren") liefert eine klärungsbedürftige Position statt `portion_id = null`
- [ ] 1.7 Test ergänzen: wiederholter Import derselben Quelle bleibt bei HTTP 200
- [x] 1.8 Gemeinsamen SSRF-Validator `backend/core/services/url_safety.py` anlegen, der NAT64 (`64:ff9b::/96`), IPv4-mapped (`::ffff:0:0/96`) und 6to4 (`2002::/16`) dekodiert und die eingebettete IPv4 prüft; Teredo und NAT64-Local-Use blockieren
- [x] 1.9 `_validate_public_hostname()` in `backend/recipe/services/import_service.py` und `download_external_image()` in `backend/content/services/image_service.py` auf den gemeinsamen Validator umstellen und die duplizierte Prüfung entfernen
- [x] 1.10 Tests in `backend/core/tests/test_url_safety.py` für öffentliche, interne und getunnelte Adressen (NAT64 auf Loopback, Cloud-Metadata, privates Netz)

## 2. Backend — Zutaten-Merge (Bug 3)

- [ ] 2.1 Regressionstest schreiben, der mit einer gemockten KI-Antwort mit abweichenden Zutatennamen prüft, dass zehn Quellzutaten zu genau zehn Positionen führen
- [ ] 2.2 `GeminiIngredientMatch` in `backend/recipe/services/url_import_service.py` um eine stabile Indexreferenz auf die Quellzutat erweitern
- [ ] 2.3 Prompt in `_call_gemini_for_metadata()` (Zeile 738) umstellen: Zutaten als indizierte Liste mit getrennten Feldern für Menge, Einheit und Name übergeben statt als konkatenierten String
- [ ] 2.4 Merge-Logik in `import_recipe_from_url()` (Zeilen 238–256) auf die Indexreferenz umstellen; `_ingredient_key()` als Merge-Kriterium entfernen
- [ ] 2.5 Sicherstellen, dass `IngredientMatcher.match()` (Zeile 266) den bereinigten Zutatennamen ohne Mengen- oder Einheitenpräfix erhält
- [ ] 2.6 Test ergänzen: KI-Antwort mit Mengenpräfix im Namen erzeugt keine Duplikate

## 3. Backend — Grounding-Fallback und Smart-Eingabe

- [ ] 3.1 Grounding-Rekonstruktion implementieren: bei `SourceUnreachableError` Gemini mit Google Search Grounding auf die URL ansetzen
- [ ] 3.2 Ergebnisstruktur um ein Feld für den erkannten Eingabetyp (`url`, `text`, `prompt`) und ein Flag für rekonstruierte Daten erweitern
- [ ] 3.3 Serverseitige Erkennung des Eingabetyps implementieren (URL-Präfix, mehrzeiliger Text mit Mengenangaben, sonst Freitext)
- [ ] 3.4 Textextraktionspfad für kopierte Rezepttexte ergänzen, der dieselbe Ergebnisstruktur liefert
- [ ] 3.5 Fehlerreihenfolge sicherstellen: `IMPORT_SOURCE_UNREACHABLE` erst melden, wenn auch das Grounding kein Ergebnis liefert; `IMPORT_AI_UNAVAILABLE` bei nicht erreichbarem KI-Dienst
- [ ] 3.6 Tests für alle drei Eingabetypen sowie für Grounding-Erfolg und Grounding-Misserfolg ergänzen

## 4. Backend — Datenschutz vor Überschreiben (Bug 5)

- [ ] 4.1 Test schreiben, der `PATCH /api/recipes/{id}/` mit leeren Werten für `difficulty`, `execution_time` und `preparation_time` aufruft und HTTP 422 erwartet
- [ ] 4.2 Validierung in `update_recipe()` (`backend/recipe/api/recipes.py`, Zeilen 690–750) ergänzen, die leere Auswahlfeldwerte ablehnt und eine deutsche Fehlermeldung mit Feldbezug liefert
- [ ] 4.3 Alle Aufrufer von `PATCH /api/recipes/{id}/` prüfen, insbesondere die Inline-Bearbeitung auf `RecipeDetailPage`, und sicherstellen, dass keiner leere Auswahlfeldwerte sendet
- [ ] 4.4 Test ergänzen: leere Kurzbeschreibung und leere Beschreibung bleiben weiterhin zulässig
- [ ] 4.5 `ai_create_recipe()` in `backend/recipe/services/recipe_ai_suggest_service.py` konsistent machen: `visibility` auf `private` setzen und den erstellenden Nutzer zu `recipe.authors` hinzufügen
- [ ] 4.6 Test ergänzen: ein KI-erstelltes Rezept liefert für den Ersteller `can_edit = true` und `visibility = "private"`

## 5. Backend — Schemas und Report

- [ ] 5.1 `RecipeDraftOut.tag_ids` in `backend/recipe/schemas/import_schemas.py` als UUID-Zeichenketten dokumentieren und beibehalten
- [ ] 5.2 `RecipeItemDraftOut` in `backend/recipe/schemas/import_schemas.py` um Klärungsstatus und KI-Einheitenvorschlag erweitern
- [ ] 5.3 Antwortschema um Eingabetyp und Rekonstruktions-Flag erweitern
- [ ] 5.4 `RecipeUpdateIn` in `backend/recipe/schemas/recipes.py` mit der Validierung für Auswahlfelder abgleichen
- [ ] 5.5 Management Command `report_recipe_items_without_portion` in `backend/recipe/management/commands/` anlegen, der betroffene Rezepte mit Titel, Slug und Zutat auflistet und keine Daten verändert
- [ ] 5.6 Test für den Management Command schreiben (Fall mit Treffern und Fall ohne Treffer)
- [ ] 5.7 `uv run python manage.py makemigrations --check` ausführen und bestätigen, dass keine Migration nötig ist

## 6. Frontend — Schema-Sync (Bug 2)

- [ ] 6.1 `RecipeDraftSchema.tag_ids` in `frontend-food/src/api/recipeImport.ts` von `z.array(z.number())` auf `z.array(z.string())` korrigieren
- [ ] 6.2 `RecipeItemDraftSchema` um Klärungsstatus und KI-Einheitenvorschlag erweitern, synchron zu Aufgabe 5.2
- [ ] 6.3 `RecipeImportUrlResponseSchema` um Eingabetyp und Rekonstruktions-Flag erweitern, synchron zu Aufgabe 5.3
- [ ] 6.4 Vertragstest in `frontend-food/src/schemas/contractSchemas.test.ts` ergänzen, der eine aus dem Backend-Schema abgeleitete Beispielantwort mit Tags gegen das Zod-Schema prüft
- [ ] 6.5 Abgeleitete Typen in `frontend-food/src/schemas/recipe.ts` auf Konsistenz prüfen

## 7. Frontend — Wizard-Datenerhalt (Bug 5)

- [ ] 7.1 Unit-Test für den Metadatenschritt schreiben, der prüft, dass beim Durchklicken ohne Eingabe keine Leerwerte gesendet werden
- [ ] 7.2 `WizardStepMetadata` so anpassen, dass der Zustand nach der Initialisierung aus den geladenen Rezeptdaten an den Wizard gemeldet wird
- [ ] 7.3 `RecipeWizard.handleNext` (Zeilen 205–216) und `handleBack` (Zeilen 251–262) so umbauen, dass nur veränderte Felder in den PATCH aufgenommen werden
- [ ] 7.4 Test ergänzen: ein KI-generiertes Rezept behält seine Beschreibung nach vollständigem Durchklicken des Wizards

## 8. Frontend — Detailseite (Bug 6)

- [ ] 8.1 `RecipeDetailPage.tsx` (Zeile 1032) so anpassen, dass der Zubereitungsbereich bei Bearbeitungsrecht auch ohne vorhandenen Text gerendert wird
- [ ] 8.2 Leerzustand mit deutschem Hinweis zum Ergänzen der Zubereitung umsetzen
- [ ] 8.3 Sicherstellen, dass ohne Bearbeitungsrecht und ohne Text kein Bereich gerendert wird
- [ ] 8.4 Bestehende Tests in `frontend-food/src/pages/recipes/` auf die neue Bedingung anpassen

## 9. Frontend — Vereinheitlichter Wizard

- [ ] 9.1 `WizardStepMethod.tsx` durch eine Smart-Eingabe-Komponente mit einem einzelnen Feld ersetzen; Methodenkarten entfernen
- [ ] 9.2 Neuen Schritt "Basis & Portionen" umsetzen mit Titel, Rezeptart und Original-Personenzahl inklusive Hilfetext zur Normierung
- [ ] 9.3 Personen-Kontext-Abfrage aus `WizardStepIngredients.tsx` entfernen, da sie in Schritt 2 wandert
- [ ] 9.4 `WizardStepIngredients.tsx` um die Hervorhebung klärungsbedürftiger Positionen mit Einheiten-Auswahl erweitern und das Fortfahren blockieren, solange offene Fälle bestehen
- [ ] 9.5 `WizardStepMetadata.tsx` und `WizardStepSteps.tsx` zum Schritt "Zubereitung" zusammenlegen
- [ ] 9.6 `RecipeWizard.tsx` auf die neue Schrittfolge umstellen und Fortschrittsanzeige sowie Beschriftungen anpassen
- [ ] 9.7 Deutschen Hilfetext für jeden der fünf Schritte ergänzen
- [ ] 9.8 Hinweis auf rekonstruierte Daten anzeigen, wenn das Rekonstruktions-Flag gesetzt ist
- [ ] 9.9 Mobile Darstellung ab 320px prüfen und anpassen
- [ ] 9.10 Komponenten gegen den `/styleguide` prüfen und vorhandene Bausteine wiederverwenden

## 10. Frontend — Aufräumen und Deeplink

- [ ] 10.1 Route `/recipes/import` aus `frontend-food/src/App.tsx` (Zeile 78) entfernen
- [ ] 10.2 `frontend-food/src/pages/recipes/RecipeImportPage.tsx` löschen und verwaisten Import in `App.tsx` (Zeile 14) entfernen
- [ ] 10.3 Query-Parameter `ingredient` in `CreateRecipePage` bzw. `RecipeWizard` auslesen und als Ausgangspunkt vorbelegen
- [ ] 10.4 Sicherstellen, dass ein unbekannter Slug den Wizard ohne Fehler und ohne Vorbelegung startet
- [ ] 10.5 Repository nach weiteren Verweisen auf die entfernte Route durchsuchen und bereinigen

## 11. Tests — Playwright

- [ ] 11.1 KI-Fixtures aus den Pydantic-Schemas ableiten und in `e2e/fixtures/food.ts` bereitstellen
- [ ] 11.2 `e2e/tests/recipe-workflows.spec.ts` auf den vereinheitlichten Weg umstellen; Tests zur Methodenwahl entfernen
- [ ] 11.3 Mocked-Test: URL-Eingabe führt bis zur Fertigstellung, Zutaten und Zubereitung bleiben erhalten
- [ ] 11.4 Mocked-Test: Freitext-Idee führt bis zur Fertigstellung, Beschreibung bleibt nach Durchklicken erhalten
- [ ] 11.5 Mocked-Test: blockierte Quelle löst Grounding-Fallback aus und zeigt den Rekonstruktionshinweis
- [ ] 11.6 Mocked-Test: klärungsbedürftige Zutat blockiert das Fortfahren, bis eine Einheit gewählt wurde
- [ ] 11.7 Mocked-Test: nach Fertigstellung sind Zutaten und Zubereitung auf der Detailseite inline bearbeitbar
- [ ] 11.8 Live-Test außerhalb des Standardlaufs ergänzen, der echten Chefkoch-Import und echte KI-Erstellung prüft
- [ ] 11.9 Playwright-Suite wiederholt ausführen und auf Stabilität ohne Flakiness prüfen

## 12. Abschluss

- [ ] 12.1 `uv run python manage.py makemigrations --check` ausführen
- [ ] 12.2 `uv run pytest` im Backend ausführen
- [ ] 12.3 Frontend-Typecheck und Unit-Tests in `frontend-food/` ausführen
- [ ] 12.4 Playwright-Standardlauf ausführen
- [ ] 12.5 Management Command `report_recipe_items_without_portion` ausführen und das Ergebnis bewerten
- [ ] 12.6 Offene Fragen aus `design.md` beantworten oder als Folge-Change festhalten
