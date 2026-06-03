## Context

Der InlineIngredientEditor hat bereits einen ähnlichen Pattern: Den "AI-Mengenschätzung"-Dialog mit Checkbox-Auswahl und "Übernehmen"-Button. Dieser wird als Vorlage für den KI-Vorschläge-Bestätigungsdialog verwendet.

## Goals / Non-Goals

**Goals:**
- Vorschläge in einem modalen Dialog mit Checkboxen anzeigen
- Alle standardmäßig ausgewählt
- "Übernehmen" und "Verwerfen" Buttons
- Nach Übernehmen: gewählte Items per `ai-apply-ingredients` speichern, dann Query invalidieren

**Non-Goals:**
- Mengen der Vorschläge editierbar machen (kommt evtl. später)
- Drag & Drop Sortierung der Vorschläge

## Decisions

1. **Gleiches Dialog-Pattern wie Mengenschätzung**: Modal mit Tabelle, Checkboxen, Übernehmen/Verwerfen
2. **State-Flow**: `handleAiSuggest` holt nur Vorschläge → speichert in State → Dialog öffnet → bei Bestätigung `ai-apply-ingredients` mit gewählten Items aufrufen
3. **Alle vorausgewählt**: Checkboxen standardmäßig alle aktiv, Nutzer deselektiert was nicht passt

## Risks / Trade-offs

- Zusätzlicher Klick nötig (Bestätigung) — akzeptabel für mehr Kontrolle
