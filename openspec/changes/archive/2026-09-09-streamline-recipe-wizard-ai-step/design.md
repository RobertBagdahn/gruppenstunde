## Context

Der Rezept-Erstellungs-Wizard (`RecipeWizard.tsx`) gliedert sich in fünf Schritte. In Schritt 1 (`WizardStepMethod.tsx`) wird eine Freitext- oder Linkeingabe per Gemini-KI analysiert. Aktuell enthält `WizardStepMethod` einen eigenen Button `Mit KI analysieren`, der bei Betätigung die KI-Mutation triggert, aber den Wizard-Schritt nicht weiterschaltet. Unten rechts befindet sich zusätzlich der Standard-Button `Weiter`. Nutzer müssen nach der Analyse erraten, dass sie unten nochmals auf „Weiter“ klicken müssen.

## Goals / Non-Goals

**Goals:**
- Klare, eindeutige Ein-Knopf-Bedienung in Schritt 1.
- Der Button in der Fußleiste übernimmt die Aktion, heißt kontextbezogen `Rezept analysieren` (während der Laufzeit `Analysiert…`) und schaltet bei erfolgreichem API-Call direkt auf Schritt 2 weiter.
- Fehler werden wie gewohnt per Toast angezeigt; der Nutzer bleibt auf Schritt 1 und kann die Eingabe anpassen.
- Entfernen redundanter Test-IDs und Anpassen aller Playwright-Tests auf den Single-Click-Flow.

**Non-Goals:**
- Keine Änderungen an der KI-Pipeline, Gemini-Prompts oder Backend-Endpunkten.
- Kein manueller Modus ohne KI (Bestätigung des Nutzers: Eingabe läuft stets über den KI-Parser).
- Keine Änderungen an den Schritten 2 bis 5.

## Decisions

### Entscheidung 1: Entfernen des internen Buttons in `WizardStepMethod.tsx`
- **Kontext**: `WizardStepMethod` enthielt bisher ein `<button data-testid="recipe-smart-analyze">`.
- **Wahl**: Button restlos entfernen. Die Karte zeigt nur das Textfeld und den Hilfetext.
- **Alternative**: Button behalten und bei Klick direkt weiterschalten. *Verworfen*, da zwei grüne Aktionsbuttons auf einer Seite („Mit KI analysieren“ und „Weiter“) visuell verwirrend sind und Redundanz erzeugen.

### Entscheidung 2: Dynamische Beschriftung des Fußleisten-Buttons in `RecipeWizard.tsx`
- **Kontext**: Die Fußleiste hatte bisher statisch `Weiter` (bzw. `Speichert...`).
- **Wahl**:
  - Wenn `currentStep === 0`:
    - Label im Ruhezustand: `Rezept analysieren` mit `Sparkles`-Icon.
    - Label während Ladevorgang (`isSaving`): `Analysiert…` (inklusive Spinner/deaktiviertem State).
  - Wenn `currentStep > 0` und nicht letzter Schritt:
    - Label im Ruhezustand: `Weiter` mit `ChevronRight`-Icon.
    - Label während Ladevorgang: `Speichert...`.
  - Letzter Schritt:
    - Label `Fertigstellen`.
- **Rationale**: Entspricht exakt der Nutzerpräferenz und verdeutlicht, dass eine KI-Analyse ausgelöst wird.

### Entscheidung 3: Test-Anpassungen in `e2e/tests/`
- **Kontext**: Mehrere Tests (`recipe-ingredient-editing.spec.ts`, `recipe-workflows.spec.ts`, `food-contracts.mocked.spec.ts`, `recipe-integrity.live.spec.ts`) klicken `recipe-smart-analyze` und anschließend `Weiter`.
- **Wahl**: Umstellung der E2E-Tests auf `await page.getByTestId('recipe-wizard-next').click();` (bzw. Klick auf den Button mit Text "Rezept analysieren").

## Risks / Trade-offs

- **[Risk] Test-Regressionen**: Bestehende Tests suchen nach `recipe-smart-analyze`.
  → *Mitigation*: Gründliche Aktualisierung aller E2E-Spezifikationen und Ausführung der Tests.
- **[Risk] Tastatur-Submit**: Nutzer drücken eventuell `Enter` in der Textarea (erzeugt Zeilenumbruch).
  → *Mitigation*: Textarea bleibt für mehrzeilige Eingaben wie Rezepttexte gedacht; der Fußleisten-Button bleibt die primäre Auslöse-Aktion.
