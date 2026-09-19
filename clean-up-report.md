# Clean-Up Report — Gesamt-Repository / Gemini-Datenextraktion — 2026-09-19

## Zusammenfassung
- Geprüfter Scope: Backend, `frontend/`, `frontend-food/`, OpenSpec; Schwerpunkt auf allen Gemini-Datenextraktionen und strukturierten JSON-Antworten
- Findings gesamt: 10  (🔴 0 · 🟠 3 · 🟡 6 · 🟢 1)
- Tooling-Status: ruff fail (1 bestehender Testfehler), mypy fail (49 bestehende Fehler), frontend tsc fail (bestehende Fehler), food tsc ok, tests fokussiert ok, OpenSpec fail (169 ältere Spec-Validierungsfehler; aktueller Change validiert)

## Top-Prioritäten
1. 🟠 [bug] Manipulierte oder veraltete Apply-Operationen können im Portions-Zauberstab `None` dereferenzieren und HTTP 500 auslösen — `backend/supply/services/portion_magic_wand.py:374-384`
2. 🟠 [missing-error] Strukturierte Gemini-Antworten werden zwar zentral einmal wiederholt, aber direkte Parser können weiterhin leere/teilweise Antworten als fachlich gültig interpretieren — `backend/recipe/services/step_ai_service.py:456-532`
3. 🟠 [schema-mismatch] Neue Packungsoperation ist im lokalen Frontend-Vertrag vorhanden, aber der produktive Food-Service lief zeitweise mit dem alten Zod-Enum; Deploy-Artefakt und Commit müssen gemeinsam synchronisiert werden — `frontend-food/src/schemas/supply.ts:181-196`
4. 🟡 [refactor] Strukturierte Retry-Logik ist zentral, aber Validierung und Fehlerbehandlung bleiben in vielen Services dupliziert — `backend/core/services/gemini.py:480-535`
5. 🟡 [missing-tests] Es fehlt ein repoweiter Contract-Test, der alle `gemini_call(response_schema=...)`-Aufrufe auf Retry bei leerem und schema-ungültigem Output prüft — `backend/core/tests/test_gemini.py:153-215`

## Findings nach Kategorie

### schema-mismatch
| Sev | Backend | Frontend | Problem | Fix |
|-----|---------|----------|---------|-----|
| 🟠 | `PortionMagicOperationOut.operation` erlaubt `package` | `frontend-food/src/schemas/supply.ts:183` muss dieselbe Enum-Version ausliefern | Ein Backend-Deploy mit `package` vor dem passenden Food-Frontend-Deploy bricht die gesamte Preview beim Zod-Parsing ab | Backend und Food-Frontend atomar versionieren/deployen; Contract-Test gegen ein echtes Preview-Beispiel ausführen |
| 🟡 | `StepGenerationOutput.steps: list[dict]` | Kein entsprechendes Frontend-Contract-Schema | Das neue strukturierte Schema prüft nur, dass eine Liste nicht leer ist; Pflichtfelder wie `instruction` und Referenznamen sind nicht typisiert | Verschachtelte Pydantic-Modelle für Schritt, Dauer, Bereich und Ingredient-Referenzen definieren |

### bug
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟠 | `backend/supply/services/portion_magic_wand.py:374-384` | Bei `delete_without_replacement=true` und fehlender/ungültiger `source_portion_id` ist `source` `None`; `resolve_trusted_weight(source)` bzw. `source.deleted_at` kann einen 500er auslösen | Vor jeder Delete-/Replace-Operation `source is not None` erzwingen und mit `ValueError`/HTTP 422 ablehnen; Regressionstest mit fremder ID und fehlender ID ergänzen |
| 🟡 | `backend/supply/services/portion_magic_wand.py:148-153` | Packungsgewicht wird bei Abweichung vom ersten Stückgewicht auf `None` gesetzt, obwohl die KI eventuell eine valide Produktpackung mit abweichender Stückgröße beschrieben hat | Gewicht nur als Warnung markieren oder anhand der expliziten Packungsstückzahl prüfen; nicht stillschweigend in manuelle Klärung umwandeln |

### dead-code
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| – | – | Keine belastbare neue Dead-Code-Feststellung im Gemini-Scope | – |

