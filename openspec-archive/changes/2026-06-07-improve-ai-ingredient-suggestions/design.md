## Context

Die aktuelle KI-Vorschlag-Pipeline (`suggest_all_fields`) nutzt Gemini mit Structured Output. Das Pydantic-Schema markiert `portions`, `aliases` und `nutritional_tags` als `| None` mit Default `None`. Gemini Structured Output interpretiert `None`-Default-Felder als optional und liefert sie fast nie — der Prompt bittet zwar darum, aber das Schema widerspricht. Die Pipeline `ai_create_ingredient` beweist, dass required-Felder funktionieren: Sie erhält immer Portionen, Aliase und Tags.

Der Dialog (`AiSuggestDialog.tsx`) ist auf `max-w-lg` (512px) begrenzt. Bei 10+ Nährwert-Feldern, 5 Bewertungen, 4 Physik-Feldern, Portionen, Aliasen und Tags ist das zu eng.

Der Alias-Prompt sagt nur "Gib alternative Bezeichnungen" — Gemini liefert generische Begriffe ("Pasta" statt "Fusilli, Makkaroni"). Pfadfinder brauchen spezifische Aliase für Einkaufslisten und Lagerlogistik.

Pfadfinder-relevante Felder (Lagerung, Kochfaktor, Saisonalität) existieren nicht im Modell. Sie müssen manuell in Notizen dokumentiert werden.

## Goals / Non-Goals

**Goals:**
- Gemini muss immer Portionen, Aliase und Ernährungstags liefern (Schema required)
- KI schlägt spezifischere Zutatennamen vor (z.B. "Kuhmilch 3,5% Fett")
- 6 neue Pfadfinder-Felder auf Ingredient: storage_type, cooking_factor, camp_suitable, preparation_time_min, season_start, season_end
- Dialog: 3-spaltiges CSS Grid, max-w-4xl (896px)
- Alias-Prompt: mind. 3 spezifische Aliase im Format "Basis (Spezifisch)"
- Alle neuen Felder in Create-/Edit-Formularen, Detail-View und KI-Prompt

**Non-Goals:**
- Keine Änderung an `ai_create_ingredient` (funktioniert bereits)
- Keine Änderung an recipe-level AI ingredient suggestions
- Keine Batch-Nachbefüllung bestehender Zutaten (Felder sind nullable)
- Kein neuer KI-Endpunkt — alles im existierenden `suggest_all_fields`

## Decisions

### 1. Required statt optional im Structured-Output-Schema

**Entscheidung**: `portions: list[PortionSuggestion]`, `aliases: list[str]`, `nutritional_tags: list[str]` — ohne `| None`, mit leerer Liste als Default.

**Alternativen**:
- Prompt stärker formulieren: Unzuverlässig, Gemini ignoriert weiche Formulierungen wenn das Schema es erlaubt
- Separate API-Calls pro Liste: Mehr Latenz, mehr Kosten, mehr Rate-Limit-Risiko

**Begründung**: `ai_create_ingredient` beweist, dass required-Felder zuverlässig befüllt werden. Eine leere Liste ist besser als `null` — die Frontend-Filterlogik sieht dann zumindest die Gruppe.

### 2. storage_type als Django TextChoices

```python
class StorageTypeChoices(models.TextChoices):
    DRY = "dry", "Trocken"
    REFRIGERATED = "refrigerated", "Kühlschrank"
    FROZEN = "frozen", "Gefroren"
    AMBIENT = "ambient", "Raumtemperatur"
```

**Alternativen**:
- Freitext-CharField: Keine Validierung, keine Query-Filter ("alle kühlpflichtigen Zutaten")
- Boolean `needs_cooling`: Weniger präzise — "gefroren" und "kühlschrank" sind unterschiedliche Lagerwelten

**Begründung**: Enum ist queryable, validiert, und gibt klare UI-Anzeige. `needs_cooling` wird nicht separat gespeichert — kann aus `storage_type` abgeleitet werden (`refrigerated` oder `frozen`).

