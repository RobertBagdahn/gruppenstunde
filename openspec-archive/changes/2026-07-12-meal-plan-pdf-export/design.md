## Context

Der bestehende `pdf_export.py` (120 Zeilen) rendert ein minimales HTML-Table via WeasyPrint — ohne Exchange-Splits, Einkaufsliste, Nährwerte oder korrektes deutsches Locale. Die HTML-Druckansichten (`MealPlanPrintPage.tsx`, `RecipePrintPage.tsx`, `CookingSchedulePrintPage.tsx` + 300 Zeilen CSS in `index.css`) haben vollständige Drucklayouts — aber nur für den Browser, nicht als echte PDF-Downloads. Dieser Change vereinigt beides: Das CSS-Layout der Druckansichten wird in WeasyPrint-kompatible Django-Templates portiert und um neue Features (Personenliste, Allergen-Matrix, Nährwerte, Koch-Zeitplan) erweitert. Drei PDF-Endpunkte entstehen: Essensplan, Rezept, Kochplan.

## Goals / Non-Goals

**Goals:**
- Vollständiger PDF-Export für Essenspläne, Rezepte und Kochpläne mit allen im Spec geforderten Sektionen
- Wiederverwendung des bestehenden Print-CSS (aus `index.css`) in WeasyPrint-Templates
- Frontend-Export-Dialog (Modal) mit individuellen Checkboxen für alle PDF-Optionen
- Deutsche Locale-Formatierung durchgängig via `babel`
- Respektierung von Ingredient-Overrides und Exchange-Splits
- Entfernung aller HTML-Druckansicht-Dateien und CSS-Regeln

**Non-Goals:**
- Internationalisierung (bleibt Deutsch-only)
- Echtzeit-PDF-Vorschau im Browser
- PDF-Verschlüsselung oder DRM
- Batch-Export mehrerer Pläne/Rezepte auf einmal

## Decisions

### 1. PDF-Generierung: WeasyPrint mit Django-Templates + separatem CSS

**Decision**: WeasyPrint mit Django-Templates (`planner/templates/meal_plan_pdf.html`, `recipe/templates/recipe_pdf.html`, `planner/templates/cooking_schedule_pdf.html`) und separaten CSS-Dateien.

**Rationale**:
- WeasyPrint ist bereits installiert und für `pdf_export.py` genutzt
- Das 300-Zeilen Print-CSS aus `index.css` kann fast 1:1 übernommen werden (nur `@media print`-Wrapper entfernen, `@page` direkt, CSS-Counter anpassen)
- Keine neue PDF-Abhängigkeit, kein neues Deployment-Risiko
- Django-Templates + CSS-Dateien sind wartbarer als Inline-Strings

**Alternatives considered**:
- **ReportLab**: Mächtig, aber imperativ. 300 Zeilen CSS in `drawString()`/`Table()`/`Frame()` neu bauen wäre enormer Aufwand. Bereits für Anmelde-PDFs genutzt — dort sinnvoll (Formular-Layout), hier nicht (Content-lastiges Layout).
- **Playwright/Puppeteer**: Headless-Browser für pixel-perfektes Rendering. 200MB Chromium-Abhängigkeit, langsam, Overkill.

### 2. Dateistruktur

**Decision**:
```
backend/planner/
├── services/
│   ├── pdf_export.py                   # Rewrite: MealPlan-PDF Orchestrator
│   └── cooking_schedule_pdf.py         # Neu: Kochplan-PDF Orchestrator
├── templates/
│   ├── meal_plan_pdf.html + .css
│   └── cooking_schedule_pdf.html + .css
└── api/
    └── meal_plan.py                    # Erweiterte Query-Parameter + neuer Kochplan-Endpunkt

backend/recipe/
├── services/
│   └── pdf_export.py                   # Neu: Rezept-PDF Orchestrator
├── templates/
│   └── recipe_pdf.html + .css
└── api/
    └── recipes.py                      # Neuer PDF-Endpunkt

frontend-food/src/
├── components/
│   └── PdfExportDialog.tsx             # Neu: Modal mit Checkboxen
└── pages/
    ├── planning/
    │   └── MealPlanDetailPage.tsx       # Ändern: Button + Dialog
    └── recipes/
        └── RecipeDetailPage.tsx         # Ändern: Button + Dialog
```

### 3. Deutsche Locale-Formatierung mit babel

**Decision**: `babel` als neue Dependency für Datums- und Zahlenformatierung.

