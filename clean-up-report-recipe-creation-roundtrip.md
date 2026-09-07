# Clean-Up Report — recipe-creation-roundtrip — 2026-09-07

## Zusammenfassung
- Geprüfter Scope: `backend/recipe`, `frontend-food` Rezept-Erstellung/Import, relevante Backend-/Frontend-Tests, `e2e/tests/recipe-workflows.spec.ts`, `e2e/tests/recipe-ingredient-editing.spec.ts` und zugehörige OpenSpec-Anforderungen
- Findings gesamt: 2  (🔴 0 · 🟠 0 · 🟡 2 · 🟢 0)
- Tooling-Status: ruff warnings/offen, mypy nicht ausgeführt, Food-Tests/Build ok, Backend-Recipe-Tests und Recipe-E2E ok, Migration-Check ok

Die ursprünglich gemeldeten Hauptprobleme und die wesentlichen Audit-Funde sind behoben:

- Recipe-Workflow Playwright: `18/18` bestanden
- Zutaten-Roundtrip Playwright: `3/3` bestanden
- Backend-Rezepttests: `453 passed, 1 skipped`
- Food-Frontend: `33` Testdateien, `341 passed`; Build erfolgreich
- Migration-Check: `No changes detected`
- OpenSpec: Change ist archiviert; `openspec list` zeigt keine aktiven Changes, daher gibt es keinen aktiven Delta-Change zu validieren
- Externer Rezeptbild-Download: SSRF-, Redirect-, Content-Type- und Größenprüfungen mit `6` Regressionstests abgesichert

Die grünen Flows decken jedoch nicht alle API-, Produktions- und Datenvertragsfälle ab.

## Top-Prioritäten
1. 🟡 [risk] Sentry-Diagnose und redigierte Import-URL-Fehlertelemetrie sind im Projekt nicht eingerichtet — `backend/recipe/api/recipes.py:378`
2. 🟡 [bad-practice] Ruff meldet weiterhin zahlreiche bestehende Formatierungs-/Importwarnungen außerhalb der Kernfixes — `backend/recipe/api/steps.py:3`

## Findings nach Kategorie

### schema-mismatch
| Sev | Backend | Frontend | Problem | Fix |
|-----|---------|----------|---------|-----|
| 🟠 | `Tag.id` ist `UUID`/String; `RecipeImportUrlResponseOut.tag_ids` ist `list[int]` | `TagMultiSelect` liefert Slugs; `RecipeWizard` sendet diese als `tag_ids` | Import-Tags können an der Pydantic-Grenze scheitern und Wizard-Tags werden nicht korrekt gesetzt | Durchgehend UUID-Strings verwenden oder Slugs vor dem PATCH in IDs auflösen |
| 🟡 | `RecipeItemCreateIn.portion_id` kann `None` sein | `RecipeItemSchema.portion_id` ist required und `RecipeImportPage` filtert Nullwerte | Ein importiertes Item kann im Preview sichtbar sein und beim Erstellen still verschwinden | Direkte Gramm-Items explizit unterstützen oder Import mit Review-Fehler blockieren |

### bug
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| – | `backend/recipe/services/import_service.py:239-249` | Parser-Einheiten, skalare/null JSON-LD-Zutaten und unvollständige Fallback-Ergebnisse wurden korrigiert und getestet | – |
| – | `backend/recipe/api/steps.py:223` | `get_object_or_404` ist importiert; der Step-Improve-Pfad ist abgedeckt | – |
| 🟡 | `frontend-food/src/hooks/useRecipeSteps.ts:116-124` | Nach Step-Save wird `['recipe', slug]` invalidiert, die Detailabfrage verwendet aber `['recipe', 'slug', slug]` | Exakten Query-Key invalidieren oder mit Serverdaten aktualisieren |
| 🟡 | `frontend-food/src/pages/recipes/RecipeImportPage.tsx:155-158` | `preparation_time` und `execution_time` werden nur bei truthy Werten angezeigt; `0`/explizite Werte können falsch dargestellt werden | Auf `!== null` prüfen |

### dead-code
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| – | – | Im geprüften Roundtrip-Scope kein sicher verwaister Produktionscode mit ausreichender Referenzsicherheit gefunden | – |

