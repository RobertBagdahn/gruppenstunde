# Clean-Up Report — manual-norm-portions-override — 2026-09-06

## Zusammenfassung
- Geprüfter Scope: `manual-norm-portions-override` sowie der zugehörige MealPlan-/GroupMember-Ablauf in `backend/planner` und `frontend-food/src/pages/planning`
- Findings gesamt: 9  (🔴 0 · 🟠 7 · 🟡 2 · 🟢 0)
- Tooling-Status: ruff nicht ausgeführt, mypy nicht ausgeführt, frontend tsc ok, food tsc ok, tests ok

Der ursprüngliche Fehler `Body is disturbed or locked` ist behoben: `patchJson()` liest den Response-Body jetzt genau einmal. Die vorhandenen Tests bestehen, decken aber nicht alle relevanten Zustandsübergänge und nicht den tatsächlichen privaten PATCH-Helper ab.

## Top-Prioritäten
1. 🟠 [bug] Beim Zurückschalten auf automatische Berechnung ohne Gruppenmitglieder geht der manuelle Wert verloren — `backend/planner/models/meal_plan.py:170-173`
2. 🟠 [bug] Event-Synchronisierung dupliziert Teilnehmer bei jedem weiteren Sync — `backend/planner/api/meal_plan.py:2845-2866`
3. 🟠 [bug] `null`-Datumswerte aus dem Settings-Formular können einen ungefangenen Backend-Fehler auslösen — `backend/planner/api/meal_plan.py:506-512`
4. 🟠 [bug] Standalone-Pläne können beim Speichern des PAL die direkte Normportion überschreiben — `frontend-food/src/pages/planning/SettingsPanel.tsx:351-358`
5. 🟠 [bug] Datumswerte werden im Settings-Formular als UTC statt lokaler Zeit angezeigt und zurückgesendet — `frontend-food/src/pages/planning/SettingsPanel.tsx:60-61`

## Findings nach Kategorie

### schema-mismatch
| Sev | Backend | Frontend | Problem | Fix |
|-----|---------|----------|---------|-----|
| – | – | – | Kein Feldmismatch im geprüften Override-Vertrag festgestellt. | – |