**Rationale**:
- `locale.setlocale()` ist nicht thread-safe und kann auf Cloud Run fehlen (`de_DE.UTF-8` nicht garantiert)
- `babel` bietet `format_date()`, `format_decimal()`, `format_currency()` mit garantiert deutschen Locale-Daten
- `babel` ist etabliert (20M+ Downloads/Monat), ~10 MB — akzeptabel für Server-seitige PDF-Generierung
- Alternative (manuelle String-Formatierung) wäre fehleranfällig für Edge Cases

### 4. Frontend: PdfExportDialog-Komponente

**Decision**: Eine zentrale `PdfExportDialog`-Komponente, die in MealPlan-Detail, Rezept-Detail und CookingScheduleTab eingebunden wird. Das Modal zeigt Checkboxen für alle Optionen und baut die URL mit Query-Parametern dynamisch zusammen.

```
┌─────────────────────────────────────────┐
│  Als PDF öffnen                     [X] │
├─────────────────────────────────────────┤
│                                         │
│  ☑ Notizbereiche                        │
│  ☑ Einkaufsliste                        │
│  ☑ Nährwert-Tabelle                     │
│  ☑ Allergen-Matrix (nur Essensplan)     │
│  ☐ Kompaktmodus (fortlaufend)           │
│                                         │
│  Seitenformat:  [A4 ▼]                  │
│                                         │
│         [Abbrechen]  [PDF öffnen]       │
└─────────────────────────────────────────┘
```

Props: `baseUrl` (Endpunkt-URL), `availableOptions` (welche Checkboxen angezeigt werden — unterschiedlich pro PDF-Typ), `filename` (für Content-Disposition).

### 5. API-Endpunkte

| Endpunkt | Query-Parameter | Content-Disposition |
|---|---|---|
| `GET /api/meal-plans/{id}/export/pdf/` | `include_notes`, `exclude_shopping_list`, `exclude_nutrition`, `exclude_allergens`, `compact_mode`, `page_format` | `inline; filename="{slug}-essensplan.pdf"` |
| `GET /api/recipes/{slug}/export/pdf/` | `page_format` | `inline; filename="{slug}-rezept.pdf"` |
| `GET /api/meal-plans/{id}/cooking-schedule/export/pdf/` | `page_format` | `inline; filename="{slug}-kochplan.pdf"` |

Recipe- und Kochplan-Endpunkte haben nur `page_format` als Parameter, da sie keine komplexen Sektionen mit Ein/Aus-Schaltern haben.

### 6. Exchange-Split-Detektion (wie vorher)

**Decision**: Exchange-Splits werden über die `MealItem`-Tabelle erkannt. Items derselben Mahlzeit, die auf dasselbe Recipe verweisen aber unterschiedliche `portion`-Werte haben, sind Exchange-Splits. Jedes Item wird als eigener Block mit eigener Portionsangabe und Zutatenliste gerendert.

```python
portions = item.effective_portions or meal.override_portions or meal_plan.norm_portions
```
Skalierung der Zutaten pro Block: `portion.quantity * portions / recipe.servings`.

### 7. Allergen-Mapping (wie vorher)

14 EU-Allergene als Konstante. Mapping über `NutritionalTag.name` (case-insensitive match). Pro Tag wird eine `set` der vorkommenden Allergene gesammelt.

```python
EU_ALLERGENS = [
    "Gluten", "Krebstiere", "Eier", "Fisch", "Erdnüsse",
    "Soja", "Milch/Laktose", "Schalenfrüchte", "Sellerie",
    "Senf", "Sesam", "Sulfite", "Lupinen", "Weichtiere",
]
```

### 8. Nährwert-Aggregation mit DGE-Referenzwerten

**Decision**: Soll-Werte aus `supply/data/dge_reference.py`. Neue Konstanten:
```python
NORM_PERSON_DAILY_KCAL = 2335  # existiert bereits
NORM_PERSON_DAILY_PROTEIN_G = 58   # 0.8 g/kg × 73 kg (Durchschnittsgewicht)
NORM_PERSON_DAILY_FAT_G = 78       # 30% der kcal / 9 kcal/g
NORM_PERSON_DAILY_CARBS_G = 292    # 50% der kcal / 4 kcal/g
```

Ist-Werte aus `cached_energy_total_kcal`, `cached_protein_g`, `cached_fat_g`, `cached_carbohydrate_g` der Rezepte, skaliert auf effective_portions.

### 9. CSS-Portierung (wie vorher)

