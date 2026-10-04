## Context

Heute: `IntelligentSuggestionsService` (`backend/planner/services/intelligent_suggestions_service.py`) liefert 9 Rezepte (top_picks/variety/discovery) mit Scoring (Saison, Beliebtheit, Vielfalt, Aktualität, Budget) und optionalem Gemini-Rerank. „Was passt hier?“ nutzt `GET /recipes/suggestions/?random=true`. Einzelzutaten werden nie vorgeschlagen; Kontext kennt der Dienst nur über Event-Name, Tags, Budget, `nutritional_tags`.

Datenlage (Fixtures `backend/data/food`, 248 approved Rezepte, 3.898 Zutaten, 221 verified): `is_standalone_food` überall `False`; `preparation_time` überall `none`; `difficulty` 244/248 `easy`; `execution_time` 245/248 `less_30`; `child_score` bei 3.378 Zutaten `1` (Platzhalter); `camp_suitable`, `storage_type`, `preparation_time_min`, Saison praktisch leer; `preparation_method` leer; Rezept-Embeddings 233/248, Zutaten-Embeddings 0; 1 süßes Getränk-Rezept, 20 Frühstücksrezepte.

## Goals / Non-Goals

**Goals:**
- 16 Vorschläge je Klick (4 Richtungen × 4), bildlos, Rezepte + Einzelzutaten je Meal-Typ.
- Kontext (Altersgruppe, Setting, Kochquelle, Kühlung, Budget, Saison) wirkt auf Filter und Ranking.
- Deterministisch und ohne KI-Kosten nutzbar; KI nur Zauberstab und optionales Umsortieren.
- Nachweisbare Abdeckung je Richtung/Filter.

**Non-Goals:**
- Kein neuer Slot-Typ Nachtisch/Beilage.
- Kein Auto-Anlegen freigegebener Zutaten durch KI.
- Keine Änderung der Kosten-/Nährwertberechnung der Pläne.
- Kein Umbau von `MealTypeChoices`.

## Decisions

