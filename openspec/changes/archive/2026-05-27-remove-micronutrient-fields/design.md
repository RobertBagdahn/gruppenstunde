## Context

Das `Ingredient`-Model hat 23 Mikronährstoff-Felder (12 Vitamine + 12 Mineralstoffe - Vitamin C). Das `Recipe`-Model cached davon 5 (vitamin_a, vitamin_c, vitamin_d, vitamin_b12, calcium, iron). Der Cockpit-Service evaluiert HealthRules gegen all diese Felder. Im Frontend werden sie in einer MicronutrientSection angezeigt.

Einziger verbleibender Mikronährstoff: `vitamin_c_mg`.

## Goals / Non-Goals

**Goals:**
- Alle Mikronährstoff-Felder außer `vitamin_c_mg` aus Models, Schemas, Services, Frontend entfernen
- Cockpit-Punkte auf sinnvolle Menge reduzieren
- Saubere Migration ohne Datenverlust bei Makro-Feldern

**Non-Goals:**
- Makronährstoff-Felder ändern (energy, protein, fat, carbs, sugar, fibre, salt bleiben)
- HealthRule-Model selbst ändern (nur betroffene DB-Einträge löschen)
- DGE-Referenzwerte komplett entfernen (Vitamin-C-Referenz bleibt)

## Decisions

1. **Felder komplett entfernen statt nur ausblenden** — Keine Rückwärtskompatibilität nötig, sauberer Code ist wichtiger als Daten die nie sinnvoll genutzt wurden.

2. **Vitamin C bleibt** — Einziger praxisrelevanter Mikronährstoff für Outdoor-Lager (Obst-Planung).

3. **Eine Migration für alle RemoveField-Operationen** — Kein Grund für inkrementelle Migrations bei einem Cleanup.

4. **HealthRules in DB deaktivieren/löschen** — Per Data-Migration die HealthRules mit entfernten Parametern löschen. Keine UI-Änderung am HealthRule-Admin nötig.

5. **AI-Service: Vitamin-Felder aus Prompt entfernen** — `ingredient_ai_service.py` soll nur noch `vitamin_c_mg` im Schema haben.

6. **`MICRONUTRIENT_FIELDS` wird zu `["vitamin_c_mg"]`** — Die Konstante bleibt als Liste erhalten (erweiterbar), aber mit nur einem Eintrag.

7. **Frontend MicronutrientSection bleibt** — Zeigt nur noch Vitamin C an. Wenn das zu wenig ist, kann die Section komplett entfernt werden, aber das ist ein UI-Entscheid.

## Risks / Trade-offs

- **Datenverlust**: Alle gespeicherten Mikronährstoff-Werte für ~tausende Zutaten gehen verloren. Akzeptiert, da nicht praxisrelevant.
- **AI-Import**: Zukünftige AI-Imports erzeugen keine Mikronährstoff-Daten mehr (außer C). Falls man sie je wieder will, muss man die Felder re-adden.
- **DGE-Referenz**: Die statischen DGE-Daten in `supply/data/dge_reference.py` müssen angepasst werden — überflüssige Keys entfernen, damit keine KeyErrors entstehen.
