# Eingabegrenzen und Integrität für Essenspläne

## Status

Die konkreten Grenzwerte in `design.md` und `specs/` sind **Vorschlagswerte zur Owner-Freigabe** (Task 0.1). Bestätigt durch die Review vom 2026-10-11: `reserve_factor=-100`, `activity_factor=1e9`, negative `day_part_factors` und `MealPlanDuplicateIn.norm_portions=-5e9` werden derzeit gespeichert.

## Why

Mehrere API-Felder akzeptieren derzeit Werte, die fachlich unmöglich oder für die Berechnung und Datenbank gefährlich sind. Dazu gehören unbeschränkte Reserve- und Tagesfaktoren, Portions-Overrides, Einzelmengen und Portionsgewichte. Außerdem kann ein Plan mit einer unverhältnismäßig langen Laufzeit und tausenden Mahlzeiten erzeugt werden. Einzelne Werte wie `norm_portions` sind bereits begrenzt, aber es gibt noch kein konsistentes Regelwerk über die zusammenhängenden Eingaben.

## What Changes

- Für Skalierungsfaktoren, Reserve, Tagesanteile, Portions-Overrides, Mengen und Portionsgewichte werden fachlich begründete Mindest- und Höchstwerte festgelegt.
- Die API validiert dieselben Grenzen bei POST und PATCH und gibt feldbezogene 4xx-Fehler statt Datenbankfehlern oder 500-Antworten zurück.
- Planzeitraum und maximale Zahl automatisch angelegter Mahlzeiten erhalten eine sichere Obergrenze.
- Plan-Einstellungen im Food-Frontend verhindern ungültige Werte und erklären die zulässigen Grenzen.
- Backend- und Frontend-Schemas bleiben synchron; Berechnungsservices erhalten zusätzliche Schutzprüfungen für Bestandsdaten.

## Capabilities

### New Capabilities
- `meal-plan-input-guardrails`

### Modified Capabilities
- Keine. Die Grenzen für Plan-, Mahlzeit- und Mengenfelder sowie das Frontend-Verhalten stehen gesammelt in `meal-plan-input-guardrails`.

## Impact

- Backend: Pydantic-Schemas, MealPlan-/Meal-/MealItem-APIs sowie Berechnungen in `planner` und `supply`.
- Food-Frontend: Plan-Einstellungen, Portionsfelder und Zod-Schemas.
- Verifikation: Grenzwerttests für Anlage und Änderung, inklusive SQLite/PostgreSQL-kompatibler Fehlerbehandlung und Schutz vor übergroßen Plänen.

Die schnelle Ablehnung von `MealItem.factor <= 0` ist im Quick-Wins-Change enthalten; dieses Vorhaben definiert die umfassenden Wertebereiche.
