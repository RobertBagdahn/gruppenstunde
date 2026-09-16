## Context

Die Food-Domain verwendet Portionen als technische Berechnungsbasis für Rezeptmengen, Nährwerte, Preise, Meal-Pläne, Einkaufslisten und PDF-Exporte. Die sechs zuletzt archivierten Änderungen haben Status- und Bestätigungsfelder, Repair-Findings, Preisvorschläge, Materialien, strukturierte Rezeptschritte und Ingredient-Replacement eingeführt. Die Auditprüfung hat aber gezeigt, dass einzelne Altpfade weiterhin lokale Fallbacks und eigene Skalierungs- oder Preislogik verwenden.

Die Änderung betrifft mehrere Django-Apps und beide Food-Vertragsschichten. Die gespeicherte Normportion darf nicht durch Exportkontext verändert werden. Bestehende referenzierte Portionen dürfen bei fachlichen Gewichtsänderungen nicht in place mutiert werden.

## Goals / Non-Goals

**Goals:**

- Eine einzige vertrauenswürdige Gewichtsentscheidung für Berechnungen, Rebinds, Repairs und Replacement einführen.
- Unbestätigte Stückgewichte ohne erfundene Grammwerte durch alle Verbraucher propagieren.
- Berechnungsvollständigkeit mit Status, Quote und betroffenen Items ausgeben.
- PDF- und Planer-Skalierung für Mengen, Kosten, Nährwerte und Steps vereinheitlichen.
- Preisstatus zwischen Backend und Food-Frontend synchronisieren.
- Mutierende Material- und Replacement-Flows gegen Konkurrenzsituationen absichern.
- Backend-Integrationsabdeckung und Playwright-E2E-Abdeckung für die kritischen Nutzerflüsse schaffen.

**Non-Goals:**

- Keine automatische fachliche Schätzung unbekannter Gewichte ohne Nutzerbestätigung.
- Keine Änderung der gespeicherten Rezept-Normportion durch PDF- oder Planer-Exporte.
- Keine Einführung von JWT, neuer Authentifizierung oder einer zweiten Food-Frontend-Architektur.
- Keine rückwirkende Änderung bestehender Migrationen.
- Keine globale automatische Überschreibung positiver Zutatenpreise.

## Decisions

### 1. Vertrauenswürdige Gewichte bleiben zentral

Alle Berechnungs- und Rebindpfade verwenden `resolve_trusted_weight()` oder einen darauf aufbauenden typisierten Ergebniswert. `weight_g or 1.0` ist für unbekannte oder unbestätigte Stückportionen nicht zulässig. Ein nicht vertrauenswürdiges Ausgangs- oder Zielgewicht führt bei automatischen Reparaturen zu `pending_review`; der Vorgang darf keine RecipeItems verschieben.

Normale Portion-Create- und Update-Endpunkte lehnen stückartige Portionen ohne bestätigtes positives Gewicht ab. Der bestehende Confirmation-Endpoint setzt Status, Quelle, Zeitpunkt und Gewicht atomar.

Alternative: Unbestätigte Stückportionen speichern und überall nur markieren. Das wird verworfen, weil dadurch weiterhin beliebige Verbraucher die Markierung übersehen könnten.

### 2. Unvollständigkeit wird strukturiert propagiert

Berechnungen geben neben Ergebnissen einen Vollständigkeitsstatus, eine Quote und betroffene Item-Referenzen aus. Unbekannte Gewichte oder fehlende Preise erzeugen keine künstlichen Werte. Rezept- und Meal-Plan-Responses bleiben nutzbar, kennzeichnen aber `partial` oder `missing` und nennen die konkreten Items.

Alternative: Die gesamte Berechnung bei einem fehlenden Item abbrechen. Das wird verworfen, weil Nutzer weiterhin brauchbare Teilinformationen benötigen.

### 3. Ein gemeinsamer Skalierungsfaktor pro Exportkontext

Recipe-PDF und Cooking-Schedule-PDF berechnen einen gemeinsamen Faktor aus Zielpersonenzahl, gespeicherter Rezeptportion, effektiven Planportionen und `reserve_factor`. Dieser Faktor wird für Zutaten, direkte Gramm-Items, Step-Ingredients, Nährwerte und Kosten verwendet. Die gespeicherten Rezeptfelder bleiben unverändert.

Alternative: Den Reservefaktor nur bei Kosten anwenden. Das würde die Anzeige von Mengen und die Kostenübersicht auseinanderlaufen lassen.

### 4. Platzhalterauflösung behandelt direkte Gramm-Items explizit

