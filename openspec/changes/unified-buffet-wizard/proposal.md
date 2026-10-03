## Why

Der mehrstufige Frühstücksassistent mit Share-Slidern ist im regulären Frühstücks-MealSlot nicht als primärer Einstieg sichtbar. Gleichzeitig unterscheidet sich der allgemeine Buffet-Builder noch vom vertrauten Wizard-Ablauf. Ein gemeinsamer Preset-first-Wizard macht Frühstück und alle weiteren Buffet-MealTypes konsistent und startet jede Auswahl mit einem fertig konfigurierten, editierbaren Menü.

## What Changes

- Den vorhandenen Frühstücks-Wizard im normalen MealSlot wieder als Assistent anbieten und die fünf bestätigten Presets im ersten Schritt zeigen: „Nur Müsli“, „Brot und Müsli“, „Brot pflanzlich“, „Brot vegetarisch“ und „Brot mit Fleisch“.
- Den allgemeinen Buffet-Builder ebenfalls in den mehrstufigen Wizard-Stil überführen: zuerst Preset, danach Inhalte/Mengen bearbeiten, zum Schluss prüfen und speichern.
- Für Mittagessen, Abendessen und Snack je bis zu sechs hervorgehobene Varianten aus bestehenden Vorlagen anbieten. Für Getränke die bestätigten Varianten „Hausfahrt mit Säften“ und „Lager mit Zitronentee“. „Freies Buffet“ ist eine separate, immer verfügbare Option.
- Die Presets mit sichtbaren Zutaten und Rezepten vorausfüllen und danach die Auswahl, Mengen pro Rolle sowie Item-Shares bearbeitbar machen.
- Nutzende wählen lassen, ob vorhandene manuelle MealItems beim Speichern erhalten oder ersetzt werden. Preset, Auswahl und Mengen beim erneuten Öffnen wiederherstellen.
- Globale Rollen- und Preset-Definitionen bleiben Admin-Pflege; ein eigener Frontend-Admin-Editor ist nicht Teil dieses Changes.

## Capabilities

### New Capabilities

Keine. Der Change erweitert bestehende Buffet- und Frühstücksfunktionen.

### Modified Capabilities

- `buffet-builder`: einheitlicher Preset-first-Wizard, meal-type-spezifische Auswahl, vollständige Defaults, Shares pro Item, Save-Policy und Wiederherstellung.
- `breakfast-spread`: den vorhandenen Share-Slider-Wizard aus dem normalen Frühstücks-MealSlot erreichbar machen und die fünf bestätigten Profile verwenden.
- `buffet-templates`: Hervorhebung der bestehenden Vorlagen pro MealType sowie neue Getränkepresets mit vollständig vorausgewählten Items.

## Impact

- Food-Frontend: `frontend-food/src/pages/planning/breakfast/BreakfastWizardPage.tsx`, `frontend-food/src/components/buffet/BuffetBuilder.tsx`, `frontend-food/src/pages/planning/MealSlot.tsx`, `frontend-food/src/components/planning/MealActionsMenu.tsx` und gemeinsam genutzte Wizard-Komponenten.
- Backend: `planner` Buffet-Model/API/Schemas/Service und Template-Seed; Item-Shares werden wiederherstellbar gespeichert. Pydantic- und Zod-Verträge bleiben synchron.
- Datenbank: additive Migration für Buffet-Item-Shares; Template-Seed bleibt standardmäßig Dry-Run und braucht für Prod ein separates `--apply`.
- Prod: keine Datenänderung, Zuordnungs-Merge oder Deploy ist durch diesen Change selbst freigegeben; ein späterer Prod-Seed braucht Dry-Run und explizites Okay.
