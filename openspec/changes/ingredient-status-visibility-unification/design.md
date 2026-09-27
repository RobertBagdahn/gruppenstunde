## Context

Geprüfter Ist-Zustand (lokale DB = Prod-Export, Code-Stand `fix/recipe-creation-integrity`):

- **Status:** `backend/supply/choices.py:34` definiert `draft`, `verified`, `user_content`. Der Code liest zusätzlich `approved`:
  - `backend/content/services/food_access.py:93` (`can_read`), `:182/225/250/259` (Recipe- und Ingredient-Querysets, getrennt, aber gleich aufgebaut)
  - `backend/supply/api/ingredients.py:154–177` (`_can_edit_ingredient`, `_can_edit_portions`), `:201–280` (tote Frühstücks-Helfer)
- **Daten:** 5647 `draft`, 243 `verified`, 5 `approved` (alle ungenutzt, `created_by=None`, angelegt per Skript/Test; „Lauch“ #7843 ist Testmüll mit 339 kcal und Dublette von #9), 0 `user_content`. 469 System-Entwürfe stecken in freigegebenen Rezepten (35 ohne kcal, 7 ohne Preis, 0 ohne Abteilung).
- **Anlegen:** `POST /api/ingredients/` setzt `status="draft"`, `created_by` und `owner=request.user`, auch für Staff (`supply/api/ingredients.py:494–499`). Fünf weitere Erzeugungspfade setzen **kein** `created_by`: `recipe/api/recipes.py:775`, `recipe/api/items.py:726`, `recipe/services/ai_ingredients_service.py:302`, `recipe/services/url_import_service.py:377, 1183`. Deren Zutaten sind für den Ersteller in der Suche unsichtbar, und der nächste Import legt eine Dublette an.
- **Matcher:** `recipe/services/ingredient_matcher.py:397, 486, 585` sucht in `Ingredient.objects` ohne Sichtbarkeitsfilter (private Zutaten anderer Nutzer sind Kandidaten).
- **Sichtbarkeit:**
  - `can_read` erlaubt `visibility="public"` in jedem Status, das Queryset nur mit `approved`.
  - `Ingredient.visibility` kennt nur `private`/`shared` (`supply/models/ingredient.py:225`); das Ausgabe-Schema erlaubt `private|shared|public|group` (`supply/schemas/ingredients.py:263`).
  - Transitive Lesesicht (`content/services/transitive_visibility.py:48`) gilt nur für eigene Rezepte bzw. geteilte Pläne, nicht für öffentliche Rezepte.
- **Ausnahme Essenspläne:** `planner/api/meal_plan.py:987–1163` nutzt `allow_system_draft=True` (7 Stellen).
- **Update:** `supply/api/ingredients.py:555` blockiert für Nicht-Staff nur `status="verified"`.
- **Audit:** `ChangeAuditLog` (`content/models/audit.py`) loggt Feldänderungen per Signal nur bei `save()`.
- **Frontend:**
  - `IngredientEditPage.tsx:284` sendet den Status nur für Staff (per `user.is_staff`); `IngredientDetailPage.tsx:1341` zeigt „Verifizieren“ per `user.is_staff`. Das widerspricht `frontend-food/AGENTS.md` („Permissions ausschließlich aus can_edit/can_delete der API“).
  - Die Status-Optionen stehen dreimal im Code, inklusive `approved` in `CreateIngredientPage.tsx:50` (wird vom Backend ignoriert).

## Goals / Non-Goals

**Goals:**
- Ein Status-Modell (`draft`, `verified`) in DB, Pydantic und Zod.
- Ein Sichtbarkeitsmodell, identisch für `can_read` und Queryset, mit genau zwei dokumentierten Ausnahmen (Plan-Referenz, Matcher).
- Verifizieren nur durch Staff; verifizierte Nutzer-Zutaten werden öffentlich.
- Ersteller wird auf allen Erzeugungspfaden gesetzt (stoppt neue Dubletten).
- Keine private Zutat eines anderen Nutzers als Matcher-Kandidat.
- Befehl zum Verifizieren der 469 Zutaten nach Trockenlauf.

**Non-Goals:**
- Recipe-Status und Recipe-Sichtbarkeit bleiben unverändert (außer dem Entfernen toter Helfer).
- Datenlücken füllen, Dubletten und Testdaten bereinigen: eigene Pakete.
- Transitive Sicht über öffentliche Rezepte: entfällt, weil die betroffenen Zutaten verifiziert werden.

## Decisions

1. **Status `draft`/`verified`.** `IngredientStatusChoices` reduziert; `CheckConstraint(status__in=[…], name="ingredient_status_valid")`. Pydantic `Literal["draft", "verified"]`; Zod `IngredientStatusSchema = z.enum(['draft', 'verified'])`.

2. **Migration ohne Löschen:** `approved` → `draft`, `user_content` → `draft`. Die Altzeilen sind ungeprüft (fehlende Preise, falsche Nährwerte), daher `draft` statt `verified`. Löschungen per Name wären auf Prod nicht sicher reproduzierbar und gehören ins Testdaten-Paket. Reihenfolge in einer Migrationsdatei: `AlterField` (Choices), `RunPython`, `AddConstraint` ×2. Reverse: Constraints entfernen und `public` → `private` setzen; die Statusüberführung bleibt (Altwerte sind fachlich ungültig).

3. **Visibility `public`:** Choice `("public", "Öffentlich")` ergänzen; `CheckConstraint(~Q(visibility="public") | Q(status="verified"), name="ingredient_public_requires_verified")`. Eingabeschemas (`IngredientCreateIn`, `IngredientUpdateIn`, `VisibilityIn`) bleiben `Literal["private", "shared"]`, damit `public` nur über das Verifizieren entsteht. Das Ausgabeschema wird auf `Literal["private", "shared", "public"]` korrigiert (`group` existiert im Model nicht).

4. **Verifizieren als Service.** `supply/services/ingredient_status.py`:
   - `set_ingredient_status(ingredient, status, *, actor)` prüft, dass `actor` Staff ist, oder akzeptiert `actor=SYSTEM` (nur für Management-Befehle), und setzt Status und abhängige Visibility (`verified` + Owner → `public`; `draft` + `public` → `private`).
   - Speichert per `save(update_fields=[...])`, damit das Audit-Log greift.
   - Genutzt vom `PATCH`-Endpunkt und vom Verifizierungs-Befehl.
   - Alternative „Logik im Endpunkt“ verworfen: Der Befehl bräuchte dieselbe Regel.

5. **Eine Sichtbarkeitsregel.** In `food_access` gibt es ein gemeinsames Prädikat für Zutaten, `_ingredient_public_q()` = `Q(owner=None, status="verified") | Q(visibility="public", status="verified")`, und das Objekt-Pendant `_ingredient_is_public(ing)`. `can_read` nutzt für Zutaten dieses Pendant statt des generischen `visibility == "public"`-Zweigs; Rezepte behalten ihre Regel. Ein Test prüft Gleichheit von `can_read` und Queryset über eine Matrix (anonym, Creator, Owner, Fremder, Staff × draft/verified × private/shared/public).

6. **Bearbeitungsrecht zusammenführen.** `_can_edit_ingredient` und `_can_edit_portions` werden zu einem Aufruf von `food_access.can_edit`:
   - verified → nur Staff (existiert bereits in `can_edit:115`)
   - sonst Owner, Creator, Editor-Collaborators, Gruppen-Admins
   Die Sonderregel „approved-System-Zutat → jeder Angemeldete“ entfällt; keine Spec verlangt sie (`food-access-policy` fordert Bearbeitungsrecht für Portion, Package und Alias).

7. **`can_verify` statt `is_staff` im Frontend.** `IngredientOut.can_verify: bool` (= Staff). Das Frontend blendet Status-Auswahl und „Verifizieren“ nur danach ein.

8. **Erzeugungspfade:** alle neun Stellen (fünf ohne `created_by`, vier mit `user_content`) nutzen `IngredientStatusChoices.DRAFT` und `created_by=request.user`/`user`. Pfade ohne Request erhalten den Nutzer als Parameter; bei Management-Befehlen `None`.

9. **Matcher-Kandidaten:** `ingredient_matcher` bekommt einen `user`-Parameter und nutzt `matchable_ingredient_queryset(user)` aus `food_access` = `visible_ingredient_queryset(user) | Ingredient.objects.filter(owner=None, status="draft")`. Das gilt für die Namens-, Alias-, Embedding- und Listen-Pfade (Zeilen 259, 266, 397, 486, 585). Aufrufer reichen den Nutzer durch; ohne Nutzer (Befehle) gilt nur der System-Katalog (verified + System-Entwürfe).

10. **Plan-Ausnahme bleibt:** `allow_system_draft` unverändert, jetzt als Spec-Regel „Ingredient reference exceptions“.

11. **Entfernen:** Debug-Endpunkt (`supply/api/breakfast_catalog.py:21`); die vier toten Helfer; zugehörige Tests in `supply/tests/test_breakfast_wizard_visibility.py` (Katalog-Tests bleiben).

12. **Verifizierungs-Befehl:** `supply/management/commands/verify_ingredients_in_approved_recipes.py`:
   - Trockenlauf standardmäßig, `--apply`, `--csv <pfad>`.
   - Nutzt `set_ingredient_status(..., actor=SYSTEM)` je Zutat (Audit-Log mit `changed_by=NULL`).
   - Idempotent.

## Risks / Trade-offs

- [469 Zutaten werden mit 35 fehlenden kcal-Werten und 7 fehlenden Preisen verifiziert] → Die Lückenliste wird vor `--apply` gezeigt (Nutzerentscheidung: trotzdem verifizieren). Die Lücken füllt das Datenpaket.
- [Owner verliert Bearbeitungsrecht nach Verifizierung] → gewollt (verifiziert = geprüft); Staff kann zurück auf Entwurf setzen.
- [Nicht-Staff kann Portionen von 5 Ex-approved-Zutaten nicht mehr ergänzen] → betrifft nur ungenutzte Zeilen; die Tests werden fachlich angepasst.
- [Matcher findet für Nicht-Staff weniger Kandidaten, wenn fremde private Zutaten entfallen] → gewollt (Datenschutz); System-Entwürfe bleiben Kandidaten, sodass keine Dubletten entstehen.
- [30 Test-Anlagen mit `approved`/`user_content` in 16 Dateien] → Tests mit reinem Anlage-Wert auf `verified` bzw. `draft` umstellen; Tests, die die Mitmach-Regel prüfen (`supply/tests/test_api.py:363–430`, Aliase/Portionen durch `auth_client`), auf Owner-Entwürfe oder die neue 403-Erwartung umstellen.
- [Prod enthält Werte, die lokal fehlen] → `RunPython` überführt jeden Wert ≠ `verified` generisch auf `draft`, nicht nur die bekannten.

## Migration Plan

1. Migration lokal und in CI: Choices, Daten, Constraints.
2. Deploy.
3. Prod (nach Backup, Proxy-Freigabe): Befehl im Trockenlauf → Lückenliste zeigen → nach OK `--apply`.
4. Rollback: Code-Revert und Rück-Migration (Constraints entfernen). `draft`/`verified` und `public` bleiben lesbar; `public` müsste bei vollständigem Rollback auf `private` gesetzt werden (Reverse-`RunPython` enthält das).

## Open Questions

Keine; die Entscheidungen zu Status, Migration, Matcher, Plan-Ausnahme und Verifizierung liegen vor (Bericht Abschnitt 6 und Rückfragen vom 25.09.2026).