1. **Service-Package `planner/services/suggestion_panel/`** mit Modulen `directions.py` (Richtungs-Definitionen je Meal-Typ als Daten), `candidates.py` (Hard-Filter), `traits.py`, `scoring.py`, `diversity.py`, `relax.py`, `wand.py`. Alte Klasse und Endpoint werden entfernt (keine Rückwärtskompatibilität nötig).
2. **Richtungen als Konfiguration, nicht als Code-Zweige:** Jede Richtung ist ein Prädikat über abgeleitete Merkmale plus Typ-Quote (Rezept/Zutat). Beispiele: Frühstück = Brot & Aufstrich, Müsli & Brei, Warm, Obst & Joghurt; Snack = Obst & Gemüse, Süß, Herzhaft, Selbstgemacht; Getränke = Kalt, Warm, Selbstgemischt, Fertiggetränk; Mittag/Abend = Klassiker, Vegetarisch/Vegan, One-Pot/Lagerfeuer, Schnell & günstig (Abend gewichtet Kaltes/Brotzeit höher, Mittag Warmes), plus Nachtisch-Zusatzrichtung. Alternative (feste Kategorien-Tabelle in DB) verworfen: schwerer zu testen und zu ändern.
3. **Typ-Mischung:** Zielanteil je Meal-Typ (Snack/Getränke 50/50, sonst nur Rezepte); fehlt eine Seite, füllt die andere auf.
4. **Dubletten:** Ausschluss-Scope über alle `MealPlan` des Events (`event_relation`), sonst nur der eigene Plan. Mittag/Abend: `recipe_id` ausgeschlossen; Frühstück: nur am selben Kalendertag; Snack/Getränke: nur nicht doppelt im selben Slot. Einzelzutaten folgen der Regel ihres Meal-Typs.
5. **Ähnlichkeit:** Cosinus-Distanz auf pgvector (`Recipe.embedding`). Weicher Malus gegenüber geplanten Hauptmahlzeiten; innerhalb der 4 Karten einer Richtung wird per greedy MMR gewählt. Zutaten ohne Embedding werden nicht abgewertet, bis ein Backfill gelaufen ist (Embeddings entstehen beim Speichern bereits asynchron).
6. **Kontextfelder am `MealPlan`:** `age_groups` (JSON-Liste), `setting` (Choices), `cooking_sources` (JSON-Liste), `cooling` (Choices), `season_hint` (Choices, Default aus Startdatum). Budget und Ernährungsformen nutzen vorhandene Felder. Alter wird aus `GroupMember`/Teilnehmern abgeleitet, sonst manuell. Der Event-Wizard und die Event-Seite schreiben in den verknüpften Plan. Alternative „am Event“ verworfen, damit Pläne ohne Event funktionieren.
7. **Harte vs. weiche Kriterien:** Hart: Allergien/Ernährungsformen, Kochquelle, Kühlung (bei Frischware), Dubletten, Status `approved`. Weich: Kinderfreundlichkeit, Vorbereitung, Preis, Saison. Unbekannte Merkmale schließen nicht aus und werden leicht abgewertet; bei strengem Filter zählen nur bekannte Werte.
8. **Lockern:** Reihenfolge der weichen Kriterien nach Gewicht aufsteigend; Response enthält `relaxed_filters` für den Hinweistext. „Neu mischen“ nutzt einen `seed`, damit Ergebnisse reproduzierbar testbar sind.
9. **Zauberstab:** Genau ein Gemini-Aufruf (`POST .../suggestions/wand/`) mit Freitext, Kontext und Top-Kandidaten (max. 60). Antwort: Rangfolge + optional neue Zutaten-Namen. Neue Zutaten über den vorhandenen KI-Anlage-Flow als `draft` mit `is_standalone_food=True`; Karten tragen Badge „Neu“; Übernahme in den Plan nur per Klick. Ohne KI-Budget (`AI_OPTIONAL_FALLBACK_CODES`) greift ein Stichwort-Fallback über Name/Tags/Beschreibung.
10. **Merkmals-Ableitung (`traits.py`):** süß/herzhaft aus Zuckeranteil je 100 g (Schwelle 10 g), Vorbereitung aus Zutaten-Frischware/Schrittzahl/Garzeit-Heuristik, kinderfreundlich aus Zucker, Schärfe-/Alkohol-Tags und Warengruppe statt `child_score`, Kochquelle aus Equipment-Tags. Fehlendes wird als neue Tags in `content`/`supply` ergänzt; ein Backfill-Command setzt `is_standalone_food` für Warengruppen Obst, Gemüse, Wasser & Erfrischung, Milch & Pflanzendrinks (Dry-run Default).
11. **API:** `POST /api/planner/{plan_id}/meal/{meal_id}/suggestions/` (Body `SuggestionFilters` + `seed` + `free_text`) → `SuggestionPanelResponse` (`directions[4]`, je `cards[≤4]`, `relaxed_filters`, `missing_context`, `ai_used`). `PATCH` an der bestehenden Plan-Update-Route für Kontextfelder. Frontend: TanStack-Query-Mutation, Zod-Schema synchron zu Pydantic.
12. **UI (`frontend-food/`):** Panel als Sheet/Drawer (mobile-first ab 320 px), Karten ohne Bild: Name, Typ-Chip (Rezept/Zutat), Grund, Preis/Person. Filter-Chips = Antworten des Assistenten; URL-State für den Panel-Zustand nicht nötig (Dialog), Filter-Auswahl in Query-Parametern des Panels wo praktikabel. Übernahme ruft die bestehende Add-Item-Route auf; Undo über den vorhandenen optimistic-undo-Mechanismus.
13. **Abdeckungs-Report:** `manage.py report_suggestion_coverage` zählt je Meal-Typ × Richtung × Einzelfilter × Kontextkombination die Treffer, markiert <4 als Lücke und schreibt Markdown/JSON. Pytest prüft Mindestabdeckung auf Test-Fixtures.

## Risks / Trade-offs

- [Dünne Daten: Getränke, Frühstück] → Lockern + Typ-Auffüllung + Report macht Seed-Backlog sichtbar.
- [Abgeleitete Merkmale ungenau] → Konfidenz „unbekannt“ wertet nur ab, schließt nicht aus; Merkmale im Report sichtbar.
- [Zauberstab erzeugt Müll-Zutaten] → nur Entwurf, Badge „Neu“, Namensvalidierung und Duplikat-Check der Zutaten-Pipeline, Kosten via AI-Budget.
- [Backfill `is_standalone_food` falsch] → Dry-run Default, Review-Liste vor Anwenden; Prod-Schritte nur nach OK.
- [Performance bei Embedding-Distanz] → Kandidaten vorab per SQL begrenzen (≤200), Distanz nur dafür.
- [Breaking: alter Endpoint] → Frontend im selben Change umgestellt.

## Migration Plan

1. Migration für MealPlan-Kontextfelder (alle nullable/leer).
2. Backfill-Commands im Dry-run auf lokaler/Prod-Kopie, Ergebnis prüfen.
3. Backend deployen, dann Frontend; Backfill auf Prod nur nach Freigabe.
4. Rollback: Feature-Endpoint und UI entfernen; Felder sind additiv und harmlos.

## Open Questions

- Schwellen für „süß“ und „kinderfreundlich“ nach Abdeckungsreport kalibrieren.
- Brauchen Zutaten-Embeddings einen Prod-Backfill (aktuell 0 in Fixtures)?