### refactor
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟡 | `backend/recipe/services/step_ai_service.py:456-532` | Trotz strukturiertem Schema werden JSON-Blöcke weiterhin manuell aus Freitext ausgeschnitten und erneut mit `json.loads` geparst | Nach Einführung verschachtelter Pydantic-Schemas direkt `model_validate_json` verwenden und die Fallback-Extraktion entfernen |
| 🟡 | `backend/core/services/gemini.py:480-535` | Retry, Schema-Validierung und Interaktionsstatus sind zentral, aber einzelne Services behandeln `None`, Parsing und fachlich leere Listen weiterhin unterschiedlich | Gemeinsame Helper-Funktion für `require_structured_response` und fachliche Mindestvalidierung pro Schema einführen |

### todo
| Sev | Ort | Marker | Notiz |
|-----|-----|--------|-----|
| 🟢 | Repositoryweit | Diverse vorhandene TODO/FIXME-Marker | Nicht ursächlich für diesen Change; separat priorisieren |

### missing-impl
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| – | – | Keine neue fehlende Implementierung im geprüften Gemini-Flow | – |

### missing-error
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟡 | `backend/recipe/services/step_ai_service.py:181-191` | Zutatenzuordnung gibt bei Parserfehlern still `[]` zurück; der Nutzer erhält keinen Hinweis, dass die KI-Antwort unbrauchbar war | Strukturierte Retry-Schicht nutzen und nach dem zweiten Fehler eine fachliche Warnung/Fehlermeldung zurückgeben |
| 🟡 | `backend/core/management/commands/batch_generate_default_portions.py:157-166` | Batch-Verarbeitung zählt fehlerhafte/fehlende Einträge nur teilweise und kann einen fachlich unvollständigen Batch weiterverarbeiten | Schema-Mindestlänge plus exakte Zuordnung zur Eingabeliste validieren; bei fehlender Länge Batch als fehlgeschlagen markieren |

### risk
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟡 | `backend/core/services/gemini.py:505-535` | Ein Retry erzeugt keinen neuen `AiInteraction`-Datensatz, sondern überschreibt denselben Interaktionsstatus; einzelne Versuche sind im Audit nicht getrennt nachvollziehbar | Retry-Metadaten oder Versuchszähler in `AiInteraction`/Response-Kontext speichern |
| 🟡 | Deployment-Workflow | Backend kann ein neues strukturiertes Enum ausliefern, bevor das Food-Frontend den Zod-Vertrag enthält; dann scheitert die gesamte Vorschau clientseitig | Gemeinsamen Release-Check für Backend-Pydantic und Food-Zod einführen; Backend-Änderung erst nach Frontend-Build ausrollen |

### bad-practice
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟡 | `backend/recipe/services/step_ai_service.py:28-35` | `list[dict]` als Pydantic-Struktur ist zu permissiv und widerspricht dem Ziel „structured output schema“ | Typed nested models mit Feldvalidierung verwenden |
| 🟡 | `backend/core/management/commands/batch_generate_default_portions.py:7` | Die Batch-Ausgabe war zuvor freies JSON; die Umstellung ist korrekt, aber Prompt, Schema und Mapping müssen zusätzlich eine exakte Batch-Größe verlangen | `expected_count` oder Eingabeliste im Schema-Kontext validieren |

### layout-inconsistency
| Sev | Ort | Abweichung | Soll-Komponente/Pattern |
|-----|-----|----------|------------------------|
| – | – | Im fokussierten Zauberstab-Audit keine neue Layout-Abweichung priorisiert | – |

### wrong-logic
| Sev | Ort | Ist-Verhalten | Warum falsch | Soll-Verhalten |
|-----|-----|---------------|--------------|----------------|
| 🟡 | `backend/supply/services/portion_magic_wand.py:148-153` | Packungen werden gegen genau das erste Stückgewicht plausibilisiert | Eine Packung kann valide eine andere Produktgröße oder ein anderes Stückgewicht repräsentieren | Packungsgewicht mit Stückzahl, bestehender Produktgröße und Begründung bewerten; bei Unsicherheit warnen, nicht automatisch löschen |

### missing-tests
| Sev | Ort (Funktion) | Risiko bei Fehler | Test-Vorschlag |
|-----|----------------|------------------|----------------|
| 🟠 | `apply_portions` — `backend/supply/services/portion_magic_wand.py:328` | Ungültige Client-Payload kann HTTP 500 statt 422 erzeugen | Tests für fehlende/fremde `source_portion_id`, Delete ohne Quelle und Package-Duplikat |
| 🟡 | Alle `gemini_call`-Aufrufe mit `response_schema` | Ein Service könnte Retry/Schema-Vertrag umgehen oder eine leere Liste als Erfolg akzeptieren | Parametrisierter zentraler Test mit leerem Output, falschem JSON und falschem Pydantic-Typ |
| 🟡 | `AiStepService` strukturierte Outputs | Falsche Feldformen werden erst im manuellen Parser bemerkt | Tests für fehlende `instruction`, leere `steps`, falsche Dauer und unbekannte Ingredient-Referenz |

