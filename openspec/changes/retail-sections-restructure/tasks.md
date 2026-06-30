## 1. Katalog-Konstante

- [ ] 1.1 `backend/supply/data/retail_sections.py` anlegen: `RETAIL_SECTIONS` (name, rank) gemäß Katalog in design.md D1 — bestehende DB-Namen + neue (`Fleisch & Wurst`, `Hülsenfrüchte & Nüsse`, `Süßwaren & Snacks`, `Kaffee und Tee`, `Gewürze`, `Alkoholfreie Getränke`, `Alkoholische Getränke`, `Sonstiges`), mit Laden-Rundgang-rank

## 2. Mapping & Seed & Legacy

- [ ] 2.1 `backend/supply/services/retail_section_mapping.py`: alle Zielnamen auf Katalognamen; Alkohol-Keywords (BIER, SEKT, SPIRITUOSE, LIKOER/LIKÖR) → „Alkoholische Getränke"
- [ ] 2.2 Alkoholfreie Getränke-Keywords (SAFT, WASSER, LIMONADE, EISTEE, SOFTDRINK, NEKTAR) → „Alkoholfreie Getränke"; `Kühlung` konsistent einbinden
- [ ] 2.3 `backend/core/management/commands/seed_all.py`: RetailSection-Seed auf `RETAIL_SECTIONS` umstellen
- [ ] 2.4 Legacy-Import (`import_legacy_food`) auf `RETAIL_SECTIONS` umstellen

## 3. Datenmigration / Command

- [ ] 3.1 Idempotenter Command/Migration: bestehende Gruppe „Getränke" → „Alkoholfreie Getränke" umbenennen; fehlende Gruppen (inkl. „Alkoholische Getränke", „Sonstiges") anlegen; `rank` für alle setzen
- [ ] 3.2 Zutaten ohne Warengruppe (real ~24) automatisch neu mappen; nicht zuordenbare → „Sonstiges"
- [ ] 3.3 Alkohol-Fehlzuordnungen auf „Alkoholische Getränke" korrigieren
- [ ] 3.4 `makemigrations --check` grün (falls Migration), `migrate` verifizieren

## 4. Tests

- [ ] 4.1 Konsistenz: alle Mapping-Zielnamen ⊆ Katalognamen
- [ ] 4.2 Bier/Sekt → „Alkoholische Getränke"; Saft → „Alkoholfreie Getränke"; Umbenennung erhält Bestandszutaten; nicht zuordenbar → „Sonstiges"
- [ ] 4.3 Beispiel-Keyword mit zuvor fehlendem Ziel (z.B. Linsen → Hülsenfrüchte & Nüsse) → korrekt zugeordnet
- [ ] 4.4 Nach Re-Mapping: keine Zutat ohne Warengruppe (bzw. nur bewusst unzuordenbare)
- [ ] 4.5 Warengruppen haben nicht alle rank 0

## 5. Abschluss

- [ ] 5.1 Einkaufsliste-Gruppierung (`ShoppingView.tsx`) folgt neuem rank — visuell prüfen
- [ ] 5.2 Keine `print`/`console.log`
