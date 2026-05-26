## Context

Die `packinglist` App bietet aktuell eine funktionale Packlisten-Verwaltung mit Kategorien, Items, Checkboxen und Clone/Export-Funktionen. Jede PackingList ist über ihre ID-URL öffentlich lesbar. Items werden inline in der `PackingListDetailPage` bearbeitet — es gibt keine separate Detailansicht. Es existiert kein Konzept für "Nicht mitbringen"-Items und keine Sichtbarkeitssteuerung.

**Betroffene Dateien:**
- `backend/packinglist/models.py` — Model-Erweiterungen
- `backend/packinglist/schemas.py` — Pydantic-Schemas
- `backend/packinglist/api.py` — API-Endpunkte
- `backend/packinglist/management/commands/seed_packing_lists.py` — Testdaten
- `frontend/src/schemas/packingList.ts` — Zod-Schemas
- `frontend/src/api/packingLists.ts` — TanStack Query Hooks
- `frontend/src/pages/PackingListDetailPage.tsx` — Detail-Seite + Item-Detail-Modal
- `frontend/src/pages/PackingListsPage.tsx` — Sichtbarkeits-Toggle bei Erstellung/Bearbeitung
- Neue Datei: `frontend/src/pages/PackingListSharePage.tsx` — Share-Link Ansicht

## Goals / Non-Goals

**Goals:**
- Items klickbar machen mit Detail-Modal (Beschreibung, Menge, Supply-Referenz)
- "Nicht mitbringen"-Items als eigenes Item-Flag mit visueller Abgrenzung
- Sichtbarkeitssteuerung: `private` und `link_only` Visibility-Modi
- Share-Links mit UUID-Token, die eigenen Check-State pro Besucher haben
- Erweiterte Seed-Daten mit "Nicht mitbringen"-Einträgen und mehr Items

**Non-Goals:**
- Öffentliche Packlisten-Suche / Galerie (nur Templates bleiben öffentlich)
- Echtzeit-Kollaboration (mehrere Benutzer gleichzeitig)
- Item-Kommentare oder -Diskussionen
- Benachrichtigungen bei Share-Link-Nutzung
- User-Registrierung für Share-Link-Besucher (anonym nutzbar)

## Decisions

### 1. Item-Detail als Modal statt eigene Seite

**Entscheidung:** Slide-over Panel (Sheet) von rechts, kein Router-Wechsel.

**Alternativen:**
- **Eigene Seite `/packing-lists/:id/items/:itemId`**: Zu viel Navigation-Overhead für wenig Content. Items haben nur Name, Menge, Beschreibung und optional Supply-Link.
- **Inline-Expandable**: Stört den Listenfluss, schwierig bei langen Beschreibungen auf Mobile.

**Begründung:** Ein Sheet (shadcn/ui) ist mobile-freundlich, behält den Listenkontext sichtbar und erfordert keine neuen Routen. Das Sheet zeigt: Name, Menge, Beschreibung (Markdown), Supply-Link falls vorhanden, "Nicht mitbringen"-Badge.

### 2. `is_do_not_bring` als Boolean-Feld am PackingItem

**Entscheidung:** Einfaches `BooleanField` am `PackingItem` statt separater Kategorie-Typ.

**Alternativen:**
- **Eigener Kategorie-Typ `do_not_bring`**: Würde eine Kategorie erzwingen, die "Nicht mitbringen" heißt. Inflexibel — User könnten Items in verschiedenen Kategorien als "nicht mitbringen" markieren wollen.
- **Enum-Feld `item_type` mit `bring`/`do_not_bring`**: Over-engineering für einen binären Zustand.

**Begründung:** Ein Boolean ist einfach, erlaubt Items in jeder Kategorie als "nicht mitbringen" zu markieren und ist leicht filterbar. Frontend zeigt diese Items mit rotem Durchstreichen + Verbots-Icon. `is_checked` wird für `is_do_not_bring=True` Items ignoriert (immer unchecked, Checkbox hidden).

### 3. Visibility-Feld mit TextChoices statt separatem Boolean

**Entscheidung:** `visibility = CharField(choices=["private", "link_only"], default="link_only")` am `PackingList`.

**Alternativen:**
- **`is_public` Boolean**: Zu wenig Granularität für zukünftige Erweiterungen (z.B. `group_only`).
- **Separates `ShareSettings` Model**: Over-engineering für den aktuellen Bedarf.

**Begründung:** TextChoices sind erweiterbar und selbst-dokumentierend. Default `link_only` bewahrt das bisherige Verhalten (jeder mit URL kann lesen). `private` beschränkt den Lesezugriff auf Owner + Gruppen-Admins + Staff. Templates (`is_template=True`) bleiben immer öffentlich, unabhängig von `visibility`.

### 4. Share-Link mit UUID-Token und eigenem Check-State

**Entscheidung:** Neues Model `PackingListShare` mit `token: UUIDField(unique, default=uuid4)` und verknüpftem `PackingListShareCheck` für den Check-State.

