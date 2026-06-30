## Why

Ballaststoffe (und andere reine Untergrenzen-Nährstoffe) erscheinen optisch als „zu viel", obwohl mehr davon erwünscht ist. Die Prüfung ergab: Die Rules sind korrekt (nur min, kein max), und die Ampel-Logik (Backend wie Frontend) kann für `fibre_g` bei `max = null` nie eine „zu viel"-Warnung erzeugen. Es verbleiben zwei Ursachen: (1) eine **visuelle** Irreführung im `NutrientBalanceChart`, weil der Soll-Balken bei reinen Untergrenzen-Nährstoffen auf das Minimum gesetzt wird — der Ist-Balken darüber wirkt wie eine Überschreitung; (2) potenziell **veraltete DB-Rules** mit gesetztem Maximum, die per Re-Seed bereinigt werden müssen.

## What Changes

- **Darstellung reiner Untergrenzen-Nährstoffe** — Im `NutrientBalanceChart` werden Nährstoffe ohne Maximum (z.B. Ballaststoffe) als Mindest-Schwelle dargestellt (Werte über dem Minimum sind „gut"), statt als feste Soll-Säule auf dem Minimum, die ein „darüber = zu viel" suggeriert.
- **Datenhygiene für Rules** — Sicherstellen, dass keine `fibre_g`-Rules mit gesetztem Maximum in der Datenbank verbleiben (Re-Seed-/Bereinigungsschritt), sodass keine veralteten „zu viel"-Schwellen mehr greifen.

## Capabilities

### New Capabilities
- `nutrition-min-only-display`: Korrekte visuelle Darstellung reiner Untergrenzen-Nährstoffe (Mindest-Schwelle statt Soll-Säule), sodass Werte über dem Minimum nicht als „zu viel" erscheinen.

### Modified Capabilities
- (keine)

## Impact

- **Frontend-Pages**: `frontend-food` — `components/charts/NutrientBalanceChart.tsx` (Darstellung min-only), ggf. `components/shared/SollIstBar.tsx` (bereits korrekt, nur prüfen), `pages/planning/NutritionView.tsx`.
- **Backend**: `recipe` — Re-Seed/Bereinigung der Rules (`management/commands/seed_rules.py --clear`), keine Code-Logik-Änderung an der Ampel.
- **Pydantic-/Zod-Schemas**: Keine Änderung.
- **Migration**: Keine DB-Schema-Migration; nur Datenbereinigung der Rules.
- **Tests**: Chart-Darstellung min-only; (Backend) kein fibre_g-Rule mit Maximum nach Seed.