### bug
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟠 | `backend/planner/models/meal_plan.py:170-173` | `recalculate_norm_portions()` verwendet ohne GroupMembers `previous_norm_portions`. Beim Aktivieren des manuellen Werts wird dieses Feld aber nicht auf den manuellen Wert aktualisiert. Beim Zurückschalten ohne Mitglieder kann z. B. `12` wieder zu `10` werden. | Beim Aktivieren bzw. Setzen des manuellen Werts den Fallback-Wert konsistent speichern und den Reset ohne Mitglieder testen. |
| 🟠 | `backend/planner/api/meal_plan.py:2845-2866` | Beim Event-Sync werden nur nicht synchronisierte Mitglieder gelöscht. Bereits synchronisierte Mitglieder bleiben bestehen und werden erneut angelegt; wiederholte Synchronisierung dupliziert Teilnehmer und entfernt aus dem Event entfernte Teilnehmer nicht. | Alle zuvor event-synchronisierten Mitglieder ersetzen oder anhand einer stabilen Participant-/Person-ID aktualisieren. |
| 🟠 | `backend/planner/api/meal_plan.py:506-512` | `start_datetime` und `end_datetime` sind nullable, aber `timezone.is_naive(None)` wird aufgerufen, wenn das Formular `null` sendet. Das kann zu einem ungefangenen `AttributeError` statt einer API-Fehlermeldung führen. | `None` explizit behandeln und gültige Kombinationen mit strukturiertem `HttpError(400/422)` validieren. |
| 🟠 | `frontend-food/src/pages/planning/SettingsPanel.tsx:351-358`, `backend/planner/api/meal_plan.py:528-538` | Standalone-Pläne senden beim Speichern immer `norm_portions` und `activity_factor`. Eine PAL-Änderung löst auch ohne GroupMembers eine Neuberechnung aus, die den direkten Wert durch `previous_norm_portions` ersetzen kann. | Automatische Neuberechnung nur bei event-/gruppenbasierten Plänen ausführen; Standalone-Werte bei PAL-Änderungen unverändert lassen. |
| 🟠 | `frontend-food/src/pages/planning/SettingsPanel.tsx:60-61,359-360` | Offset-behaftete ISO-Datumswerte werden per `slice(0, 16)` als lokale Eingabe dargestellt. Beim unveränderten Speichern kann sich der tatsächliche Zeitpunkt dadurch verschieben. | ISO-Zeitwerte vor dem Anzeigen in `datetime-local` in Europe/Berlin umrechnen und beim Senden eindeutig zurückkonvertieren. |
| 🟠 | `frontend-food/src/api/mealPlans.ts:205-208`, `frontend-food/src/api/groupMembers.ts:92-142` | Detail-, Kosten-, Einkaufs- und Nährwert-Queries werden über den `meal-plan`-Prefix invalidiert, aber `cooking-schedule` und `meal-plan-suggestions` bleiben nach Normportionen-/Teilnehmeränderungen veraltet. | Die betroffenen Query-Keys nach Plan- und GroupMember-Mutationen zusätzlich invalidieren. |
| 🟡 | `backend/planner/schemas/meal_plan.py:485`, `backend/planner/api/meal_plan.py:480-534` | `norm_portions_manual: null` ist im Update-Schema erlaubt und kann anschließend auf ein nicht-nullbares Django-BooleanField geschrieben werden. | `None` per Schema ablehnen oder wie „nicht gesetzt“ behandeln; einen API-Test ergänzen. |
| 🟡 | `frontend-food/src/pages/planning/SettingsPanel.tsx:216-231` | Das UI verhindert nicht, dass das Ende vor dem Start liegt. Die Backend-Validierung deckt diesen Formularfehler nicht zuverlässig als benutzerfreundliche Feldmeldung ab. | Enddatum im UI validieren und Speichern bei ungültigem Bereich deaktivieren bzw. eine deutsche Fehlermeldung anzeigen. |

### dead-code
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| – | – | Kein relevanter Dead-Code im geprüften Scope festgestellt. | – |

### refactor
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| – | – | Kein notwendiger Refactor für die Fehlerbehebung priorisiert. | – |

### todo
| Sev | Ort | Marker | Notiz |
|-----|-----|--------|-------|
| – | – | – | Keine relevanten Marker im geprüften Scope. | – |

### missing-impl
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| – | – | – | Keine fehlende Implementierung für den ursprünglichen PATCH-Fehler. | – |

### missing-error
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟠 | `backend/planner/api/meal_plan.py:506-512` | Nullable Datumswerte können ungefangene Exceptions auslösen. | Eingaben vor Zeitzonenoperationen validieren und strukturierte API-Fehler zurückgeben. |

### risk
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| 🟠 | `frontend-food/src/api/mealPlans.ts:205-208`, `frontend-food/src/api/groupMembers.ts:92-142` | Veraltete Kochplan-/Vorschlagsdaten können nach einer Portionsänderung falsche Mengen anzeigen. | Alle von `norm_portions` abhängigen Query-Keys invalidieren oder zentral über einen MealPlan-Invalidierungshelper bündeln. |

### bad-practice
| Sev | Ort | Problem | Fix |
|-----|-----|---------|-----|
| – | – | Keine neue relevante Regelverletzung im geprüften Scope. | – |

### layout-inconsistency
| Sev | Ort | Abweichung | Soll-Komponente/Pattern |
|-----|-----|------------|------------------------|
| – | – | Nicht Gegenstand dieser fokussierten Prüfung. | – |

