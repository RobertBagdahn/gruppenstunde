## Context

Der `import_cooklang` Management Command parst `.cook`-Dateien und erstellt `Recipe` + `RecipeItem`-Einträge. Aktuell sind alle importierten RecipeItems defekt:
- `measuring_unit = None` (Unit-Mapping findet keine DB-Einträge)
- `quantity_type = "once"` mit Gesamtmengen (statt per_person wie im Rest des Systems)
- `portion = None` (keine Portion-Zuordnung)

DB-Units: `g`, `Kg`, `ml`, `l`, `EL`, `TL`, `Msp`, `n.B.`, `Ta`, `Pr`, `Sp`

Betroffene Datei: `backend/recipe/management/commands/import_cooklang.py`

## Goals / Non-Goals

**Goals:**
- Korrekte `measuring_unit`-Zuordnung für alle importierten RecipeItems
- `quantity_type="per_person"` mit korrekter Pro-Person-Menge (Gesamtmenge / servings)
- Robusterer Cooklang-Parser (kein Fließtext als Zutat parsen)
- `--force` Flag zum Löschen + Neu-Import existierender Cooklang-Rezepte

**Non-Goals:**
- Automatische Portion-Zuordnung (aufwändig, separates Feature)
- Frontend-Änderungen (Problem ist rein im Import-Skript)
- Änderung an `RecipeItem`-Model oder Schemas

## Decisions

### 1. Unit-Mapping direkt gegen DB-Namen

**Entscheidung**: `unit_aliases` mappt Cooklang-Unit-Strings auf die tatsächlichen DB-Einträge (`g`, `ml`, etc.), nicht auf ausgeschriebene Namen.

```python
unit_aliases = {
    "gramm": "g", "gram": "g", "g": "g",
    "kilogramm": "kg", "kg": "Kg",
    "milliliter": "ml", "ml": "ml",
    "liter": "l", "l": "l",
    "esslöffel": "EL", "el": "EL", "eßlöffel": "EL",
    "teelöffel": "TL", "tl": "TL",
    "messerspitze": "Msp", "msp": "Msp",
    "prise": "Pr", "prisen": "Pr", "pr": "Pr",
    "stück": None,  # quantity-only, no unit
    "stk": None,
}
```

**Warum**: Einfach, direkt, keine Indirektion. Die DB-Einträge sind stabil.

### 2. quantity_type = "per_person"

**Entscheidung**: Gesamtmenge aus Cooklang durch `servings` teilen und als `per_person` speichern.

**Warum**: Das gesamte System (Frontend-Skalierung, MealPlan-Integration, Shopping-Export) erwartet `per_person`. Der PortionScaler im Frontend rechnet `quantity * servingsMultiplier` — bei `per_person` ist der Multiplier = gewünschte Portionen.

### 3. Regex-Fix für @-Syntax

**Entscheidung**: `INGREDIENT_RE` strenger machen — Zutatname darf keine Ziffern am Anfang enthalten und maximal 50 Zeichen lang sein.

```python
INGREDIENT_RE = re.compile(r"@([A-Za-zÄÖÜäöüß][^@{]{0,50}?)\{([^}]*)\}")
```

### 4. --force Flag für Re-Import

**Entscheidung**: `--force` löscht alle Rezepte mit `summary__startswith="Importiert aus Cooklang"` vor dem Neu-Import.

## Risks / Trade-offs

- **[Datenverlust bei --force]** → Nur Cooklang-importierte Rezepte betroffen (identifizierbar durch Summary-Prefix). Benutzer-Rezepte bleiben unberührt.
- **[Units ohne Match]** → Fallback auf `None` statt `g`. Besser ehrlich fehlend als falsch zugeordnet. Warnung im Output.
- **[Servings-Default 4]** → Bleibt bestehen, da die Cooklang-Files keine bessere Info haben. Kann manuell korrigiert werden.
