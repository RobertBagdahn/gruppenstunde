## 1. UI-Bereinigung und Fußleisten-Aktion

- [x] 1.1 In `frontend-food/src/components/recipe/WizardStepMethod.tsx` den inneren Button `<button data-testid="recipe-smart-analyze">` entfernen, sodass die Karte nur das Textarea-Feld und den Hilfetext enthält.
- [x] 1.2 In `frontend-food/src/components/recipe/RecipeWizard.tsx` die Beschriftung und Icons des primären Navigationsbuttons anpassen:
  - Bei `currentStep === 0`: Text `Rezept analysieren` mit Sparkles-Icon (bzw. `Analysiert…` wenn `isSaving` aktiv ist).
  - Bei Folgeschritten: Unverändert `Weiter` (bzw. `Speichert...`).
- [x] 1.3 Sicherstellen, dass nach erfolgreicher Ausführung von `primaryAction` in Schritt 0 unmittelbar zu Schritt 1 (Basis & Portionen) weitergeschaltet wird.

## 2. Test-Anpassungen und Verifikation

- [x] 2.1 E2E-Tests in `e2e/tests/recipe-ingredient-editing.spec.ts` anpassen (Klick auf `recipe-smart-analyze` entfernen und direkt mit `recipe-wizard-next` bzw. `Rezept analysieren` weiterschalten).
- [x] 2.2 E2E-Tests in `e2e/tests/recipe-workflows.spec.ts`, `e2e/tests/food-contracts.mocked.spec.ts` und `e2e/tests/recipe-integrity.live.spec.ts` anpassen.
- [x] 2.3 Unit- und E2E-Tests ausführen und Typecheck (`npm run typecheck` im Food-Frontend) verifizieren.
