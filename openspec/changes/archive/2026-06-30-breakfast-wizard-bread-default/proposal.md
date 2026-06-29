## Why

Beim Öffnen des Frühstücks-Wizards verteilt die Brotauswahl (Basis) aktuell gleichmäßig auf alle 6 Brotsorten (je ~17%). In der Praxis wird auf Lagern meist 1–2 Brotsorten in großen Mengen gekauft — die gleichmäßige Verteilung ist unrealistisch und zwingt Nutzer bei jedem Wizard-Start, die Slider manuell auf 100% für eine Sorte zu ziehen. Das schafft unnötige Friktion.

## What Changes

- Brot-Default im Wizard Schritt 1 (Basis) ändert sich von Even-Split (je ~17%) auf **100% Bauernbrot, 0% alle anderen**
- Die Even-Split-Initialisierungslogik (Zeilen 32–39 in `StepBasis.tsx`) wird entfernt
- Gilt für **beide Modi** (RefMeal und DirectMeal)
- Nur für **neue Wizards** — beim Wiederöffnen eines gespeicherten Frühstücks wird die gespeicherte Verteilung geladen
- Fallback: Falls Bauernbrot nicht im Katalog ist (gelöscht/nicht geseeded), wird das erste verfügbare Base-Ingredient auf 100% gesetzt
- **Keine UI-Änderungen** — alle 6 Brote bleiben bei 0% sichtbar, Slider verhalten sich normal

## Capabilities

### New Capabilities
*(Keine — die Funktionalität existiert, nur der Default ändert sich.)*

### Modified Capabilities
- `breakfast-wizard`: Die Scenario-Beschreibung für "Kein RefMeal → Redirect zu Wizard" und Schritt 1 (Basis) muss aktualisiert werden: Statt "leerem Standardzustand" ist der Default "Bauernbrot 100%, alle anderen 0%".

## Impact

- **Frontend only**, keine Backend-Änderungen, keine DB-Migration
- Einzige Code-Änderung: `frontend-food/src/pages/planning/breakfast/StepBasis.tsx` — Entfernen der Even-Split-Logik (Zeilen 31–39)
- Spec-Update: `openspec/specs/breakfast-wizard/spec.md` — Anpassung des Default-Verhaltens in Schritt 1
- Kein Breaking Change — gespeicherte Frühstücke bleiben unverändert
