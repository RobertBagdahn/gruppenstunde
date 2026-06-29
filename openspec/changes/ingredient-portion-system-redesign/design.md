## Context

Das `Portion`-Modell hat über mehrere Iterationen zwei redundante Konzepte für „welche Portion ist die wichtigste" entwickelt:
- `priority` (Int, 100/50/10): semantische Kategorie (Rezeptportion, Packung, Haushaltsmaß)
- `is_default` (Bool): explizites Default-Flag
- `rank` (Int): manuelle Sortierreihenfolge innerhalb einer priority-Kategorie

Default-Sortierung: `["-priority", "rank", "name"]` — drei Felder, inkonsistent.

Die KI verwendet `priority` im Prompt, die Frontend-Logik (`selectSmartDefaultPortion`) filtert nach `weight_g != 1 AND weight_g != null`, sortiert nach `priority desc`, und ignoriert `is_default`. Beide Mechanismen lösen dasselbe Problem und widersprechen sich manchmal.

Außerdem: `Portion.name` hat keinen Unique-Constraint per Ingredient, die KI legt Stück/Packung ohne `weight_g` an, und die Einkaufslisten-Logik (`build_package_display`) greift hart auf die System-Portion „Packung" statt auf die beste verfügbare Packung.

## Goals / Non-Goals

**Goals:**
- Ein einziges Sortierfeld: `rank` (aufsteigend, 1 = Normalportion/Default)
- `priority` und `is_default` aus dem Datenmodell entfernen
- Unique-Constraint auf `Portion.name` per Ingredient (case-insensitive)
- KI liefert immer eine Normalportion (`rank=1`) mit `weight_g` + schätzt `weight_g` für Stück und Packung
- Drag & Drop statt ▲/▼-Buttons für Sortierung im UI
- „Standard"-Badge für die `rank=1`-Portion im UI
- Einkaufsliste: kleinste Packung mit `weight_g` statt feste System-Packung
- Saubere Datenmigration aller bestehenden Portionen

**Non-Goals:**
- Änderung an `MeasuringUnit`, `UnitConversion` oder dem `ml`→`g`-Dichte-System
- Änderung an der Einkaufslisten-UI außer der Paket-Auswahllogik
- Neue KI-Modelle oder Embedding-Änderungen
- Änderungen an `RecipeItem` oder Rezept-Nutritional-Berechnung

## Decisions

### 1. `rank` allein, kein `priority`, kein `is_default`

**Entscheidung**: `priority` und `is_default` werden aus dem DB-Schema entfernt. `rank` (Int, aufsteigend) ist das einzige Sortierfeld. `rank=1` = Normalportion = Default.

**Rationale**: Zwei Sortierfelder lösen dasselbe Problem und erzeugen Inkonsistenzen. `rank=1 = default` ist sofort verständlich und braucht keine separate Logik.

**Alternative**: `is_default` behalten, automatisch auf `rank=1` setzen → unnötige Redundanz.

**Migration**:
```
Schritt 1 (Datenmigration):
  Für jede Zutat:
    - Portion mit is_default=True bekommt rank=1
    - Alle anderen: neu nummeriert nach (priority desc, rank asc) → rank=2,3,...
    - Wenn keine is_default=True: Portion mit niedrigstem rank bleibt rank=1

Schritt 2 (Schema-Migration):
  - ALTER TABLE: priority und is_default Spalten entfernen
```

### 2. Unique-Constraint auf `Portion.name` per Ingredient

**Entscheidung**: `UniqueConstraint(Lower("name"), "ingredient", condition=..., name="unique_portion_name_per_ingredient")` auf `Portion`.

**Rationale**: Verhindert Duplikate wie „Packung" + „packung" + „PACKUNG". Backend gibt 422 zurück bei Verletzung. Kein Frontend-seitiges Duplikat-Checking nötig.

**Wichtig**: Unique-Constraint gilt nur für nicht-gelöschte Portionen (`deleted_at IS NULL`). Soft-gelöschte Portionen werden ausgenommen.

### 3. System-Portionen: Positionierung

**Entscheidung**:
- `g`: Immer letzter `rank` (fixiert ans Ende, nicht per Drag & Drop verschiebbar)
- `Packung`, `Stück`: Sortierbar per Drag & Drop wie freie Portionen
- `g` bekommt bei Anlage `rank = 9999` (oder den höchsten Wert + 1 nach allen freien Portionen)

