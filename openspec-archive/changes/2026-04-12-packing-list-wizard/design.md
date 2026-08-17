## Context

Die Packlisten-App hat aktuell zwei getrennte Item-Kataloge (Seed in `seed_packing_lists.py` mit ~127 Items/16 Kategorien und Suggestion in `suggestion_service.py` mit ~240 Items/18 Kategorien), die auseinanderdriften. Templates sind statische Konfigurationen ohne Metadaten. Neue Packlisten entstehen entweder leer oder als 1:1-Klon eines Templates. Es gibt kein Autocomplete beim Item-Hinzufügen und keine kontextbasierte Empfehlung.

Betroffene Dateien:
- `backend/packinglist/models.py` — PackingList Model (neue Felder)
- `backend/packinglist/schemas.py` — Pydantic-Schemas (neue + geänderte)
- `backend/packinglist/api.py` — Neue Endpoints
- `backend/packinglist/services/suggestion_service.py` — Unified Catalog + Builder
- `backend/packinglist/management/commands/seed_packing_lists.py` — Komplett umschreiben
- `frontend/src/schemas/packingList.ts` — Zod-Schemas (neue + geänderte)
- `frontend/src/api/packingLists.ts` — Neue Hooks
- `frontend/src/pages/PackingListWizardPage.tsx` — Neue Seite
- `frontend/src/pages/PackingListDetailPage.tsx` — Autocomplete in QuickAddItem
- `frontend/src/pages/PackingListsPage.tsx` — "Neue Packliste" → Wizard
- `frontend/src/App.tsx` — Neue Route

## Goals / Non-Goals

**Goals:**
- Unified Catalog als Single Source of Truth für alle Item-Daten (Wizard, Suggestions, Autocomplete, Seed)
- Dynamische Packlisten-Erstellung basierend auf Kontext (Aktivität, Dauer, Jahreszeit, Altersstufe)
- Wizard-UI unter `/packing-lists/new` mit fließendem, modernem Flow
- Autocomplete im Item-Eingabefeld gegen den Katalog (client-seitig)
- Kontext auf PackingList speichern für KI-Vorschläge und Analytics

**Non-Goals:**
- Kein Community-Template-System (User-erstellte Templates für andere)
- Keine serverseitige Autocomplete-API (Katalog ist klein genug für client-seitig)
- Keine Drag-and-Drop-Sortierung (bestehendes offenes Thema, separater Change)
- Kein Offline-Support
- Keine Event-Integration des Wizards (Packliste direkt aus Event erstellen — separater Change)

## Decisions

### 1. Unified Catalog als Python-Dict mit erweitertem Tag-System

**Entscheidung:** Ein einzelner `UNIFIED_CATALOG: dict[str, list[tuple]]` in `suggestion_service.py` ersetzt beide bestehenden Kataloge. Item-Format wird auf 5-Tuple erweitert: `(name, quantity, description, tags, is_do_not_bring)`.

**Tags werden in drei Dimensionen strukturiert:**

| Dimension | Tags | Bedeutung |
|-----------|------|-----------|
| Priorität | `basis`, `standard`, `erweitert` | Wie wichtig ist das Item? |
| Kontext | `zeltlager`, `hausfahrt`, `hajk`, `wanderung`, `radtour`, `kanutour`, `stadtfahrt`, `gruppenstunde`, `sommer`, `winter`, `uebergang`, `1-tag`, `wochenende`, `1-woche`, `2-wochen-plus`, `woelflinge`, `jufis`, `pfadis`, `rover` | Wann passt das Item? |
| Ausschluss | `!woelflinge`, `!1-tag`, etc. | Wann passt es explizit NICHT? |

**Warum nicht Datenbank?** Der Katalog ändert sich selten, hat <300 Items, und muss von Builder, Suggestions und Autocomplete gleichermaßen gelesen werden. Ein Python-Dict ist schneller, einfacher testbar und braucht keine Migration bei Änderungen.

**Alternative verworfen:** Katalog als Django Model — unnötige Komplexität, Admin-UI nötig, Migrations bei jeder Katalog-Änderung.