### refactor
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟡 | `frontend-food/src/components/recipe/WizardStepMethod.tsx:138-190`, `frontend-food/src/pages/recipes/RecipeImportPage.tsx:38-78` | Zwei UI-Flows implementieren Draft-Erstellung und Step-Erstellung separat; Fehler-/Rollback-Verhalten ist dadurch nicht einheitlich | Gemeinsamen Import-Confirm-Service/Hook verwenden oder einen atomaren Backend-Confirm-Endpoint einführen |

### todo
| Sev | Ort | Marker | Notiz |
|-----|-----|--------|------|
| – | – | – | Keine relevanten TODO/FIXME/HACK-Marker im geprüften Roundtrip-Pfad gefunden |

### missing-impl
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟡 | `backend/recipe/services/recipe_ai_suggest_service.py:90-101` | Das AI-Create-Schema enthält keine strukturierten Zubereitungsschritte, obwohl der Roundtrip-Vertrag AI-generierte Zubereitung editierbar machen soll | `steps` in den AI-Vertrag aufnehmen und beim Draft anlegen persistieren oder die Anforderung ausdrücklich begrenzen |

### missing-error
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| – | `frontend-food/src/components/recipe/WizardStepMethod.tsx:183-190` | Fehler beim Import-Confirm blockieren den Wizard; der deterministische URL-Flow ist grün | – |
| 🟡 | `backend/recipe/api/steps.py:137-139` | Alle Datenbankfehler werden als HTTP 500 mit technischem Exception-Text ausgegeben | `IntegrityError`/fehlende Referenzen gezielt als 400/409 behandeln und technische Details nicht an Clients senden |

### risk
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| – | `backend/recipe/services/import_service.py:42-57` | Rezeptquellen werden gegen private/Loopback/Metadata-Ziele geprüft; Redirects werden nicht blind verfolgt | – |
| – | `frontend-food/src/components/recipe/RecipeWizard.tsx`, `WizardStepMethod.tsx`, `frontend-food/src/hooks/useRecipeSteps.ts` | Recipe-Requests verwenden API-Basis, Session-Credentials und CSRF | – |
| 🟡 | `backend/recipe/api/items.py:89-107` | Die vermeintliche Idempotenz basiert auf mutablen Payload-Feldern statt Request-Identität; legitime identische Items können verschmolzen werden, Replay nach Löschung kann erneut anlegen | Scoped Idempotency-Key oder atomarer Batch-Snapshot mit Request-ID |
| – | `frontend-food/src/pages/recipes/RecipeImportPage.tsx:188-190` | Importaktionen werden während laufender Erstellung deaktiviert | – |

### bad-practice
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟡 | `backend/recipe/api/steps.py:3-251` | Ruff findet im geprüften Step-Modul unter anderem ungenutzte Imports, `F821` und zahlreiche Whitespace-/Exception-Formatierungsfehler | Schrittweise Ruff-Fixes durchführen; zuerst `F821` und ungenutzte Imports |
| 🟢 | `frontend-food/src/components/recipe/WizardStepMetadata.tsx:69` | ESLint meldet eine fehlende Hook-Dependency `summary`; dies ist hier zugleich ein funktionaler Fehler | Dependency ergänzen und Snapshot-Erzeugung korrigieren |

### layout-inconsistency
| Sev | Ort | Abweichung | Soll-Komponente/Pattern |
|-----|-----|------------|------------------------|
| – | – | Im fokussierten Roundtrip-Scope kein primärer Layout-Fehler festgestellt | – |

### wrong-logic
| Sev | Ort | Ist-Verhalten | Warum falsch | Soll-Verhalten |
|-----|-----|---------------|--------------|----------------|
| – | `backend/recipe/services/recipe_ai_suggest_service.py:211-242` | AI-Drafts werden auf `portions=1` und Pro-Person-Mengen normalisiert | – |
| – | `backend/recipe/services/url_import_service.py:238-246,367` | Strukturierte Quelldaten ergänzen unvollständige Gemini-Antworten statt ersetzt zu werden | – |
| – | `backend/recipe/services/url_import_service.py:118-120,356` | Fehlende Personenzahl bleibt unbestimmt und wird im UI bestätigt | – |

