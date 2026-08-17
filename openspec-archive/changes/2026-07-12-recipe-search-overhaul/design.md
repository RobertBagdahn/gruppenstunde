# Design: Recipe Search Overhaul

## Context

Die aktuelle Rezeptsuche unter `/recipes` hat folgende Probleme:
- Default `origin="all"` zeigt alle sichtbaren Rezepte, nicht nur verifizierte
- Inkonsistente Filter-UI: Radio-Buttons (Rezeptart, Herkunft, Schwierigkeit, Dauer) vs. Checkboxen (Stufe), Min/Max-Range (Kosten)
- Filter-Überschriften wie "Herkunft" sind unklar
- Kein definierter Verifizierungs-Workflow für Staff-User mit Rule-Check
- Sortierung default ist `newest`, nicht nutzungsbasiert
- Keine Tabellenansicht, kein View-Toggle
- Keine sticky Sidebar, kein Flatlist auf Mobile

**Constraints**:
- Das `Recipe`-Model hat bereits `usage_count` (denormalisiert), `status` (draft/submitted/approved/rejected/archived), `owner` (null = system-verifiziert)
- Das `ApprovalLog`-Modell existiert bereits in `content/models/approval.py`
- Das Rule-Modell (`recipe/models/rule.py`) hat `is_active` für aktive Rules
- Keine neuen DB-Felder nötig — alle Backend-Änderungen sind Query-/Schema-Änderungen

## Goals / Non-Goals

**Goals:**
- Default "nur verifizierte Rezepte" mit Multi-Select `Anzeigen`-Filter
- Einheitliche Checkbox-UI für alle Filtergruppen
- Staff-Verification-Workflow mit Rule-Check und Warning-Dialog
- Tabellenansicht als Alternative zum Kachel-Grid
- Sortierung default nach `usage_count`
- Dynamischer Seitentitel, sticky Sidebar, Bottom-Sheet auf Mobile

**Non-Goals:**
- Faceted Count (Ergebnisanzahl neben Checkboxen) — Folgeprojekt
- Gespeicherte Filter-Presets — Folgeprojekt
- Rezept-Vergleichsfunktion — Folgeprojekt
- Teilen-Funktion für gefilterte Suche — Folgeprojekt
- Index-Änderungen (bestehende DB-Indices sind ausreichend)

## Decisions

### 1. Multi-Value-Filter im Backend via `Query`-List-Parameter

**Entscheidung**: Alle bisherigen Single-Value-Filter (`difficulty`, `execution_time`, `recipe_type`, `preparation_method`, `origin`) werden auf `list[str]` geändert und mittels Django `__in`-Lookup verknüpft.

**Alternativen**:
- A) Custom Query-Parser mit Komma-getrennten Werten: umständlich, nicht RESTful
- B) JSON-Body mit POST: nicht idempotent, schlecht für GET-Requests

**Begründung**: Django Ninja's `Query` unterstützt `list[str]` nativ via `?param=val1&param=val2`. Die `filter(__in=...)`-Verknüpfung ist die natürliche OR-Semantik für Mehrfachauswahl.

### 2. Kosten-Filter als Predefined Ranges

**Entscheidung**: Frontend sendet Preisstufen als `costs_min`/`costs_max`-Parameter. Die Konvertierung findet im Frontend statt:
- `< 2€` → `costs_max=2`
- `2-5€` → `costs_min=2&costs_max=5`
- `5-10€` → `costs_min=5&costs_max=10`
- `> 10€` → `costs_min=10`

**Alternativen**:
- A) Neuer Backend-Parameter `cost_range`: erfordert Backend-Änderung, keine Vorteile
- B) Range-Slider: komplexer UI, schlechter auf Mobile

**Begründung**: Die `costs_min`/`costs_max`-Parameter existieren bereits. Die Konvertierung im Frontend ist einfach und vermeidet neue Backend-Logik.

### 3. Verification-Check als separater Service

**Entscheidung**: `recipe/services/verification_service.py` mit `check_verification_readiness(recipe) -> VerificationResult`. Der Service:
1. Prüft Pflichtfelder: `image`, `description` (nicht leer), `recipe_items` (Count > 0), `steps` (Count > 0)
2. Prüft alle aktiven `Rule`-Objekte via bestehendem Rule-Evaluations-Code
3. Gibt strukturierte `VerificationResult` zurück: `{ can_verify, rules_passed, rules_total, warnings }`

**Alternativen**:
- A) Direkt im API-Endpoint: vermischt Business-Logik mit HTTP-Layer
- B) Im Admin-Mixin: nur im Django-Admin nutzbar, kein API-Zugriff

**Begründung**: Service-Layer erlaubt Wiederverwendung (API + ggf. Admin) und Testbarkeit. Der `ApprovalLog` wird wie bisher via `ContentApprovalMixin.create_approval_log()` geschrieben.

### 4. Verification-Endpoints unter dem Recipe-Router

**Entscheidung**: `POST /api/recipes/{id}/verify/` und `GET /api/recipes/{id}/verification-status/` werden im existierenden `recipe_router` registriert.