### 2. Builder-Algorithmus: Tag-basiertes Matching mit Prioritätsstufen

**Entscheidung:** Der Builder filtert Items in drei Schritten:

```
Schritt 1: Ausschluss-Tags prüfen
  → Item hat "!woelflinge" und User wählte "woelflinge" → raus

Schritt 2: Prioritäts-Tag bestimmen
  → "basis": Item ist immer dabei (Zahnbürste, Schlafsack)
  → "standard": Item dabei wenn mindestens ein Kontext-Tag matcht
  → "erweitert": Item dabei wenn Dauer ≥ 1-woche UND Kontext-Tag matcht

Schritt 3: Kontext-Match
  → Prüfe ob items Kontext-Tags mit User-Auswahl überlappen
  → "basis"-Items überspringen diesen Schritt
```

Items ohne Prioritäts-Tag werden als `standard` behandelt.

**Warum nicht KI-basiert?** Determinismus, Geschwindigkeit (<50ms), keine API-Kosten. KI-Vorschläge existieren bereits als separates Feature für "noch mehr Items".

### 3. Kontext-Felder auf PackingList Model (nicht JSONField)

**Entscheidung:** Vier neue nullable CharField-Felder statt einem JSONField:

```python
activity_type = CharField(max_length=30, null=True, blank=True)
duration = CharField(max_length=20, null=True, blank=True)
season = CharField(max_length=20, null=True, blank=True)
age_group = CharField(max_length=20, null=True, blank=True)
```

**Warum nicht JSONField?** Einzelne Felder sind filterbar per Django ORM (`PackingList.objects.filter(season="sommer")`), validierbar per Pydantic-Enum, und dokumentieren die Struktur im Model selbst.

**Migration:** `uv run python manage.py makemigrations packinglist && uv run python manage.py migrate`

### 4. API-Endpoint `POST /api/packing-lists/generate/`

**Entscheidung:** Eigener Endpoint statt Erweiterung von `POST /api/packing-lists/`:

```
POST /api/packing-lists/generate/
Request:  GeneratePackingListIn { title, context: { activity, duration, season, age_group } }
Response: PackingListOut (die fertige Liste mit allen Kategorien/Items)
```

Der Endpoint:
1. Validiert den Kontext
2. Ruft `build_dynamic_list(context)` auf
3. Erstellt PackingList + PackingCategory + PackingItem Objekte
4. Gibt die fertige Liste zurück (gleiche Response wie `GET /{id}/`)

**Warum eigener Endpoint?** Separation of Concerns — `POST /` erstellt eine leere Liste, `POST /generate/` erstellt eine vorausgefüllte. Verschiedene Request-Schemas, verschiedene Logik.

### 5. Autocomplete: Client-seitig mit vollem Katalog-Download

**Entscheidung:** Der gesamte Unified Catalog (~250 Items) wird einmalig per `GET /api/packing-lists/catalog/` geladen und im Frontend per String-Match gefiltert.

```
Frontend:
1. useFullCatalog() → lädt alle ~250 Items beim Mounten der DetailPage (staleTime: 1h)
2. User tippt in QuickAddItem
3. Lokale Filterung: item.name.toLowerCase().includes(query) || item.tags matchesQuery
4. Dropdown zeigt Top-8 Matches + "als neuen Gegenstand anlegen"
5. Bei Auswahl: quantity + description werden aus Katalog übernommen
```

**Warum nicht debounced API-Calls?** Bei ~250 Items ist lokale Filterung instantan (<1ms), kein Netzwerk-Latenz, kein Server-Load. Fühlt sich schneller an.

### 6. Wizard als eigene Route `/packing-lists/new`

**Entscheidung:** Eigene Seite statt Modal/Sheet. Der Wizard hat zwei Phasen:

**Phase 1 — Aktivitätstyp wählen:**
- Grid aus Chips/Karten (Zeltlager, Hausfahrt, Wanderung, Radtour, Kanutour, Stadtfahrt, Hajk, Gruppenstunde)
- "Leere Liste erstellen" als Escape-Hatch → altes `POST /api/packing-lists/` Verhalten
- Presets: Vordefinierte Kontext-Kombinationen als Schnellwahl (z.B. "Sommerlager" = Zeltlager + Sommer + 1 Woche)

