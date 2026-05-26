## Why

Die Step-Icons im Event-Wizard-Stepper sind auf dem Screenshot kaum sichtbar. Die Icons verwenden Google Material Symbols mit sehr kleiner Schriftgröße (`text-[18px]`), was bei 8 Steps auf kleinen Bildschirmen zu abgeschnittenen Labels und schwer erkennbaren Icons führt. Der Stepper wirkt dadurch unpoliert und unübersichtlich — besonders auf Mobile, wo die Labels nur als "Gru...", "Dat...", "An..." abgekürzt werden.

## What Changes

- Step-Icons größer und besser sichtbar machen (mind. `text-[20px]` auf Mobile, `text-[24px]` auf Desktop)
- Step-Kreise vergrößern für bessere Touch-Targets und Icon-Sichtbarkeit
- Aktiver Step stärker hervorheben (z.B. Ring/Outline oder Größenunterschied)
- Labels verbessern: ggf. nur auf Desktop anzeigen oder Tooltip auf Mobile
- Verbindungslinien zwischen Steps visuell aufwerten
- Gesamten Stepper responsive optimieren für den 8-Step-Flow

## Capabilities

### New Capabilities

_Keine — rein visuelles Refactoring._

### Modified Capabilities

_Keine Spec-Level-Änderungen._

## Impact

- **Frontend**: `WizardStepper.tsx` — Tailwind-Klassen anpassen, ggf. Komponenten-Struktur für Responsive-Verhalten überarbeiten.
- **Keine Backend-Änderungen**, keine Schema-Änderungen, keine Migrationen.