**Alternativen**:
- A) Separater Router `/api/recipes/verify/`: trennt Concerns, aber inkonsistent mit REST-Konvention (Resource-Subpfad)
- B) Via `PATCH /api/recipes/{id}/` mit `status=approved` und erweiterter Logik: bestehender Endpoint, aber vermischt Update mit Workflow

**Begründung**: Sub-Ressource unter `/{id}/verify/` folgt REST-Konventionen. Der bestehende `PATCH`-Endpoint bleibt für Staff-Status-Änderungen erhalten, aber der Verify-Workflow ist ein expliziter, eigenständiger Prozess.

### 5. Tabellenansicht als Komponente neben Kachel-Grid

**Entscheidung**: `RecipeTable`-Komponente rendert eine Tabelle mit Spalten: Bild (48px), Titel (verlinkt), Dauer, Schwierigkeit, Likes (mit Herz-Icon), Kosten. Der View-Toggle (`localStorage`-Persistenz) schaltet zwischen `<RecipeTable>` und dem bestehenden `<div className="grid ...">`.

**Alternativen**:
- A) CSS-only via `grid` vs. `table` display: zu unflexibel für unterschiedliche Datenstrukturen
- B) Virtuelle Tabelle (z.B. TanStack Table): over-engineered für paginierte Ergebnisse

**Begründung**: Eine naive HTML-Tabelle mit Tailwind-Styling ist performant genug für 20 Items. Keine neue Dependency nötig.

### 6. Bottom-Sheet-Drawer auf Mobile

**Entscheidung**: Eine neue `FilterBottomSheet`-Komponente verwendet einen shadcn/ui `Sheet`-Wrapper (Radix `Dialog`), der von unten einfliegt. Desktop behält die sticky Sidebar.

**Alternativen**:
- A) shadcn/ui Sheet von rechts: auf Mobile unnatürlich, blockiert Back-Geste
- B) Modaler Dialog: verdeckt Ergebnisse komplett, Nutzer sieht Vorschau nicht

**Begründung**: Bottom-Sheet ist die mobile-native Pattern (iOS/Android). shadcn/ui's `Sheet`-Komponente mit `side="bottom"` ist bereits verfügbar.

### 7. Skeleton-Layout exakt passend zum Ziel-Layout

**Entscheidung**: `RecipeCardSkeleton` und `RecipeTableSkeleton` rendern das exakte Layout-Gerüst ohne Daten. Beim View-Wechsel während des Ladens wird der Skeleton-Typ mitgewechselt.

**Begründung**: Vermeidet CLS, verbessert wahrgenommene Performance. Die Skeletons verwenden die gleichen Tailwind-Klassen wie die echten Komponenten (Breite, Höhe, Abstände).

## Risks / Trade-offs

**[Risk] use_count-Sort auf null-Werten** → Viele Rezepte haben `usage_count=0`, was die Sortierung weniger differenzierend macht.
**Mitigation**: Sekundäre Sortierung nach `-created_at` für Rezepte mit gleichem `usage_count`. Bei 0 wird immer nach Erstellungsdatum sortiert.

**[Risk] Multi-Value-Filter auf großen Datasets** → `filter(field__in=[...])` erzeugt WHERE IN, was bei vielen Werten ineffizient werden kann.
**Mitigation**: Die Anzahl der möglichen Werte ist begrenzt (max ~8 Rezeptarten, 4 Schwierigkeiten, 4 Dauern, 5 Zubereitungsarten). Keine Performance-Bedenken.

**[Risk] Verification-Service ruft Rule-Evaluation ab** → Rules evaluieren Nährwerte; wenn `recalculate_recipe_cache` nicht aktuell ist, sind Rule-Ergebnisse falsch.
**Mitigation**: Verification-Service triggert automatisch `recalculate_recipe_cache()` vor der Rule-Evaluation, falls `cached_at` null oder älter als die letzte Item-Änderung ist.

**[Risk] Bottom-Sheet + URL-State-Sync** → Filter-Änderungen im Bottom-Sheet müssen den URL-State synchronisieren, aber nicht bei jedem Checkbox-Klick (flackern).
**Mitigation**: Filter-Änderungen im Bottom-Sheet aktualisieren einen lokalen State. Erst bei "Anwenden" wird der URL-State gesetzt und die API neu geladen.

**[Risk] localStorage für View-Toggle ist nicht SSR-kompatibel** → localStorage existiert nur im Browser.
**Mitigation**: Der Default ist Grid-View. localStorage wird nur client-seitig gelesen (useEffect). Kein SSR nötig (SPA).

## Migration Plan

1. **Backend-Änderungen deployen** (keine DB-Migration nötig):
   - `RecipeFilterIn` erweitern (Multi-Value, `sort` default)
   - `list_recipes` anpassen (default origin, use_count sort, multi-value filter)
   - Neue Endpoints `verify/` und `verification-status/`
   
2. **Frontend-Änderungen deployen** (keine API-Breaking-Changes):
   - `RecipeFilterSidebar` neugestalten
   - `RecipeListPage` für Tabelle/Sticky/Title erweitern
   - Neue Komponenten hinzufügen
   - Schemas synchronisieren

3. **Rollback**: Einfacher Re-Deploy der vorherigen Version. Keine Datenmigration nötig.

## Open Questions

- Keine — alle Entscheidungen wurden in der Explore-Phase geklärt.
