## Context

`seed_all.py` enthält eine `ingredients_data`-Liste mit ~50 Zutaten. Der separate `seed_breakfast_recipes`-Command (26 Frühstücksrezepte) setzt voraus, dass alle Frühstückszutaten bereits in der Datenbank vorhanden sind — andernfalls werden RecipeItems lautlos übersprungen (WARNING auf stderr, kein Fehler).

Aktuell fehlen 13 von 25 benötigten Frühstückszutaten in `seed_all.py`.

**Betroffene Dateien:**
- `backend/core/management/commands/seed_all.py` — einzige Änderung

## Goals / Non-Goals

**Goals:**
- 13 fehlende Frühstückszutaten in `seed_all.py` ergänzen
- Alle neuen Zutaten mit plausiblen Nährwerten, `price_per_kg`, `physical_density` und korrekter `RetailSection`-Zuordnung

**Non-Goals:**
- Keine neuen Management Commands
- Keine Änderungen an `seed_breakfast_recipes.py`
- Keine Migrations, API- oder Frontend-Änderungen
- Keine exakten Nährwert-Daten (Schätzwerte reichen für Dev-Umgebung)

## Decisions

**Fehlende Zutaten in `seed_all.py` ergänzen statt neuen Command erstellen**

`seed_all.py` ist der zentrale Seed-Einstiegspunkt für die Dev-Umgebung. Alle Basiszutaten gehören dort hinein. Ein separater "breakfast-ingredients"-Command würde die Reihenfolge-Abhängigkeit noch unklarer machen.

**Nährwerte: Schätzwerte statt echte USDA/REWE-Daten**

Die vorhandenen Zutaten in `seed_all.py` verwenden bereits Schätzwerte. Konsistenz ist wichtiger als Präzision für Dev-Daten. Werte werden aus gängigen Lebensmitteltabellen (BZFE, USDA) geschätzt.

**RetailSection-Zuordnung:**
- Aufschnitt (Wurst, Lachs, Leberwurst) → "Fleisch & Wurst"
- Brotaufstriche (Marmelade, Nutella, Erdnussbutter, Hummus) → "Brotaufstriche & Konserven"
- Avocado, Obst → "Obst & Gemüse"
- Cornflakes → "Backwaren & Cerealien"
- Kakaopulver, Kaffee → "Getränke & Heißgetränke"
- Orangensaft → "Getränke & Heißgetränke"

## Risks / Trade-offs

- [Schätzwerte] Nährwertberechnungen im Dev-Cockpit weichen von Realwerten ab → Akzeptiert, da nur Dev-Umgebung
- [Idempotenz] `seed_all` prüft Zutaten via `name`-Lookup — bei Namensänderungen entstehen Duplikate → Slug-basierte Dedup wäre robuster, liegt aber außerhalb des Scopes
- [RetailSections] Neue Sections könnten fehlen → `get_or_create` sichert ab, kein Fehlerrisiko
