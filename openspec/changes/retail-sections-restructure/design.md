## Context

Ist-Zustand der echten Datenbank (geprüft via Django-Shell):

```
12 RetailSections, alle rank=0:
  Brot & Backwaren, Fleisch & Fisch, Gemüse, Getränke, Gewürze & Kräuter,
  Konserven & Gläser, Kühlung, Milchprodukte & Käse, Nudeln & Reis & Getreide,
  Obst, Öle & Soßen, Tiefkühl

235 Zutaten, davon 24 (~10 %) ohne retail_section.
```

Das Auto-Mapping (`backend/supply/services/retail_section_mapping.py`) hat 16 Zielnamen; davon existieren 10 in der DB, **6 fehlen**: `Fleisch & Wurst`, `Hülsenfrüchte & Nüsse`, `Süßwaren & Snacks`, `Kaffee und Tee`, `Getränke ohne Alkohol`, `Gewürze`. Umgekehrt nutzt das Mapping die DB-Gruppen `Getränke` und `Kühlung` nie. Alkohol-Keywords (BIER, SEKT, SPIRITUOSE, LIKOER/LIKÖR) zeigen auf `Getränke ohne Alkohol` (`retail_section_mapping.py:206-210`). Der Seed (`seed_all.py:381-394`) legt 12 wieder andere Namen an — die DB wurde offensichtlich nicht über diesen Seed befüllt.

Constraints: Minimaler Eingriff gewünscht — bestehende 12 DB-Namen behalten, nur ergänzen/angleichen. Keine Rückwärtskompatibilität nötig. `uv run`. Migrationen neu, nicht in-place. Deutsche Namen.

## Goals / Non-Goals

**Goals:**
- Keine Zutat bleibt mangels existierender Zielgruppe ohne Warengruppe.
- Mapping-Zielnamen entsprechen exakt existierenden Warengruppen (per Test abgesichert).
- Alkoholische Getränke korrekt zugeordnet.
- Sinnvolle `rank`-Reihenfolge statt `rank = 0`.
- Eine gemeinsame Konstante für Seed, Mapping, Legacy-Import.

**Non-Goals:**
- Kein Neuaufbau auf eine 20-Gruppen-Struktur (bewusst minimal, bestehende 12 Namen bleiben).
- Keine Umbenennung der bestehenden 12 DB-Gruppen.
- Keine KI-basierte Zuordnung.

## Decisions

### D1: Katalog = bestehende DB-Namen + Ergänzungen
`RETAIL_SECTIONS` (neue `backend/supply/data/retail_sections.py`) enthält die real existierenden Namen plus die fehlenden, inkl. `rank` (Laden-Rundgang). Die bestehende Gruppe `Getränke` wird zu `Alkoholfreie Getränke` umbenannt (siehe D2). Katalog:

```
 1 Obst
 2 Gemüse
 3 Brot & Backwaren
 4 Fleisch & Fisch
 5 Fleisch & Wurst            (neu)
 6 Milchprodukte & Käse
 7 Kühlung
 8 Nudeln & Reis & Getreide
 9 Konserven & Gläser
10 Öle & Soßen
11 Gewürze & Kräuter
12 Gewürze                    (neu; vom Mapping für Asia/Mexikan genutzt)
13 Hülsenfrüchte & Nüsse      (neu)
14 Süßwaren & Snacks          (neu)
15 Kaffee und Tee             (neu)
16 Alkoholfreie Getränke      (Umbenennung von "Getränke")
17 Alkoholische Getränke      (neu)  -- siehe D3
18 Tiefkühl
19 Sonstiges                  (neu; Auffanggruppe, siehe D6)
```

- **Warum**: behält den Bestand, schließt nur die Lücken, gibt eine sinnvolle Reihenfolge.

### D2: Getränke-Gruppen (Entscheidung getroffen)
Die bestehende DB-Gruppe `Getränke` (8 Zutaten) wird zu `Alkoholfreie Getränke` **umbenannt** — die 8 Zutaten wandern automatisch mit. Es gibt damit genau zwei klar benannte Getränke-Gruppen: `Alkoholfreie Getränke` und `Alkoholische Getränke`. Alkoholfreie Getränke-Keywords (SAFT, WASSER, LIMONADE, EISTEE, SOFTDRINK, NEKTAR) → `Alkoholfreie Getränke`.

- **Hinweis**: Dies ist die einzige Umbenennung einer Bestandsgruppe (bewusste Abweichung vom „keine Umbenennung"-Prinzip), da die generische Gruppe „Getränke" zugunsten der klaren Trennung aufgelöst wird.

### D3: Alkohol eigene Gruppe
Neue Gruppe `Alkoholische Getränke`; Keywords BIER, SEKT, SPIRITUOSE, LIKOER/LIKÖR werden ihr zugeordnet statt der bisherigen Fehlzuordnung.

### D4: `rank` für alle setzen
Datenmigration setzt `rank` gemäß Katalog für bestehende und neue Gruppen.

### D5: Single Source of Truth
Seed, Mapping (`_get_retail_section_by_name`) und Legacy-Import referenzieren `RETAIL_SECTIONS`. Test: `set(mapping targets) ⊆ {r["name"] for r in RETAIL_SECTIONS}`.

### D6: Auffanggruppe „Sonstiges" + automatisches Re-Mapping
Eine Auffanggruppe `Sonstiges` wird angelegt. Der idempotente Command versucht, alle aktuell unzugeordneten Zutaten (real ~24) über das nun vollständige Keyword-Mapping automatisch zuzuordnen; nicht zuordenbare Zutaten erhalten `Sonstiges` statt keiner Gruppe.

### Betroffene Dateien
- Backend: `backend/supply/data/retail_sections.py` (neu), `backend/supply/services/retail_section_mapping.py` (Alkohol, Synonyme, Zielnamen), `backend/core/management/commands/seed_all.py`, Legacy-Import-Command, Datenmigration/Command.
- Frontend: keine Strukturänderung.

### API-Änderungen
- Keine.

## Risks / Trade-offs

- **Re-Mapping ändert bestehende Zuordnungen** → idempotenter Command; nur Zutaten ohne Gruppe bzw. mit Alkohol-Fehlzuordnung neu zuordnen, Bestand sonst unangetastet.
- **`Getränke` vs. `Getränke ohne Alkohol` Doppelung** → Open Question; minimal-Variante ggf. nur `Getränke` + `Alkoholische Getränke`.
- **rank-Konflikte** → Datenmigration setzt rank deterministisch aus Katalog.

## Migration Plan

1. `RETAIL_SECTIONS`-Konstante (12 Bestand + 6 neu, mit rank).
2. Seed + Mapping + Legacy-Import auf Konstante umstellen; Alkohol-Zuordnung fixen.
3. Idempotenter Command/Migration: fehlende Gruppen anlegen, rank setzen, Zutaten ohne Gruppe + Alkohol-Fehlzuordnungen neu mappen.
4. Tests (Konsistenz, Alkohol, keine Zutat ohne Gruppe).
5. Rollback: code-seitig; angelegte Gruppen/ranks per reverse dokumentieren.

## Open Questions

- (geklärt) Getränke: `Getränke` → `Alkoholfreie Getränke` umbenennen + neue `Alkoholische Getränke`.
- (geklärt) Unzugeordnete Zutaten: automatisch neu mappen, Rest → `Sonstiges`.