**Rationale**: `g` ist immer ein technischer Fallback, kein UX-Default. Packung und Stück können sinnvollerweise als Normalportion dienen (z.B. „1 Stück Apfel" = rank=1).

### 4. KI-Prompt: Normalportion + Stück/Packung weight_g

**Entscheidung**: Der Gemini-Prompt für `ai-create` und `ai-suggest-all` wird erweitert:
- `portions` Array: erste Portion = Normalportion (rank=1), z.B. `{name: "125g", weight_g: 125}`
- Pflichtfeld `stueck_weight_g` (null wenn nicht sinnvoll, z.B. Salz)
- Pflichtfeld `packung_weight_g` (null wenn nicht sinnvoll, z.B. Leitungswasser)
- Nach KI-Anlage: `_create_system_portions()` setzt `weight_g` für Stück und Packung aus dem KI-Response

**Rationale**: KI hat Kontext-Wissen über typische Portionsgrößen. Manuelles Ausfüllen durch User führt zu leeren `weight_g` und fehlerhafter Einkaufsliste.

### 5. Drag & Drop statt ▲/▼-Buttons

**Entscheidung**: `@dnd-kit/core` + `@dnd-kit/sortable` (bereits im Projekt?) für Drag & Drop. Bei Touch-Bedienung funktioniert `@dnd-kit` mit Pointer-Events zuverlässig. Nach Drop: `PATCH /{slug}/portions/{id}/` mit neuem `rank`, oder neuer Batch-Endpoint `POST /{slug}/portions/reorder/` mit Array aus `[{id, rank}]`.

**Alternative**: ▲/▼-Buttons behalten (bisherige Spec `portion-ranking` schreibt das vor). → Diese Spec wird mit diesem Change überschrieben.

**Neuer Reorder-Endpoint**:
```
POST /api/ingredients/{slug}/portions/reorder/
Body: { orders: [{id: int, rank: int}, ...] }
Response: 200 OK mit aktualisierten Portionen
```

### 6. Einkaufsliste: kleinste sinnvolle Packung

**Entscheidung**: `build_package_display()` sucht nicht mehr nach `is_system=True AND name="Packung"`, sondern nach der Portion mit dem kleinsten `weight_g > 0` bei der der Name nicht `"g"` ist und die kein reines Gramm-Äquivalent ist.

**Filterlogik**:
```python
def get_shopping_portion(ingredient) -> Portion | None:
    return (
        ingredient.portions
        .filter(weight_g__gt=0, deleted_at__isnull=True)
        .exclude(measuring_unit__unit="g", quantity__lte=1)  # kein "g"-Basis
        .order_by("weight_g")  # kleinste zuerst
        .first()
    )
```

### 7. `selectSmartDefaultPortion()` Frontend vereinfachen

**Entscheidung**: Die Funktion wird auf `portions[0]` reduziert (erste Portion nach Sortierung vom Backend = rank=1). Kein komplexes Filtern mehr.

```typescript
export function selectDefaultPortion(portions: Portion[]): Portion | undefined {
  return portions[0]; // rank=1 is always the default
}
```

Fallback: wenn `portions[0].weight_g === 1` und `portions[0].name === "g"`, dann `quantity = 100`, sonst `quantity = 1`.

## Risks / Trade-offs

- **[Datenmigration schlägt fehl]** → Wenn eine Zutat mehrere Portionen mit `is_default=True` hat (Datenfehler), nimmt die Migration die erste nach `priority desc`. → Vor Migration: `python manage.py check` + Query zur Validierung.
- **[Unique-Constraint verletzt durch bestehende Daten]** → Mögliche Duplikate in DB (z.B. „Packung" + „packung"). → Data-Cleanup-Script vor Migration: case-insensitive Duplikate finden und zusammenführen.
- **[Drag & Drop auf Touch]** → `@dnd-kit` hat gute Touch-Unterstützung, aber benötigt `TouchSensor`. → In Mobile-Tests verifizieren.
- **[Bestehende KI-erstellte Zutaten ohne Normalportion]** → Viele bestehende Zutaten haben rank=1 = „g" (Systemdefault). → Nach Migration manuelle Prüfung empfohlen; KI-Backfill optional.
- **[portion-ranking Spec überschrieben]** → Die bisherige Spec verlangt ▲/▼-Buttons. → `portion-ranking/spec.md` wird mit diesem Change aktualisiert.

## Migration Plan

1. **Pre-Migration**: Query zur Identifikation von Duplikaten (`Portion.objects.annotate(name_lower=Lower('name')).values('ingredient_id', 'name_lower').annotate(count=Count('id')).filter(count__gt=1)`)
2. **Data Cleanup**: Duplikate zusammenführen (soft-delete, RecipeItems auf verbleibende Portion umhängen)
3. **Django-Migration**: Datenmigration (rank neu setzen) + Schema-Migration (priority/is_default entfernen + UniqueConstraint hinzufügen)
4. **Backend Deploy**: Neue API-Logik, neuer reorder-Endpoint, angepasste KI-Prompts
5. **Frontend Deploy**: Zod-Schemas, Drag & Drop, Standard-Badge, vereinfachte Default-Logik
6. **Rollback**: `priority` und `is_default` sind nullable — im Notfall Schema-Migration rückgängig, Felder wieder hinzufügen. Funktionalität bleibt durch `rank` erhalten.
