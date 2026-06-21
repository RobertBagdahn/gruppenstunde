## Context

Die Rezept-Detailseite ist die komplexeste Seite im Food-Frontend (`RecipeDetailPage.tsx`, 1143 Zeilen). Ein Audit der gesamten Rezept-Logik (Backend + Frontend) hat 19 Findings ergeben, darunter mehrere kritische Laufzeit-Bugs. Gleichzeitig wurde die bestehende Spec `recipe-detail-reorganized` nur teilweise umgesetzt, und das Layout ist optisch uneinheitlich.

Drei Findings betreffen direkt das geplante Redesign:
- Das `RecipeTypeStats`-Model wurde per Migration `0037` gelöscht; abhängiger Code referenziert es noch (toter Code). Die geplanten Histogramme bauen genau darauf auf — das Model muss neu aufgesetzt werden.
- Die Embedding-Aktualisierung ist kaputt (`AttributeError` auf `instance.tracker`), wodurch "Ähnliche Rezepte" veraltete Daten zeigt.
- Flächendeckend hartcodierte Farben verletzen das Design-System (`frontend-food/AGENTS.md`).

Constraints: keine Rückwärtskompatibilität nötig, Mobile-First (320px), Pydantic↔Zod synchron, ausschließlich semantische Tailwind-Token, Python via `uv run`.

## Goals / Non-Goals

**Goals:**
- Alle 19 Audit-Findings beheben (kritisch → niedrig).
- Einheitliches, modernes, informatives Layout mit Wiedererkennungswert und vielen internen Links.
- Metadaten in reichhaltige Sidebar, Inhalte im Hauptstrang.
- Echte Histogramme (Preis/Kalorien/Protein) mit neutraler Perzentil-Position, ab ≥10 Rezepten.
- Zwei-spaltige Portion-Anzeige (pro Portion / gesamt n Portionen), DB bleibt pro-1-Portion.
- Zusatz-Sektionen: Nährwert-Big-Table mit DGE-%, Allergen-Ampel, verlinkte Kosten, "In X Essensplänen", Saisonalität, Versions-Hinweis, Sticky Mini-TOC.

