## Why

Die letzten Cleanup-Audits haben mehrere übergreifende Restfehler in der Food-Plattform identifiziert. Einige betreffen Zugriffsschutz und Datenintegrität, andere führen zu falschen Mengen im Kochplan oder zu fehlenden Produktionsdaten beim Export/Import. Gleichzeitig müssen die verbleibenden API-Verträge, Tests und Frontend-Qualitätsprobleme abgeschlossen werden, damit die Food-Flows verlässlich deploybar sind.

## What Changes

- Zugriffsschutz für Rezepte, Zutaten, Portionen, Packages, Aliase, MealPlans und Verknüpfungen zentralisieren und mit Owner-, Gruppen-, Staff- und Draft-Fällen testen.
- Rezept-Forking atomar machen und Austauschgruppen, optionale Zutaten sowie aktive Varianten vollständig und korrekt kopieren.
- Variantenauswahl in Nährwerten, Kosten, Einkaufsliste und Kochplan auf eine gemeinsame Semantik bringen; Defaults, optionale Zutaten und explizite Alternativen korrekt behandeln.
- Den Kochplan auf das aktuelle `exchange_group`-Modell umstellen und Löschen verwendeter Varianten korrekt schützen.
- Package-Export und -Import inklusive FK-sicherer Reihenfolge und Roundtrip-Tests vervollständigen.
- Pydantic- und Zod-Schemas für Permissions, MealPlan-Quellen, Recipe-Daten, Supply-Metadaten und AI-Interaktionen synchronisieren.
- Typisierte API-Responses und zentrale Fehlerparser verwenden; stille Fehler in Backend und Food-Frontend sichtbar und nutzerorientiert behandeln.
- Food-Frontend vollständig TypeScript-, ESLint- und testgrün halten und verbleibende `any`- sowie Theme-Verstöße reduzieren.
- Fehlende Unit-, API-, Berechtigungs- und Cross-App-Integrationstests ergänzen.
- Offene OpenSpec-Abweichungen in den betroffenen Fähigkeiten auflösen oder die Anforderungen an das aktuelle Produktverhalten anpassen.

## Capabilities

### New Capabilities

- `food-quality-integrity`: Gemeinsame fachliche Regeln für Varianten, optionale Zutaten, Kochplan-Ausgabe und Löschschutz.
- `food-data-roundtrip`: Vollständiger Export- und Import-Roundtrip für Food-Daten einschließlich Packages.
- `food-api-contracts`: Vollständig typisierte und zwischen Pydantic und Zod synchronisierte Food-API-Verträge.

### Modified Capabilities

Keine bestehenden Requirements werden direkt ersetzt. Die neuen Qualitäts-Capabilities bündeln die notwendigen Korrekturen und liefern ihre Akzeptanzkriterien als eigenständige, testbare Verträge.

## Impact

- Backend-Apps: `recipe`, `supply`, `planner`, `event`, `content` und `core`.
- Frontend: ausschließlich `frontend-food/`; das Haupt-Frontend erhält keinen Food-Code.
- API-Schemas und Zod-Schemas werden breaking synchronisiert, da keine Rückwärtskompatibilität erforderlich ist.
- Mögliche neue Django-Migrationen für Datenintegritäts- oder Permission-Anpassungen; bestehende Migrationen werden nicht verändert.
- Export-/Import-Fixtures und ihre FK-Abhängigkeiten werden erweitert.
- Betroffene Tests werden ergänzt oder aktualisiert; Python-Tests laufen über `uv run`.