### wrong-logic
| Sev | Ort | Ist-Verhalten | Warum falsch | Soll-Verhalten |
|-----|-----|---------------|--------------|----------------|
| 🟠 | `backend/planner/api/meal_plan.py:2845-2866` | Jeder Sync hängt neue Kopien an bestehende synchronisierte Mitglieder an. | Der Sync ist dadurch nicht idempotent und bildet den aktuellen Event-Teilnehmerstand nicht ab. | Zweiter Sync mit unveränderten Teilnehmern muss denselben GroupMember-Bestand liefern. |

### missing-tests
| Sev | Ort (Funktion) | Risiko bei Fehler | Test-Vorschlag |
|-----|----------------|------------------|----------------|
| 🟡 | `MealPlan.recalculate_norm_portions()` ohne GroupMembers | Der manuelle Wert kann beim Reset verloren gehen. | Manual `12` setzen, Override deaktivieren, keine GroupMembers: Wert/Fallback prüfen. |
| 🟡 | `sync_event_participants()` | Wiederholte Synchronisierung kann unbemerkt Teilnehmer duplizieren. | Zwei Sync-Aufrufe mit denselben und anschließend geänderten Participants. |
| 🟡 | `useUpdateMealPlan()` PATCH-Helper | Der bestehende Response-Test umgeht den eigentlichen Helper. | `fetch` mocken, Mutation ausführen und einmaliges `response.json()` plus Query-Invalidierung prüfen. |

### missing-integration-tests
| Sev | Endpoint / Flow | Risiko bei Fehler | Test-Vorschlag |
|-----|-----------------|------------------|----------------|
| 🟡 | `PATCH /api/meal-plans/{id}/` mit `end_datetime: null` | Settings-Speichern kann mit Serverfehler abbrechen. | API-Integrationstest für nullable Datumsfelder und ungültige Bereiche. |
| 🟡 | SettingsPanel → PATCH → CookingSchedule/Suggestions | Nutzer sehen nach einer Portionsänderung alte Mengen bzw. Vorschläge. | QueryClient-Test mit aktiven abgeleiteten Queries und erwarteter Invalidierung. |

## OpenSpec — letzte 10 Specs

| Spec / Change | Zusammenfassung | Implementierungs-Status | Lücken |
|---------------|-----------------|-------------------------|--------|
| `manual-norm-portions-override` | Behebt den doppelten PATCH-Body-Zugriff und ergänzt manuelle Normportionen für Event-Pläne. | Partial | Reset ohne Mitglieder, idempotenter Event-Sync, nullable Datumswerte und abgeleitete Query-Invalidierung fehlen. |
| `meal-plan` Delta | Automatische Normportionen und PAL-Berechnung sollen bei aktivem Override ausgesetzt werden. | Partial | Standalone-PAL-Speichern kann den direkten Wert verändern. |
| `meal-plan-group-members` | Definiert GroupMember-CRUD, automatische Berechnung und Event-Synchronisierung. | Partial | Event-Sync ist nicht idempotent; vorhandene Synchronisierungsmitglieder werden nicht ersetzt. |

## Sichere Auto-Fixes (Vorschlag)
- [ ] Keine sicheren Auto-Fixes vorgeschlagen; alle offenen Punkte ändern Verhalten, Daten oder API-Verträge.

## Manuelle Fixes (nur mit Freigabe)
- 🟠 Manual-Override-Fallback beim Reset korrigieren und testen.
- 🟠 Event-Teilnehmer-Sync idempotent machen und testen.
- 🟠 Nullable/ungültige Datumsbereiche server- und frontendseitig validieren.
- 🟠 Standalone-Normportionen bei PAL-Änderungen schützen.
- 🟠 Lokale Zeitzonen-Konvertierung für `datetime-local` korrigieren.
- 🟠 Kochplan- und Vorschlags-Queries nach relevanten Mutationen invalidieren.
- 🟡 `norm_portions_manual: null` ablehnen und den tatsächlichen PATCH-Helper testen.