### missing-integration-tests
| Sev | Endpoint / Flow | Risiko bei Fehler | Test-Vorschlag |
|-----|-----------------|------------------|----------------|
| 🟠 | `POST /api/ingredients/{slug}/portions/magic-wand/preview/` plus Food-Zod-Parsing | Backend-/Frontend-Versionen können bei `operation=package` auseinanderlaufen | E2E gegen echte Preview-Response mit Portion und Packung nach jedem Contract-Deploy |
| 🟡 | Gemini-Extraktion → Datenmodell → UI | Strukturierte Retry-Antwort kann zwar valide sein, aber fachlich leer bleiben | Ein Integrationsfixture pro Extraktionsschema mit leerer, korrigierter und fachlich unvollständiger Antwort |

## OpenSpec — letzte 10 Specs

| Spec / Change | Zusammenfassung | Implementierungs-Status | Lücken |
|---------------|-----------------|-------------------------|--------|
| `fix-ai-portion-generation` | Robuste Portions-/Packungsvorschläge, Einheitenauflösung, atomare Übernahme | Partial | Neue globale Gemini-Retry-Erweiterung und `package`-Erweiterung sind noch nicht vollständig im Spec erfasst |
| `portion-magic-wand` | Vorschau, Schutz gewichteter Portionen, Auswahl und atomare Übernahme | Partial | Packungsoperation und zentrale strukturierte Retry-Anforderung fehlen im bestehenden Spec |
| `piece-portion-mapping` | Benannte Stückportionen mit physischer Gramm-Basis | Done | – |
| `measuring-unit-cleanup` | Kanonische Maßeinheiten und Entfernung semantischer Phantom-Einheiten | Partial | Seed-/Migrationshistorie enthält weiterhin alte Pfade und muss langfristig vereinheitlicht werden |
| `ingredient-portion-ai-apply` | Separater atomarer Apply-Endpoint für KI-Portionen | Drifted | Der aktuelle Flow verwendet den Magic-Wand-Endpoint statt des in der Spec genannten Pfads |
| `ai-prompt-context` | Kontext für KI-Aufrufe zentral bereitstellen | Partial | Portions-Zauberstab ergänzt eigenen Kontext; zentrale Nutzung ist nicht vollständig vereinheitlicht |
| `recipe-ai-ingredient-extraction` | Strukturierte Rezeptzutatenextraktion | Partial | Retry ist zentral vorhanden, aber nicht alle nachgelagerten fachlichen Leerresultate werden geprüft |
| `recipe-ai-quantity-estimate` | Strukturierte Mengen-/Gewichtsschätzung | Partial | Schema-Retry vorhanden, fachliche Plausibilitätsgrenzen bleiben serviceabhängig |
| `ingredient-url-import` | Strukturierter Zutat-/Rezept-URL-Import | Done | – |
| `food-production-integrity` | Produktionssicherheit für Food-Daten und Flows | Partial | Contract-Deploy-Reihenfolge und Migrationserfordernisse sollten explizit abgedeckt werden |

## Sichere Auto-Fixes (Vorschlag)
- [ ] Ruff-/Format-Fixes im aktuellen Gemini-Change anwenden
- [ ] Generierten `frontend-food/tsconfig.tsbuildinfo`-Diff entfernen
- [ ] Bestehenden ungenutzten Testvariablennamen in `backend/recipe/tests/test_ingredient_replacement.py` korrigieren

## Manuelle Fixes (nur mit Freigabe)
- 🟠 `apply_portions` gegen ungültige Quellen und Delete-Operationen absichern
- 🟠 `StepGenerationOutput` und `IngredientSuggestionOutput` durch verschachtelte Pydantic-Modelle ersetzen
- 🟠 Globalen Gemini-Retry um fachliche Mindestvalidierung pro Extraktionsschema erweitern
- 🟡 OpenSpec-Requirements für `package`-Operationen und globales Structured-Output-Verhalten aktualisieren
- 🟡 Bestehende Mypy-/Haupt-Frontend-TypeScript-Fehler separat bereinigen