**Datenmodell:**
```
PackingListShare
  - packing_list: FK → PackingList (CASCADE)
  - token: UUIDField (unique, default=uuid4)
  - label: CharField(100) — z.B. "Für Max", "Trupplink"
  - is_active: BooleanField (default=True)
  - created_at: DateTimeField

PackingListShareCheck
  - share: FK → PackingListShare (CASCADE, related: "checks")
  - item: FK → PackingItem (CASCADE)
  - is_checked: BooleanField (default=False)
  - unique_together: (share, item)
```

**Begründung:** Jeder Share-Link hat ein UUID-Token in der URL (`/packing-lists/shared/<token>`). Besucher können Items abhaken — der Check-State wird im `PackingListShareCheck` gespeichert und verändert nicht den Original-`is_checked` des `PackingItem`. Kein Login nötig. Der Owner sieht eine Liste seiner Share-Links im Packlisten-Management.

**Alternativen:**
- **Cookie-basierter State**: Geht bei Browser-Wechsel verloren, kein Server-Sync.
- **LocalStorage**: Gleiche Probleme wie Cookies. Kein Einblick für den Owner.

### 5. API-Endpunkt-Änderungen

**Neue Endpunkte:**

| Method | Path | Auth | Beschreibung |
|--------|------|------|-------------|
| POST | `/api/packing-lists/{id}/shares/` | Required + edit | Share-Link erstellen |
| GET | `/api/packing-lists/{id}/shares/` | Required + edit | Alle Share-Links auflisten |
| DELETE | `/api/packing-lists/{id}/shares/{share_id}/` | Required + edit | Share-Link deaktivieren |
| GET | `/api/packing-lists/shared/{token}/` | Public | Packliste per Share-Token laden (inkl. Check-State) |
| PATCH | `/api/packing-lists/shared/{token}/checks/` | Public | Check-State für Share-Link aktualisieren |

**Geänderte Endpunkte:**

| Endpunkt | Änderung |
|----------|----------|
| `GET /api/packing-lists/{id}/` | Prüft `visibility`: bei `private` nur für Owner/Admins/Staff; bei `link_only` weiterhin öffentlich |
| `POST /api/packing-lists/` | Akzeptiert `visibility` im Request |
| `PATCH /api/packing-lists/{id}/` | Akzeptiert `visibility` im Request |
| `PackingItemOut` Schema | Neues Feld `is_do_not_bring: bool` |
| `PackingItemCreateIn` Schema | Neues optionales Feld `is_do_not_bring: bool = False` |
| `PackingItemUpdateIn` Schema | Neues optionales Feld `is_do_not_bring: bool | None = None` |
| `PackingListOut` Schema | Neues Feld `visibility: str`, neues Feld `shares: list[ShareOut]` (nur für Owner) |
| `PackingListCreateIn` Schema | Neues Feld `visibility: str = "link_only"` |
| `PackingListUpdateIn` Schema | Neues optionales Feld `visibility: str | None = None` |

### 6. Frontend-Routing für Share-View

**Neue Route:** `/packing-lists/shared/:token` → `PackingListSharePage`

Diese Seite ist eine vereinfachte Read-Only-Ansicht der Packliste mit Checkboxen für den Share-eigenen State. Kein Login erforderlich. Header zeigt Listentitel, "Nicht mitbringen"-Items sind sichtbar aber nicht abhakbar. Fortschrittsbalken zeigt Share-eigenen Check-State.

## Risks / Trade-offs

- **[Unbegrenztes Share-Token-Raten]** → UUIDs (128 Bit) sind praktisch nicht erratbar. Zusätzlich `is_active` Flag für Deaktivierung.
- **[Check-State Datenwachstum]** → Bei vielen Share-Links + Items wächst `PackingListShareCheck` Tabelle. → Mitigation: Checks werden erst bei Klick erstellt (lazy), nicht voraus-generiert. Inaktive Shares können periodisch bereinigt werden.
- **[Migration bestehender Daten]** → Bestehende PackingLists bekommen `visibility="link_only"` als Default, was das bisherige Verhalten bewahrt. Keine Daten-Migration nötig.
- **[Frontend-Komplexität]** → Die Share-Page ist eine zweite Ansicht der Packliste mit anderem State-Modell (Share-Checks statt Item-Checks). → Mitigation: Gemeinsame Darstellungskomponenten extrahieren, nur State-Logik unterschiedlich.

## Migrations

Eine neue Migration für die `packinglist` App:
1. `PackingList.visibility` — CharField mit Default `"link_only"`
2. `PackingItem.is_do_not_bring` — BooleanField mit Default `False`
3. Neues Model `PackingListShare` (token, label, is_active, packing_list FK)
4. Neues Model `PackingListShareCheck` (share FK, item FK, is_checked, unique_together)

## Open Questions

Keine — alle wesentlichen Entscheidungen sind getroffen.