**Phase 2 — Details (animiert einblenden nach Phase 1):**
- Dauer, Jahreszeit, Altersstufe als Chip-Gruppen
- Titel-Eingabefeld (auto-generierter Vorschlag basierend auf Auswahl)
- Live-Vorschau: "~67 Gegenstände in 8 Kategorien" aktualisiert sich bei jeder Änderung
- "Packliste erstellen" Button → `POST /generate/` → Redirect zu `/packing-lists/{id}`

**Warum eigene Route?** Mobile-friendly (Sheet wird bei 320px eng), URL teilbar, saubere State-Trennung.

### 7. Preset-System ersetzt statische Templates

**Entscheidung:** Die 12 bestehenden Seed-Templates werden zu Presets — vordefinierte Kontext-Kombinationen, die den Wizard vorausfüllen:

```python
PRESETS = [
    {
        "name": "Sommerlager",
        "icon": "wb_sunny",
        "context": {"activity": "zeltlager", "duration": "1-woche", "season": "sommer"},
    },
    {
        "name": "Winter-Hajk",
        "icon": "ac_unit",
        "context": {"activity": "hajk", "duration": "wochenende", "season": "winter"},
    },
    ...
]
```

Presets leben im Backend (in `suggestion_service.py` oder eigenem `presets.py`) und werden per `GET /api/packing-lists/presets/` ausgeliefert. Der Wizard zeigt sie als Schnellwahl-Karten.

**Was passiert mit bestehenden Template-PackingLists in der DB?** Der Seed-Command wird umgeschrieben. Alte Templates werden beim nächsten `--clear`-Run gelöscht. Neue "Presets" sind keine DB-Einträge mehr sondern reine Konfiguration.

### 8. Live-Vorschau im Wizard

**Entscheidung:** Der Wizard zeigt eine Echtzeit-Vorschau der resultierenden Packliste (Anzahl Kategorien, Anzahl Items, Kategorie-Namen). Dafür wird der Builder-Algorithmus sowohl Backend- als auch Frontend-seitig verfügbar gemacht:

- **Backend:** `POST /api/packing-lists/preview/` — gibt nur Kategorie-Namen + Item-Counts zurück (kein DB-Write)
- **Frontend:** Ruft den Preview-Endpoint bei jeder Kontext-Änderung auf (debounced, 300ms)

**Alternative verworfen:** Builder-Logik komplett ins Frontend duplizieren — zu viel Wartungsaufwand, Katalog müsste komplett übertragen werden mit allen Tags.

## Risks / Trade-offs

**[Tag-Qualität bestimmt Ergebnis-Qualität]** → Jedes Item muss sorgfältig getaggt werden. Falsche Tags = falsche Packlisten. Mitigation: Gründliche manuelle Review aller ~250 Items bei der Katalog-Vereinigung.

**[Verlust der Template-Klon-Funktion]** → User die bisher Templates klonten, bekommen jetzt dynamisch generierte Listen. Die Ergebnisse können sich leicht unterscheiden. Mitigation: Presets sollen die gleichen Kombinationen wie die alten Templates abbilden.

**[Katalog-Größe wächst]** → Bei 250 Items ist client-seitiges Autocomplete kein Problem. Bei 1000+ müsste auf serverseitiges Matching umgestellt werden. Mitigation: Aktuell irrelevant, kann später umgebaut werden.

**[Wizard-Komplexität auf Mobile]** → Zwei Phasen mit vielen Chips auf 320px. Mitigation: Chips wrappen automatisch, Phase 2 scrollt vertikal, Mobile-First-Design.

## Open Questions

- Sollen Presets im Wizard prominent als Karten angezeigt werden (vor der manuellen Auswahl) oder eher als "Schnellwahl"-Leiste?
- Soll der Titel auto-generiert werden (z.B. "Sommer-Zeltlager 2026") oder muss der User ihn immer selbst eingeben?