**Non-Goals:**
- DGE-Dropdown (Alter/Geschlecht-Auswahl) — späterer Change.
- Anlass-Chips (#2), Gruppen-Skalierung (#6), Nährwert-Pie-Chart (#8) — bewusst ausgelassen.
- Vollständiger Rewrite von `RecipeDetailPage.tsx` — nur Umstrukturierung + Extraktion in Subkomponenten.
- Änderung der pro-1-Portion-Speicherstrategie.

## Decisions

### 1. RecipeTypeStats neu aufbauen statt live berechnen
Neues Model `RecipeTypeStats` mit gecachten Aggregaten **und** Histogramm-Buckets (JSONField-Arrays) je Metrik (price/energy/protein, jeweils per Portion). Aggregation in `type_stats_service.recalculate_type_stats(recipe_type)`, getriggert per Signal bei Recipe create/update/delete. Nur Rezepte mit `ContentStatus.APPROVED`, aktuelles Rezept exkludiert, Mindestanzahl 10.
- *Alternative (live berechnen)*: verworfen — bei wachsender Rezeptzahl zu langsam, jede Detailseiten-Ansicht würde Full-Table-Aggregation auslösen.
- *Buckets*: fixe Anzahl (z.B. 12) pro Metrik, Grenzen aus min/max abgeleitet. Frontend markiert die Bucket-Position des aktuellen Rezepts.

### 2. Portion-Architektur: DB pro-1-Portion, Frontend zwei Spalten
Backend behält `portions=1` (kein `data.pop`-Hack mehr nötig, da Frontend normalisiert). Frontend sendet beim Speichern ausschließlich pro-1-Portion-Mengen, kein `portions`-Feld im Payload. Anzeige: PortionScaler setzt `n`; Zutaten-/Nährwert-Tabellen zeigen zwei Spalten "pro Portion" und "gesamt (× n)".
- *Alternative (Backend akzeptiert portions)*: verworfen — würde Skalierungslogik in allen Konsumenten (Shopping, Planner, Cockpit) verkomplizieren.
- Der bisherige Silent-Data-Loss verschwindet, weil das irreführende Feld entfernt wird.

### 3. Sidebar-zentriertes Layout
`RecipeSidebar` wird zur reichhaltigen Metadaten-Karte (Typ-Badge oben, dann Kosten/Nutri-Score, Status, Autor-Link, Kategorie-Link, Zeiten, Schwierigkeit, Altersgruppe, Aufrufe/Likes, Datenqualität, Daten) + Aktions-Block (Kochen, Einkaufsliste, Portionen, Drucken, Teilen, Clonen). `RecipeMetaCard` geht darin auf. Header oben enthält nur Titel + kompakte Summary + Bearbeiten/Löschen. `ContentAuthorSection` entfällt.
- Mobile: Sidebar-Karte wandert über den Inhalt; Aktionen in der `RecipeMobileActionBar` (Overflow-Menü).

### 4. Subkomponenten-Extraktion
Neue Komponenten zur Entlastung von `RecipeDetailPage.tsx`: `NutritionBigTable`, `AllergenIndicator`, `SeasonalityBar`, `RecipeUsageInMealPlans`, `RecipeTOC`, `RecipeHistogram`. Histogramm ersetzt den simplen min→max-Balken in `RecipeCategoryBenchmark`.

### 5. Bugfix-Strategie pro Finding
- **Badge-Crash**: `BADGE_CONFIG.personal` ergänzen, Union-Type erweitern.
- **Sichtbarkeit**: Detail-Endpunkte über `_get_visible_recipes_qs(request)` → 404 statt Leak.
- **Embeddings**: `model_utils.FieldTracker` auf Recipe ergänzen ODER Vergleich über `update_fields` in `post_save`. Entscheidung: `update_fields`-Ansatz (kein neues Tracker-State auf jedem Model nötig).
- **Cache-Gewicht/Preis**: Berechnung in `recalculate_recipe_cache` exakt an `get_recipe_total_weight_g` angleichen (beide Portion-Zweige).
- **Cache-Invalidierung**: `invalidateRecipeData` Keys korrigieren (recipe-improvements, recipe-rules, recipe-comments, recipe-similar, recipe-type-stats).
- **PortionScaler**: vollständig kontrolliert (`value`/`onChange`), kein interner `useState`-Init.
- **Signal-Kaskade**: `dispatch_uid` setzen; `like_score` via `.filter().update()`.

### 6. "In X Essensplänen verwendet"
Reverse-Query über `MealItem.recipe` → distinct `MealPlan`. Neues read-only Feld/Endpoint, das nur für den aktuellen Nutzer sichtbare Pläne zählt/verlinkt (Permission-konform).

### 7. Allergen-Ampel & Saisonalität aus vorhandenen Daten
`NutritionalTag.is_dangerous` + `name`/`name_opposite` liefern "enthält Nüsse" / "nussfrei". `Ingredient.season_start/end` (Monatswerte) speisen die Jahres-Leiste. Keine neuen Datenmodelle nötig.

### 8. DGE-% in Nährwert-Big-Table
Statische `DGE_REFERENCE`-Tabelle (`supply/data/dge_reference.py`) liefert Referenzwerte; Standard-Referenzgruppe (z.B. 25 J., männlich) bis der DGE-Dropdown (Non-Goal) kommt.

## Risks / Trade-offs

- [Type-Stats-Neuaufbau bricht alte Migration-Historie] → Saubere Vorwärts-Migration; da keine Rückwärtskompatibilität nötig, kein Down-Path erforderlich.
- [Histogramm-Buckets bei wenigen Rezepten unschön] → Mindestanzahl 10 verhindert irreführende Charts; darunter wird kein Histogramm gerendert.
- [Embedding-Fix über update_fields könnte bei Saves ohne update_fields immer neu berechnen] → Embedding-Update in Thread + Guard auf relevante Felder; akzeptabler Overhead.
- [Sidebar mit vielen Metadaten wird auf Mobile lang] → Mobile: Sidebar-Karte kollabierbar/kompakt, Aktionen in Action-Bar.
- [Farb-Token-Migration ist breit gestreut] → systematisch pro Komponente, Abgleich mit `/styleguide`; Nutri-Score/Allergen-Datenfarben in zentrale Token-Map.
- [Zwei-Spalten-Anzeige auf 320px eng] → "gesamt"-Spalte nur ab sm-Breakpoint zweispaltig, darunter gestapelt.

## Migration Plan

1. Backend-Bugfixes ohne Layout-Abhängigkeit zuerst (Badge ist Frontend, aber Sichtbarkeit/Cache/Embeddings/IndentationError sofort deploybar).
2. `RecipeTypeStats`-Model + Migration + Service + Endpoint.
3. Initiale Befüllung: Management-Befehl/Signal-Trigger über alle `recipe_type`-Werte (`uv run python manage.py` recalculate).
4. Frontend: Schemas (Zod) synchron, dann Komponenten + Layout.
5. Tests: pytest für Service/Signals/Endpoints + Sichtbarkeit/Permission; `npm run build` im Food-Frontend.
6. Rollback: Feature-Flags nicht nötig (aktive Entwicklung); bei Problemen einzelne Komponenten zurückrollen.

## Open Questions

- Bucket-Anzahl final (Vorschlag 12) — kann in Implementierung justiert werden.
- Standard-DGE-Referenzgruppe für die %-Spalte (Vorschlag 25 J., männlich) bis Dropdown kommt.
