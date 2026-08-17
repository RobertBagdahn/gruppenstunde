## Context

Der Frühstücks-Wizard initialisiert im Schritt 1 (Basis) die Brot-Verteilung aus dem Katalog (BreakfastCatalog). Aktuell wird nach der initialen 100/0-Zuweisung eine Even-Split-Logik angewendet, die alle Brote gleichmäßig verteilt (~17% pro Sorte). Dieses Verhalten wird auf "100% Bauernbrot, 0% alle anderen" geändert.

Die Änderung ist rein frontend-seitig in einer existierenden Komponente.

## Goals / Non-Goals

**Goals:**
- Neuer Default: Bauernbrot = 100%, alle anderen Brote = 0%
- Betrifft beide Modi (RefMeal + DirectMeal)
- Gilt nur für neue Wizards (gespeicherte Verteilungen werden geladen)

**Non-Goals:**
- Keine UI-Änderungen an Slidern, Labels oder Layout
- Kein konfigurierbarer Default (hart codiert)
- Keine Backend- oder DB-Änderungen
- Kein "Alle gleich verteilen"-Button (die Even-Split-Logik wird entfernt, nicht als Feature erhalten)

## Decisions

| Decision | Rationale |
|----------|-----------|
| Even-Split-Logik entfernen (nicht als Button erhalten) | Ein "Alle gleich verteilen"-Button wäre ein eigenständiges UI-Feature mit eigener Komplexität (Platzierung, Icons, Verhalten bei gesperrten Slidern). Das gehört in einen separaten Change, falls gewünscht. |
| Fallback auf erstes Base-Ingredient | Bauernbrot ist durch Seed-Daten garantiert, aber ein defensiver Fallback verhindert leere Basis bei fehlendem Katalog oder manuell gelöschtem Bauernbrot. |
| Alle Brote bei 0% sichtbar lassen | Maximale Sichtbarkeit aller Optionen. User sehen sofort, was verfügbar ist, und können per Slider hochregeln. |
| Kein abgeblendeter Slider bei 0% | Der Slider bei 0% sieht aus wie jede andere Position — konsistent zur bestehenden UI-Philosophie. |

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| [Niedrig] Ein Nutzer könnte denken, nur Bauernbrot sei verfügbar | Die 5 anderen Brote sind bei 0% sichtbar mit aktiven Slidern — sofort erkennbar und regulierbar |
| [Sehr niedrig] Seed-Reihenfolge ändert sich | Bauernbrot ist das erste Element in BASE_INGREDIENTS und wird es bleiben — kein anderer Bread hat "Bauern"-Semantik |
