## 1. Backend: content App

- [x] 1.1 Umlaute in `backend/content/admin.py` korrigieren (7 Vorkommen: "Ausgewaehlte" → "Ausgewählte", etc.)
- [x] 1.2 Umlaute in `backend/content/services/ai_service.py` korrigieren (~15 Vorkommen: AI-Prompts mit Umlauten)
- [x] 1.3 Umlaute in `backend/content/services/ai_supply_service.py` korrigieren (~10 Vorkommen: AI-Prompts)
- [x] 1.4 Umlaute in `backend/content/services/approval_service.py` korrigieren (5 Vorkommen: Fehlermeldungen)
- [x] 1.5 Umlaute in `backend/content/services/email_service.py` korrigieren (2 Vorkommen: "veroeffentlicht")
- [x] 1.6 Umlaute in `backend/content/api/content_links.py` korrigieren (4 Vorkommen: "Ungueltig", "Verknuepfung")
- [x] 1.7 Umlaute in `backend/content/api/featured.py` korrigieren (1 Vorkommen: "Ungueltig")
- [x] 1.8 Umlaute in `backend/content/api/admin.py` korrigieren (1 Vorkommen: "Ungueltige")
- [x] 1.9 Umlaute in `backend/content/schemas/ai.py` korrigieren (1 Vorkommen: Default-Wert "Stueck" → "Stück")

## 2. Backend: event App

- [x] 2.1 Umlaute in `backend/event/api/day_slots.py` korrigieren (2 Vorkommen: "Ungueltig")
- [x] 2.2 Umlaute in `backend/event/api/participants.py` korrigieren (1 Vorkommen: "geaendert")
- [x] 2.3 Umlaute in `backend/event/services/export.py` korrigieren (1 Vorkommen: "Ernaehrungstags")
- [x] 2.4 Umlaute in `backend/event/models/day_slots.py` korrigieren (1 Vorkommen: verbose_name_plural "Eintraege")

## 3. Backend: game, blog, recipe, packinglist Apps

- [x] 3.1 Umlaute in `backend/game/choices.py` korrigieren (1 Vorkommen: "Gelaendespiel")
- [x] 3.2 Umlaute in `backend/game/api.py` korrigieren (1 Vorkommen: "duerfen loeschen")
- [x] 3.3 Umlaute in `backend/blog/api.py` korrigieren (1 Vorkommen: "duerfen loeschen")
- [x] 3.4 Umlaute in `backend/recipe/api/nutrition.py` korrigieren (1 Vorkommen: "Stueck")
- [x] 3.5 Umlaute in `backend/packinglist/api.py` korrigieren (2 Vorkommen: "Ungueltig", "Ausruestungstyp")
- [x] 3.6 Umlaute in `backend/packinglist/models.py` korrigieren (1 Vorkommen: Docstring "Ausruestung")

## 4. Django Migrations

- [x] 4.1 `uv run python manage.py makemigrations` ausführen für geänderte verbose_name und Choice-Werte
- [x] 4.2 `uv run python manage.py migrate` ausführen

## 5. Backend Tests anpassen

- [x] 5.1 Umlaute in `backend/content/tests/test_approval.py` korrigieren (2 Vorkommen: "Entwuerfe", "veroeffentlicht")
- [x] 5.2 Umlaute in `backend/content/tests/test_linking_service.py` korrigieren (1 Vorkommen: "Gelaendespiel")
- [x] 5.3 Umlaute in `backend/content/tests/test_api.py` korrigieren (1 Vorkommen: "Gelaendespiel")
- [x] 5.4 Umlaute in `backend/event/tests/test_phase3.py` korrigieren (1 Vorkommen: "Persoenliche")
- [x] 5.5 Umlaute in `backend/event/tests/test_phase2.py` korrigieren (2 Vorkommen: "Groesse")
- [x] 5.6 Umlaute in `backend/game/tests/test_api.py` korrigieren (3 Vorkommen: "Gelaendespiel", "Voelkerball")
- [x] 5.7 `uv run pytest` ausführen und sicherstellen, dass alle Tests bestehen

## 6. OpenSpec-Dokumentation

- [x] 6.1 Umlaute in `openspec/specs/best-practices/spec.md` korrigieren
- [x] 6.2 Umlaute in `openspec/specs/error-handling/spec.md` korrigieren
- [x] 6.3 Umlaute in `openspec/specs/auth-session/spec.md` korrigieren
- [x] 6.4 Umlaute in `openspec/specs/user-profiles/spec.md` korrigieren
- [x] 6.5 Umlaute in `openspec/specs/group-management/spec.md` korrigieren
- [x] 6.6 Umlaute in `openspec/specs/session-planner/spec.md` korrigieren
- [x] 6.7 Umlaute in `openspec/specs/planner/spec.md` korrigieren
- [x] 6.8 Umlaute in `openspec/specs/seo-analytics/spec.md` korrigieren
- [x] 6.9 Umlaute in `openspec/specs/idea-creation-flow/spec.md` korrigieren
- [x] 6.10 Umlaute in `openspec/specs/infrastructure/spec.md` korrigieren
- [x] 6.11 Umlaute in `openspec/components.md` korrigieren

## 7. OpenSpec Archivierte Changes

- [x] 7.1 Umlaute in `openspec/changes/archive/2026-04-06-improved-idea-creation/` korrigieren (proposal.md, design.md, tasks.md, specs/)
- [x] 7.2 Umlaute in `openspec/changes/archive/2026-04-06-event-organizer-dashboard/design.md` korrigieren

## 8. AGENTS.md-Dateien

- [x] 8.1 Umlaute in `AGENTS.md` (Root) korrigieren
- [x] 8.2 Umlaute in `backend/AGENTS.md` korrigieren
- [x] 8.3 Umlaute in `frontend/AGENTS.md` korrigieren

## 9. Abschluss

- [x] 9.1 Finaler Durchlauf: `uv run pytest` bestätigen, dass alle Tests bestehen
- [x] 9.2 Prüfen, dass keine ae/oe/ue-Vorkommen in deutschen Strings übrig geblieben sind
