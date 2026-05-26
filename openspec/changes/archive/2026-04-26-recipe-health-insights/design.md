# Design — recipe-health-insights

## Context

Die Gesundheits-Sektion der Detailseite vermittelt nach Changes #1–#3 zwei Dinge gut: den aggregierten Nutri-Score (Badge) und konkrete Verbesserungshinweise (Top-5 Improvements). Was fehlt:

1. **Positive Verstärkung**: Ein Rezept mit Nutri-Score C kann trotzdem „ballaststoffreich" und „salzarm" sein. Diese Einzelstärken bleiben aktuell unsichtbar.
2. **Transparenz über Beiträge**: Wer wissen will, *warum* ein Rezept z.B. salzreich ist, findet die Antwort nur indirekt über den Improvement-Vorschlag. Für neutrale oder positive Parameter gibt es keine analoge Aufschlüsselung.

## Goals

- Positive Eigenschaften als eigenständige, deutlich sichtbare Chips kommunizieren
- Für jeden relevanten Nährwert-Parameter auf Abruf zeigen, welche Zutaten ihn dominieren
- Keine zusätzlichen API-Roundtrips — Daten kommen mit dem bestehenden Nutrition-Breakdown-Endpoint

## Non-Goals

- Admin-konfigurierbare Trait-Schwellenwerte (fest, DGE-basiert)
- LLM-generierte Erklärungen, warum Trait X gilt
- Vergleich zu anderen Rezepten („ballaststoffreicher als 80% vergleichbarer Rezepte") — später ggf. eigenes Feature

## Decisions

### Decision 1: Trait-Thresholds hardcoded

**Decision**: Schwellenwerte für `high_fiber`, `high_protein`, `low_salt`, `low_sat_fat`, `low_sugar`, `balanced` sind Code-Konstanten, basierend auf DGE-Empfehlungen bzw. EU-Claim-Verordnung für Nährwertangaben (EC 1924/2006).

**Werte (pro 100g Rezept)**:
- `high_fiber`: ≥ 6 g
- `high_protein`: Protein liefert ≥ 20 % der Energie
- `low_salt`: ≤ 0,3 g
- `low_sat_fat`: ≤ 1,5 g
- `low_sugar`: ≤ 5 g
- `balanced`: Nutri-Score-Punkte in [−1, +4] (mittleres Drittel)

**Rationale**: EU-Nährwertclaim-Verordnung ist rechtlich belastbar, für Nutzer verständlich, reproduzierbar. HealthRule-Infrastruktur ist für Improvements (konfigurierbar pro Organisation) gedacht, Traits sind absolute Fakten.

**Alternatives considered**:
- Traits ebenfalls über HealthRule → führt zu Konfigurationschaos, DGE-Werte werden nicht überall gleich sein
- Prozentualer Anteil vom DGE-Tagesbedarf → auf 100g nicht sinnvoll normalisierbar

### Decision 2: Traits per 100g, nicht per Portion

**Decision**: Alle Trait-Checks beziehen sich auf `per_100g`-Werte.

**Rationale**: EU-Claim-Verordnung arbeitet mit 100g als Referenz. Portionen-unabhängig, macht Rezepte vergleichbar.

### Decision 3: Contributions im Breakdown, nicht separater Endpoint

**Decision**: `RecipeItemNutritionOut` wird um `contributions: ContributionOut[]` erweitert. Ein Item kann so seinen Beitrag zu mehreren Parametern gleichzeitig ausweisen.

**Alternatives considered**:
- Separater Endpoint `/contributions/` → zusätzlicher Request, während die Daten bereits aus dem Breakdown ableitbar sind
- Rechnen im Frontend allein aus den existierenden Item-Feldern → möglich, aber redundant und fehleranfällig; zentrale Berechnung im Backend ist robuster

### Decision 4: Contribution als absolute + prozentuale Werte

**Decision**: Jede `ContributionOut` enthält `parameter` (enum), `absolute` (float, in Parameter-Einheit), `percent_of_recipe` (float, 0–100).

**Rationale**: Absolute Werte für Transparenz („Tomatensoße liefert 1,2g Salz"), prozentuale für Ranking und Balken-Visualisierung („45 % des Rezept-Salzes kommen von der Tomatensoße").

### Decision 5: Top-5 Anzeige mit „weitere" Toggle

**Decision**: Frontend zeigt Top-5 Contributors pro Parameter. Ein Toggle-Button „+N weitere anzeigen" expandiert den Rest.

**Rationale**: Typisch haben Rezepte 5–15 Items. Top-5 trägt meist 80 % bei (Pareto). Vollständigkeit auf Abruf.

### Decision 6: Badge-Icons und -Farben

**Decision**: Jeder Trait hat fixiertes Icon (Lucide) und grüne Akzentfarbe (`text-emerald-700 bg-emerald-50 border-emerald-200`).

**Mapping**:
- `high_fiber` → `Wheat`
- `high_protein` → `Beef` (oder `Drumstick`)
- `low_salt` → `MinusCircle` + „salzarm"
- `low_sat_fat` → `Heart` + „fettarm (gesättigt)"
- `low_sugar` → `Candy` mit Strike-through-Konzept oder `CircleOff`
- `balanced` → `Scale`

**Rationale**: Konsistenz mit shadcn/ui-Icon-Sprache; grün signalisiert „positiv" eindeutig.

### Decision 7: Wo in der UI?

**Decision**: Positive Traits direkt unterhalb des Nutri-Score-Hauptblocks in der Gesundheits-Sektion der Hauptspalte, **vor** der Improvements-Liste. Contribution-Panel als expandable Accordion-Items innerhalb des Nutrition-Breakdown-Blocks.

**Rationale**: „Was ist gut" vor „Was kann besser werden" — UX-typisch positiv framen. Contribution gehört zum Breakdown, weil semantisch zusammengehörend.

## Risks / Trade-offs

- **Trait-Sprache**: Deutsche Labels müssen klar, nicht marketingy sein. „Ballaststoffreich" statt „super ballaststoff-power"
- **Falsche Positivsignale**: Ein Rezept kann `low_sugar` und `low_salt` haben, aber trotzdem Nutri-Score D wegen hohem gesättigtem Fett. Mitigiert durch `balanced`-Trait, der nur bei insgesamt mittlerem Nutri-Profil auslöst.
- **Payload-Größe**: Breakdown-Response wächst um `contributions`-Arrays pro Item. Bei 15 Items × 8 Parameter = 120 zusätzliche Objekte. Akzeptabel (wenige KB), aber beobachten.