`index.css` Zeilen 260–564 werden in drei CSS-Dateien aufgeteilt:
- `meal_plan_pdf.css` — `meal-plan-print-*` Regeln (Essens-Boxen, Tag-Header, Notizen, etc.)
- `recipe_pdf.css` — Rezept-spezifische Druckregeln (Zutatenliste, Schritte, Nährwerte)
- `cooking_schedule_pdf.css` — Kochplan-spezifische Regeln (Serifen, Rezept-Karten, Badges)

Änderungen für WeasyPrint: `@media print` entfernen, `@page` direkt, Tailwind-Klassen durch reines CSS ersetzen, `break-inside` → `page-break-inside`.

### 10. Kochplan-PDF: Serifen + Rezept-pro-Seite

**Decision**: Der Kochplan-PDF nutzt Serifen-Schrift (z. B. `Georgia` oder `Source Serif Pro`) für Fließtext und serifenlos (z. B. `Source Sans Pro`) für Überschriften. Jedes Rezept beginnt auf neuer Seite. Allergen-Badges als farbige Labels (z. B. `background: #ffcccc` für Nüsse, `#ffe0b2` für Gluten).

### 11. Rezept-PDF: Vollständige Zutaten + Nährwerte

**Decision**: Der Rezept-PDF zeigt die komplette Zutatenliste mit Mengen (normiert auf recipe.servings) und optionalen Notizen. Nährwerte pro 100g und pro Portion aus den `cached_*`-Feldern. Allergene als Textzeile (nicht als Matrix).

### 12. Inspi-Logo (wie vorher)

```python
# settings/base.py
INSPI_LOGO_PATH = os.environ.get("INSPI_LOGO_PATH", str(BASE_DIR / "static" / "img" / "inspi-logo.png"))
```

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **WeasyPrint-Systemabhängigkeiten** (pango, cairo) fehlen in Cloud Run | Im Dockerfile bereits installiert. Prüfen: `apt-get install -y libpango-1.0-0 libpangocairo-1.0-0` |
| **CSS-Portierung unvollständig** — nicht alle Tailwind-Äquivalente funktionieren in WeasyPrint | Nach jeder CSS-Änderung PDF generieren und visuell prüfen. Referenz-PDF als Golden File in Tests speichern |
| **Allergen-Mapping unvollständig** — NutritionalTag-Namen können variieren | Fuzzy-Matching oder Mapping-Tabelle. Wenn kein Tag matcht, Allergen als nicht vorhanden behandeln (kein False Positive) |
| **Nährwert-Berechnung ungenau** — `date_ranges` für Teilzeit-Teilnehmer komplex | Einfache Annäherung: Person zählt für jeden Tag, an dem sie laut date_ranges anwesend ist, voll |
| **Große MealPlans (50+ Tage) erzeugen riesige PDFs** | Nicht im Scope. 3–14 Tage sind typisch. Später Paging-Limit möglich |
| **babel-Dependency** — 10 MB zusätzlich im Container-Image | Akzeptabel. Cloud Run-Instanzen haben genug Speicher. babel ist reine Python-Wheel, kein Compile nötig |
| **Drei neue PDF-Endpunkte erhöhen API-Oberfläche** | Gemeinsame Basis-Klasse/Utilities für PDF-Generierung reduzieren Duplikation |
| **Serifen-Schrift im Kochplan-PDF nicht auf allen Systemen** | Google Fonts oder `@font-face` mit WOFF2-Dateien im Static-Ordner. Fallback: System-Serifen |

## Migration Plan

1. **Backend bauen**: `pdf_export.py` Rewrite + `recipe/services/pdf_export.py` + `planner/services/cooking_schedule_pdf.py` + Templates + CSS + API-Endpunkte
2. **Frontend**: `PdfExportDialog` bauen, Buttons in MealPlan/Recipe/CookingSchedule einbauen
3. **Frontend bereinigen**: Alte Druck-Dateien löschen, Routen entfernen, CSS bereinigen
4. **Integrationstest**: Alle drei PDF-Typen mit realen Daten generieren und visuell prüfen
5. **Deploy**: Backend und Frontend parallel (keine DB-Migration)
6. **Rollback**: Falls kritisch — Frontend-Routen aus Git-History wiederherstellen, Backend auf alten `pdf_export.py` zurücksetzen

## Open Questions

- Soll der PDF-Endpunkt ein Rate-Limiting bekommen (DoS-Schutz bei großen Plänen)?
  - → Nicht im initialen Scope. Cloud Run skaliert automatisch.
- Wie soll das Inspi-Logo in der Dev-Umgebung verfügbar sein?
  - → Default-Pfad auf ein im Repo vorhandenes Logo setzen. Falls nicht da, ohne Logo rendern.
