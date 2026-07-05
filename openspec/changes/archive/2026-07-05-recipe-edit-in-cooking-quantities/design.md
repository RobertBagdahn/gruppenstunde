## Context

Die Skalier-Bearbeitung lebt im `InlineIngredientEditor` (`frontend-food/src/components/recipe/InlineIngredientEditor.tsx`): Prop `displayPortions` skaliert beim Init alle Mengen hoch (`:128-141`) und teilt beim Speichern durch `scale` wieder herunter (`:609`, `:635`), `portions` wird auf 1 gezwungen (`:581-583`). Korrekt implementiert. Eingebunden in `RecipeDetailPage.tsx:774-793` mit `displayPortions={portionsMultiplier > 1 ? portionsMultiplier : undefined}` (`:779`). Problem: Der Bearbeiten-Button (`:760-768`) startet den Edit-Modus ohne `portionsMultiplier` zu setzen; Default ist 1 → `displayPortions = undefined` → `scale = 1`. Zusätzlich wird im Edit-Modus die Personenzahl gesperrt (`:666-667`) und der Portions-Kontext ausgeblendet (`:750`). `EditRecipePage.tsx` hat bewusst keine Mengen-Bearbeitung (Portions immer 1).

Backend speichert Rezepte immer auf 1 Portion (`Recipe.portions` Default 1; `RecipeItem.quantity` als Multiplikator). Die Normierung MUSS im Frontend passieren — und tut es bereits.

Constraints: UI-only, keine Backend-Änderung. Mobile-First. Keine `any`.

## Goals / Non-Goals

**Goals:**
- Auffindbarer Einstieg „Für X Personen bearbeiten".
- Personenzahl im Editor wählbar/änderbar, Mengen live skaliert.
- Beim Speichern Normierung auf 1 Portion (bestehende Logik nutzen).

**Non-Goals:**
- Keine Backend-/Schema-Änderung; Rezepte bleiben 1-Portion-normalisiert.
- Keine Wiedereinführung der Mengen-Bearbeitung in `EditRecipePage` (bleibt auf Detailseite).

## Decisions

### D1: Editor hält eigenen `editPortions`-State
Statt `displayPortions = portionsMultiplier > 1 ? … : undefined` hält der Editor (oder `RecipeDetailPage` für den Edit-Modus) einen eigenen `editPortions`-State, initialisiert mit der **aktuellen Anzeige-Personenzahl** (`portionsMultiplier`) der Detailseite, danach im Editor frei änderbar.

- **Warum**: entkoppelt Bearbeitung von der Anzeige-Skalierung, übernimmt aber den Kontext der Detailseite als Startwert; macht die Funktion immer verfügbar.

### D2: Sichtbarer Einstiegspunkt
Neben/als Teil des „Bearbeiten"-Einstiegs gibt es eine sichtbare Option „Für mehrere Personen bearbeiten" mit Personenzahl-Auswahl, die den Editor mit gewähltem `editPortions` öffnet.

### D3: Personenzahl im Editor änderbar
Der Editor erhält einen Personenzahl-Selector (Wiederverwendung `PortionScaler`-Muster), der `scale` live ändert und Mengen neu hochrechnet. Die bisherige Sperre der Personenzahl im Edit-Modus entfällt.

### D4: Normierung beim Speichern unverändert
Die bestehende Runter-Division durch `scale` (`InlineIngredientEditor.tsx:609/635`) und `portions: 1` bleiben.

### Betroffene Dateien
- Frontend: `frontend-food/src/components/recipe/InlineIngredientEditor.tsx`, `frontend-food/src/pages/recipes/RecipeDetailPage.tsx`, ggf. `frontend-food/src/components/recipe/PortionScaler.tsx`.

### API-Änderungen
- Keine.

## Risks / Trade-offs

- **Rundungsfehler bei wiederholtem Hoch-/Runterskalieren** → konsistente Rundung (wie bestehend, 3 Nachkommastellen), Gesamt führend.
- **Verwirrung Anzeige- vs. Edit-Skalierung** → klare UI-Trennung: Anzeige-`portionsMultiplier` (lesen) vs. `editPortions` (bearbeiten).

## Migration Plan

1. `editPortions`-State + Personenzahl-Selector im Editor.
2. Einstiegspunkt in `RecipeDetailPage`.
3. Entkopplung von `portionsMultiplier`.
4. Frontend-Tests. Kein Backend, keine DB.

## Open Questions

- (geklärt) Default-Personenzahl = aktuelle Anzeige-Personenzahl (`portionsMultiplier`) der Detailseite, danach im Editor änderbar.