Die strukturierte Step-Auflösung prüft `portion is None` vor dem Zugriff auf Zutat und Portion. Direkte Gramm-Items werden mit ihrer skalierten Grammmenge formatiert. Ein unbekannter einzelner Placeholder bleibt erhalten; ein Fehler bei einem Item darf nicht die komplette Step-Auflösung auf den unskalierten Originaltext zurücksetzen.

### 5. Preisstatus sind ein gemeinsamer Vertrag

Backend und Food-Frontend verwenden ausschließlich `manual`, `ai_accepted` und `missing`. Ein offener KI-Vorschlag wird zusätzlich über `pending_price_proposal` repräsentiert und nicht als vierter Preisquellenwert eingeführt. Alle Preisstatistiken und Verbraucher verwenden `is_missing_price()` beziehungsweise `price_or_none()`.

### 6. Mutationen werden auf Ressourcenebene serialisiert

Material-Update/Delete sperren Rezept und Material-Link innerhalb einer Transaktion. Reorder akzeptiert nur eine eindeutige vollständige Permutation der aktiven IDs. Ingredient-Replacement prüft einen identischen Zielzustand als idempotenten No-op und akzeptiert eine automatisch berechnete Menge nur, wenn die Grammdifferenz innerhalb einer definierten Toleranz bleibt.

### 7. Ein auditierbarer Repair-Command ist die einzige automatische Reparaturroute

Der neue Repair-Workflow übernimmt deterministischen Scan, AI-Evaluation, Konfidenzschwelle, `pending_review`, Dry-Run, Apply, Audit-Snapshots und Cache-Neuberechnung. Der ältere Integritäts-Command wird in diesen Workflow integriert oder entfernt, damit keine zweite automatische Reparaturlogik Schutzregeln umgehen kann.

### 8. Testpyramide mit Playwright

Zuerst werden Backend-Unit- und Integrationsregressionen für Gewichte und Repair ergänzt. Danach folgen PDF-, Preis-, Material- und Replacement-Integrationen. Playwright deckt die Nutzerflüsse mit HTTP-only Session-Cookies und 320px-Viewport ab; Vitest bleibt für schnelle Component- und Hook-Tests bestehen.

## Risks / Trade-offs

- [Legacy-Daten bleiben zunächst unvollständig] → Scanner, Data-Quality-Status und betroffene Items sichtbar machen; keine stillen Reparaturen.
- [Strengere Validierung kann bestehende Importpfade ablehnen] → Import-Responses müssen einen bestätigungspflichtigen Vorschlag statt eines Speichervorgangs zurückgeben.
- [Teilberechnungen können UI-Komponenten brechen] → Pydantic- und Zod-Schemas gemeinsam ändern und Contract-Tests ausführen.
- [Locking kann bei parallelen Materialänderungen Wartezeiten erzeugen] → Transaktionen kurz halten und nur Rezept/Link-Zeilen sperren.
- [PDF-Kosten können sich gegenüber bisherigen Ausgaben ändern] → goldenartige Integrationsfälle mit Reservefaktor und exakten Zwischenwerten hinzufügen.
- [Playwright erhöht Setup- und Laufzeitkosten] → auf die fünf kritischen Food-Flows begrenzen und Backend via deterministische Testdaten anbinden.

## Migration Plan

1. Bestehende Status-/Provenance-Felder und Migrationen prüfen; nur fehlende Model-Felder oder Constraints in neuen Migrationen ergänzen.
2. Zentralen Resolver und Berechnungsvollständigkeit implementieren, ohne Legacy-Daten automatisch zu verändern.
3. Repair- und Rebind-Pfade auf den Resolver umstellen und alte automatische Route in den auditierbaren Command integrieren.
4. API-Pydantic- und Food-Zod-Verträge synchron erweitern; Contract- und Integrations-Tests aktualisieren.
5. PDF-, Preis-, Material- und Replacement-Consumer umstellen.
6. Mit Dry-Run den Bestand prüfen; erst danach offene Findings manuell oder über die definierte Konfidenzschwelle anwenden.
7. Playwright in CI beziehungsweise dem bestehenden Frontend-Testprozess ergänzen.

Rollback erfolgt über einen vorherigen Anwendungsversion-Rollback. Neue Status- und Auditdaten bleiben additiv; automatische Reparatur-Apply-Schritte werden vor dem Rollout deaktiviert, falls Contract- oder Dry-Run-Prüfungen fehlschlagen.

## Open Questions

- Keine fachlichen Fragen offen. Die Toleranz für automatische Replacement-Rundung muss in der Implementierung als explizite Konstante mit Tests festgelegt werden.
