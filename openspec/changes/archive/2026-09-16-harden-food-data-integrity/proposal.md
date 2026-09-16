## Why

Die letzten sechs Food-OpenSpec-Umsetzungen haben die fachlichen Flows für Portionen, Reparaturen, Preise, Materialien, PDF-Exporte und Ingredient-Replacement erweitert. Die Auditprüfung zeigt jedoch weiterhin stille `1 g`-Fallbacks, uneinheitliche Preisstatus, inkonsistente Skalierung sowie fehlende Integrations- und echte Browser-Tests. Diese Änderung bündelt die notwendigen Schutzmaßnahmen, damit unbestätigte Daten nicht erneut als verlässliche Berechnungsgrundlage verwendet werden.

## What Changes

- Unbestätigte oder fehlende Stückgewichte dürfen in keiner automatischen Repair-, Rebind-, Preis-, Nährwert- oder Einkaufslistenberechnung durch `1 g` ersetzt werden.
- Normale Portion-Create- und Update-Flows blockieren unbestätigte Stückportionen; die explizite Portion-Bestätigung bleibt der zulässige Erzeugungsweg.
- Repair-Findings mit nicht vertrauenswürdiger Gewichtsgrundlage bleiben in `pending_review` und werden nicht automatisch angewendet.
- Unvollständige Rezept- und Meal-Plan-Berechnungen liefern Status, Abdeckungsquote und betroffene Items statt erfundener Grammwerte.
- Kochplan-PDFs liefern für leere Pläne `404`, verwenden eine gemeinsame Skalierung und lösen direkte Gramm-Items in strukturierten Schritten auf.
- Preisstatus werden einheitlich als `manual`, `ai_accepted` oder `missing` ausgegeben.
- Material-Update/Delete erhalten Transaktions- und Locking-Schutz; Reorder akzeptiert nur eindeutige vollständige Permutationen.
- Ingredient-Replacement wird bei identischer Zielportion zum idempotenten No-op und schützt die technische Grammmenge vor unzulässiger Rundungsabweichung.
- Der ältere und der neue Portion-Repair-Management-Workflow werden zu einem auditierbaren Workflow zusammengeführt.
- Backend-Integrationstests sowie echte Playwright-E2E-Tests sichern die kritischen Food-Flows ab.

## Capabilities

### New Capabilities

- `food-data-integrity-hardening`: Einheitliche Vertrauens-, Vollständigkeits-, Skalierungs- und Testregeln für die Food-Berechnungen und die zugehörigen mutierenden Workflows.

### Modified Capabilities

- Keine separaten Delta-Spezifikationen. Die bestehenden Portion-, Preis-, Recipe-PDF-, Material- und Replacement-Anforderungen werden durch die neue, querliegende Hardening-Capability konkretisiert und gemeinsam umgesetzt.

## Impact

- Backend-Apps `supply`, `recipe`, `planner`, `shopping` und `content`.
- Services für Portionen, Repair, Nutrition, Preise, Shopping, PDF-Export und Ingredient-Replacement.
- APIs und Pydantic-Schemas für Gewichtsstatus, Preisstatus, Berechnungsvollständigkeit und Fehlerfälle.
- Food-Frontend-Zod-Schemas, Warn- und Bestätigungsflows, Material-/Replacement-Komponenten sowie neue Playwright-Testinfrastruktur.
- Neue oder angepasste Backend-Tests, Frontend-Tests und gegebenenfalls eine Migration für Status-/Provenance-Felder. Bestehende Migrationen werden nicht geändert.
