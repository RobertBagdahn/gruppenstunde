## Context

Das Food-Frontend (`frontend-food/`) ist über mehrere Iterationen gewachsen. Dabei sind Backward-Compat Re-Exports, ungenutzte Hooks und duplizierte Helper-Funktionen entstanden. Im Backend existiert ein komplett ersetzter AI-Service als toter Code.

Betroffene Bereiche:
- `frontend-food/src/api/` — Fetch-Helper und ungenutzte Hooks
- `frontend-food/src/schemas/` — Re-Export-Dateien
- `frontend-food/src/pages/` — Verzeichnis-Fehlbenennung und Re-Exports
- `frontend-food/src/components/` — Ungenutzte Komponenten
- `frontend-food/src/lib/entityUrls.ts` — Over-Engineering
- `backend/supply/services/ingredient_ai_service.py` — Toter Service
- `backend/core/management/commands/seed_all.py` — Stale Referenz

## Goals / Non-Goals

**Goals:**
- Entfernung aller identifizierten toten Code-Pfade
- Konsolidierung der Fetch-Helper auf eine einzige Implementierung (`@/lib/api`)
- Konsistente Import-Pfade (keine Re-Export-Indirektionen)
- Korrektes Verzeichnis-Layout (`pages/ingredients/` statt `pages/supplies/`)

**Non-Goals:**
- Refactoring der Store-Skalierungslogik (größerer Scope, eigener Change)
- Neue Features oder API-Änderungen
- Änderungen an Pydantic/Zod Schemas
- Datenbank-Migrationen

## Decisions

### 1. Re-Exports löschen statt umleiten

Consumer werden direkt auf die Quell-Module umgestellt. Keine Deprecation-Phase nötig (keine Rückwärtskompatibilität erforderlich).

### 2. `api/tags.ts` auf `@/lib/api` umstellen

Statt eigene `fetchJson`-Implementierung beizubehalten, wird `api/tags.ts` die bestehenden Utilities aus `@/lib/api` nutzen. Das stellt CSRF-Token-Handling und konsistentes Error-Handling sicher.

### 3. `entityUrls.ts` reduzieren statt löschen

Die Datei wird auf die im Food-Frontend tatsächlich genutzten Entity-Typen (Recipe, Ingredient) beschränkt, nicht komplett entfernt — sie wird von `EntityLink.tsx` genutzt.

### 4. `pages/supplies/IngredientDetailPage.tsx` verschieben

Die Datei wird nach `pages/ingredients/IngredientDetailPage.tsx` verschoben. Der alte Re-Export in `pages/ingredients/` wird durch den tatsächlichen Code ersetzt. Route in `App.tsx` wird angepasst.

## Risks / Trade-offs

- **[Übersehene Imports]** → Vor jeder Löschung grep über das gesamte Projekt laufen lassen. TypeScript-Build als Verifizierung.
- **[CSRF-Bug in tags.ts]** → Beim Umstellen auf `@/lib/api` wird das CSRF-Handling automatisch korrekt. Kein Risiko.
- **[seed_all.py HealthRule-Fix]** → Referenz entfernen oder auf neues `Rule`-Model umstellen, je nach Seed-Logik.

## API-Endpunkt-Änderungen

Keine. Alle Änderungen sind rein intern (Code-Organisation).

## Datenbank-Migrationen

Keine erforderlich.