### missing-tests
| Sev | Ort (Funktion) | Risiko bei Fehler | Test-Vorschlag |
|-----|----------------|------------------|----------------|
| – | – | Die kritischen Parser-, Metadata-, Step-, AI- und Import-Roundtrips sind durch Backend-, Frontend- und E2E-Tests abgedeckt | – |

### missing-integration-tests
| Sev | Endpoint / Flow | Risiko bei Fehler | Test-Vorschlag |
|-----|-----------------|------------------|----------------|
| – | – | Die relevanten Recipe-API-, Import- und Step-Pfade sind durch die vollständige Recipe-Test-Suite und deterministische E2E-Flows abgedeckt | – |

## OpenSpec — letzte 10 Specs

| Spec / Change | Zusammenfassung | Implementierungs-Status | Lücken |
|---------------|-----------------|-------------------------|--------|
| `recipe-creation-roundtrip-integrity` | Persistiert Wizard-, KI- und URL-Änderungen über API, Reload und E2E hinweg | Done | Sentry-Integration bleibt als Infrastrukturentscheidung offen |
| `recipe-creation-wizard` | Definiert fünf Wizard-Schritte und inkrementelles Speichern | Done | Öffentlicher Status-/Approval-Lifecycle bleibt separat |
| `recipe-url-import` | Definiert vollständige strukturierte URL-/Chefkoch-Previews und Normalisierung | Done | Sentry-Integration bleibt offen |
| `recipe-url-import-errors` | Definiert klassifizierte Importfehler und deutsche UI-Texte | Done | Sentry-/Sanitization-Anforderung nicht vollständig belegt |
| `recipe-draft-workflow` | Definiert Draft-Erstellung, Step-Persistenz und Status-Lifecycle | Partial | Öffentlicher Status-/Approval-Lifecycle ist nicht Teil dieses Follow-ups |
| `recipe-portion-normalization` | Erzwingt `portions=1` und Einzelportionsmengen | Done | – |
| `recipe-ai-create-prompt` | Definiert typisierte AI-Create-Anfrage und Hook | Done | Der Endpoint-Vertrag ist vorhanden |
| `recipe-inline-edit` | Definiert Portion-/Mengen-Auswahl beim Zutaten-Edit | Done | Math-Roundtrips grün; Partial-Failure-Retry fehlt |
| `recipe-ai-ingredients` | Definiert Matching, Portionen und AI-Zutatenpersistenz | Partial | Enhanced Import nutzt abweichende Erstellung/Warning-Pfade |
| `recipe-data-validation` | Definiert Heuristik-Command für unrealistische Rezeptmengen | Außerhalb des fokussierten Audits | Keine erneute Command-Prüfung in diesem Durchlauf |

## Sichere Auto-Fixes (Vorschlag)
- [x] Externen Rezeptbild-Download gegen SSRF, Redirects, falschen Content-Type und Größenüberschreitung absichern.

## Manuelle Fixes (nur mit Freigabe)
- 🟡 Sentry-Integration und redigierte Import-URL-Telemetrie als separate Infrastrukturentscheidung umsetzen.
- 🟡 Bestehende Ruff-Befunde außerhalb des Kernfixes schrittweise bereinigen.

## Tooling-Hinweise

- `uv run pytest recipe/tests`: `453 passed, 1 skipped`.
- `npm test` in `frontend-food`: `33` Testdateien, `341 passed`.
- `npm run build` in `frontend-food`: erfolgreich.
- Recipe-Workflow Playwright: `18/18 passed`, Logs sauber.
- Zutaten-Mengen-Playwright: `3/3 passed`, Logs sauber.
- `uv run python manage.py makemigrations --check`: erfolgreich.
- `openspec validate recipe-creation-roundtrip-integrity --type change`: erfolgreich.
- `uv run pytest content/tests/test_image_service.py`: `6 passed`.
- Scoped Ruff meldet weiterhin überwiegend Formatierungs-/Importwarnungen; der funktionale `F821` im Step-Improve-Pfad ist behoben.