### 3. season_start/season_end als Integer 1–12, beide nullable

**Entscheidung**: Zwei `IntegerField(null=True)` mit Validator 1–12. Beide null = ganzjährig.

**Alternativen**:
- String-Feld "April–Juni": Nicht queryable, sprachabhängig, schwer für Gemini konsistent zu formatieren
- Bitmask (12 Bits): Overengineered für diesen Use Case
- Choices "Frühjahr/Sommer/Herbst/Winter/ganzjährig": Weniger präzise, Spargel ist April–Juni, nicht "Frühjahr"

**Begründung**: Integer-Monate sind maschinenlesbar, queryable (`WHERE 5 BETWEEN season_start AND season_end`), und Gemini liefert konsistent Zahlen. UI zeigt sie als Monatsnamen an.

### 4. cooking_factor als Float (Multiplikator)

**Entscheidung**: `FloatField(default=1.0)`. Anzeige: "aus 100g roh → 250g gekocht" bei Faktor 2.5.

**Begründung**: Ein Multiplikator ist die natürlichste Repräsentation. Nudeln ~2.5, Reis ~2.8, Linsen ~2.2, Fleisch/Gemüse = 1.0. Berechnung `cooked = raw × factor` ist trivial.

### 5. Dialog-Layout: CSS Grid 3-Spalten

```
┌──────────────┬──────────────┬──────────────┐
│ Nährwerte    │ Bewertungen  │ Physik/Lager │
│ (11 Felder)  │ (6 Felder)   │ (10 Felder)  │
├──────────────┴──────────────┴──────────────┤
│ Name-Vorschlag                             │
├──────────────┬──────────────┬──────────────┤
│ Portionen    │ Aliase       │ Ernährungs-  │
│              │              │ tags         │
└──────────────┴──────────────┴──────────────┘
```

**Begründung**: Scalar-Felder kommen in die oberen 3 Spalten (Gruppen: Nährwerte, Bewertungen, Physik+Lagerung). Name-Vorschlag bekommt eine volle Zeile (prominent). Listen (Portionen, Aliase, Tags) kommen in die unteren 3 Spalten. Auf Mobile (<768px) alles einspaltig.

### 6. Alias-Prompt: Pflicht-Minimum + Format

**Entscheidung**: Prompt verlangt "mindestens 3 spezifische alternative Bezeichnungen" und gibt Format vor: "falls möglich spezifischer als der Zutatenname, z.B. für 'Nudeln': 'Nudeln (Fusilli)', 'Nudeln (Makkaroni)', 'Nudeln (Spaghetti)'"

**Begründung**: Der Format-Hinweis gibt Gemini ein konkretes Muster. Ohne Beispiel liefert es "Pasta, Teigwaren" — zu generisch für Einkaufslisten.

## Risks / Trade-offs

- **[Risk] Gemini liefert falsche/unsinnige Portionen bei unbekannten Zutaten** → Mitigation: Nutzer kann einzelne Vorschläge abwählen, alles bleibt optional im Dialog
- **[Risk] season_start/season_end könnten über den Jahreswechsel gehen (z.B. 10–3 für Wintergemüse)** → Mitigation: UI und Query-Logik prüft `start > end` und interpretiert als übergreifend. Im Zweifel zwei Saison-Blöcke manuell
- **[Risk] cooking_factor hat keinen physikalischen Standard — Werte variieren je nach Quelle** → Mitigation: Prompt bittet um "typischen Wert", nicht um exakte Wissenschaft. Bereich 1.0–5.0 ist plausibel
- **[Risk] 3-Spalten-Layout auf Tablet (768-896px) eng** → Mitigation: Bei <896px auf 2 Spalten, bei <640px auf 1 Spalte. Tailwind responsive Grid: `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

## Open Questions

- Keine — alle Design-Entscheidungen sind geklärt
