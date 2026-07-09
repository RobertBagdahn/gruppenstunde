# Anforderungsanalyse: Strukturierte Rezeptanleitungen (Zutatentext)

## Status: Entwurf

---

## 1. Problem & Vision

### 1.1 Aktueller Zustand

Die Rezeptbeschreibung (`Content.description`) ist aktuell ein einzelnes `TextField` mit freiem Markdown. Es gibt **keine** strukturelle Verbindung zwischen den Anleitungsschritten und den Zutaten/Ingredient-Items des Rezepts. Der Kochmodus (`RecipeCookingMode`) und die Schrittparsung (`parseRecipeSteps.ts`) arbeiten mit heuristischem Split (Headings, nummerierte Listen) — das ist brüchig und liefert keine semantischen Informationen.

Die Zutatenliste (`RecipeItem`) und die Anleitung (`description`) sind zwei **vollständig separate** Datenstrukturen. Ein Schritt wie „5 Zwiebeln schneiden" ist nirgendwo mit dem `RecipeItem` für „Zwiebeln, 5 Stück" verknüpft.

### 1.2 Feedback aus dem Stakeholdergespräch

> *„Kochplan-Text ist statisch. Da müsste man einen guten Beschreibungstext bekommen, der auf dieser Basis die Mengen sagt: fünf Stück Zwiebeln schneiden und so weiter."*
> *„Die Informationen fehlen. In der Rezeptbeschreibung müsste das auch irgendwie drinstehen."*
> *„Dass man Punkt 1 hat — links die Zutaten, rechts was man machen muss. Dann Punkt 2 — die Zutaten, was man machen muss."*
> *„CookLang ist auch ganz cool, weil das im Prinzip genau dieses Problem löst."*

### 1.3 Vision

Rezeptanleitungen sind nicht länger ein undurchsichtiger Markdown-String, sondern eine **strukturierte Abfolge von Schritten**. Jeder Schritt ist:
- Mit einer **sortierten Liste von Zutaten** (Referenzen auf `RecipeItem`) verknüpft
- Mit einer **Dauer/Timer-Angabe** versehen
- Mit **Kochgeschirr/Cookware** verknüpfbar
- Als **Text mit Platzhaltern** für Zutatenmengen definiert („{Zwiebeln} schälen und fein würfeln" → „5 Zwiebeln schälen und fein würfeln")
- Optional in **Sektionen** gruppierbar („== Teig ==", „== Füllung ==")

Die KI erzeugt diese Struktur beim Import und bei der Generierung automatisch. Redaktionelle Nutzer können sie manuell bearbeiten. Der Kochmodus zieht daraus echte Schritt-für-Schritt-Ansichten mit mengenkorrekten Zutaten pro Schritt.

---

## 2. Ist-Analyse

### 2.1 Datenmodell (Backend)

| Komponente | Aktuell | Problem |
|---|---|---|
| `Content.description` | `TextField()` — Plain Markdown | Keine Struktur, keine Verknüpfung zu `RecipeItem` |
| `RecipeItem.sort_order` | `IntegerField(default=0)` | Dient nur der Listendarstellung, nicht der Schritt-Zuordnung |
| `RecipeItem.quantity` | `FloatField(default=1)` | Menge, aber kein Bezug zu einem Schritt |
| `RecipeItem.note` | `CharField(255, blank=True)` | Freitext wie „gehackt", nicht strukturiert |

### 2.2 Frontend

| Komponente | Aktuell | Problem |
|---|---|---|
| `parseRecipeSteps.ts` | Heuristische Splits (##, 1.) | Brüchig, keine semantische Info |
| `RecipeCookingMode.tsx` | Zeigt Steps + Zutaten nebeneinander | Keine Verknüpfung zwischen Step und Zutaten |
| `MarkdownEditor` | Freies Markdown | Kein strukturiertes Editing |
| `InlineEditor` | Markdown-Dialog mit KI-Vorschlag | Kein Step-Editing |
| `CreateRecipePage` | 3-Step-Wizard, description = Markdown | Kein strukturiertes Anlegen |
| `EditRecipePage` | MarkdownEditor für description | Kein Step-Editing |
| `RecipePrintPage.tsx` | Markdown-Rendering | Keine strukturierte Ausgabe |
| `IngredientList` | Listet alle Zutaten | Kein Schritt-Kontext |

### 2.3 AI-Generierung

| Service | Aktuell | Problem |
|---|---|---|
| `import_service.py` (URL) | Extrahiert `steps: list[str]` via Schema.org | Nur transient, wird in description geflattened |
| `url_import_service.py` (Gemini) | `GeminiRecipeExtraction.steps: list[str]` | Nur transient, nicht weiterverarbeitet |
| `import_cooklang.py` | Steps werden mit `\n` joined → description | Geht verloren |
| `recipe_ai_suggest_service.py` | `description` als Plain String | Keine Struktur |
| `useRefurbish()` (Frontend) | AI generiert Markdown | Kein strukturiertes Ergebnis |
| `useImproveText()` (Frontend) | AI verbessert Markdown | Kein Schritt-Bewusstsein |

### 2.4 CookLang-Integration (bestehend)

Es gibt bereits einen CookLang-Import (`import_cooklang.py`, nicht mehr auffindbar unter diesem Pfad → wahrscheinlich verschoben oder gelöscht). Die Spezifikation von CookLang ist bekannt:
- `@ingredient{quantity%unit}` — Zutat mit Menge und Einheit
- `~{duration%unit}` oder `~name{duration%unit}` — Timer
- `#cookware` — Kochgeschirr
- Leerzeile = Schritt-Trennung
- `== Sektion ==` — Sektionen
- `-- Kommentar` — Kommentare
- `> Note` — Notizen
- `@ingredient(preparation)` — Vorbereitung (z.B. „geschält")

---

## 3. Anforderungen

### 3.1 Funktionale Anforderungen

#### F-01: Rezeptschritt-Modell
Ein Rezept besteht aus **Schritten** (`RecipeStep`). Jeder Schritt hat:
- `id` (UUID, PK)
- `recipe_id` (FK → `Recipe`, CASCADE)
- `sort_order` (Integer, unique pro Recipe)
- `instruction` (Text — der Anleitungstext des Schritts)
- `duration_minutes` (Integer, nullable — Dauer dieses Schritts)
- `section` (String, nullable — Sektionsname wie „Teig", „Füllung")
- `created_at` / `updated_at`

#### F-02: Schritt-Zutaten-Verknüpfung
Jeder Schritt kann beliebig viele Zutaten-Referenzen haben (`RecipeStepIngredient`):
- `id` (UUID, PK)
- `step_id` (FK → `RecipeStep`, CASCADE)
- `recipe_item_id` (FK → `RecipeItem`, CASCADE)
- `quantity_modifier` (Float, nullable — optionale abweichende Menge, z.B. „die Hälfte")
- `preparation` (String, nullable — z.B. „gehackt", „in Scheiben", „geschält")
- `sort_order` (Integer — Reihenfolge innerhalb des Schritts)

#### F-03: Schritt-Geschirr-Verknüpfung (optional, Zukunft)
- `RecipeStepCookware`:
  - `step_id` (FK → `RecipeStep`)
  - `name` (String — z.B. „Pfanne", „Backofen")
  - Die Cookware-Liste kann später aus einer Cookware-Tabelle bezogen werden

#### F-04: Platzhalter-System
Der `instruction`-Text eines Schritts kann Platzhalter für Zutaten enthalten:
- Syntax: `{ingredient_name}` oder `{recip_item_id}`
- Bei der Darstellung wird der Platzhalter durch den vollständigen Zutaten-Namen mit Menge ersetzt:
  - `{Zwiebeln}` → „5 Zwiebeln" (basierend auf `RecipeItem.quantity` + `Portion.name`)
  - Bei `quantity_modifier` im `RecipeStepIngredient`: modifizierte Menge
  - Bei `preparation`: angehängte Vorbereitung („5 Zwiebeln, geschält")
- Alternative: CookLang-kompatible Syntax `@Zwiebeln{5}` als Platzhalter

#### F-05: CookLang als Eingabeformat
Nutzer/CookLang-Import können das CookLang-Format verwenden:
```cooklang
== Teig ==
@Mehl{500%g}, @Wasser{300%ml} und @Salz{1%TL} in einer #Schüssel{} vermengen. ~{10%Minuten} ruhen lassen.

== Belag ==
@Tomatensauce{200%ml} auf dem Teig verteilen. @Käse{150%g} darüber streuen.
```
Das System parsed dies in `RecipeStep` + `RecipeStepIngredient`:
- Jeder Absatz (durch Leerzeile getrennt) = ein Schritt
- `@Zutat{Menge%Einheit}` → `RecipeStepIngredient`
- `~{Dauer%Einheit}` → `duration_minutes`
- `== Sektion ==` → `section`
- `#Kochgeschirr` → optionales Cookware-Mapping

#### F-06: Backward-Compatibility / Migration
Bestehende Rezepte (mit `description` als Markdown) werden **nicht** automatisch migriert. Stattdessen:
- Beim ersten Bearbeiten eines Rezepts im neuen Modus: einmalige Konvertierung via KI („Parse den Markdown in strukturierte Steps")
- Lese-Zugriff: Fallback auf heuristische Schrittparsung (`parseRecipeSteps.ts`) wenn keine `RecipeStep`-Einträge existieren
- API liefert beide Formate: `description` (Markdown, aus Steps generiert) UND `steps` (strukturiert)

#### F-07: API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|---|---|---|
| `GET /api/recipes/{slug}/steps` | GET | Alle Schritte eines Rezepts abrufen |
| `PUT /api/recipes/{slug}/steps/batch` | PUT | Alle Schritte eines Rezepts auf einmal setzen |
| `POST /api/recipes/{slug}/steps/from-description` | POST | KI-gestützte Konvertierung von description → Steps |
| `POST /api/recipes/{slug}/steps/from-cooklang` | POST | CookLang-Text in Steps parsed speichern |
| `GET /api/recipes/{slug}/steps/preview` | GET | Vorschau der generierten Markdown-Darstellung |

**Request/Response:**

```json
// Batch-Update Steps
PUT /api/recipes/{slug}/steps/batch
{
  "steps": [
    {
      "sort_order": 1,
      "section": "Teig",
      "instruction": "{Mehl} mit {Wasser} und {Salz} vermengen. {duration} ruhen lassen.",
      "duration_minutes": 10,
      "ingredients": [
        { "recipe_item_id": "uuid-1", "preparation": null, "quantity_modifier": null },
        { "recipe_item_id": "uuid-2", "preparation": null, "quantity_modifier": null }
      ]
    },
    {
      "sort_order": 2,
      "section": "Belag",
      "instruction": "{Tomaten} auf dem Teig verteilen. {Käse} darüber streuen.",
      "duration_minutes": null,
      "ingredients": [
        { "recipe_item_id": "uuid-4", "preparation": "gewürfelt", "quantity_modifier": null },
        { "recipe_item_id": "uuid-5", "preparation": "gerieben", "quantity_modifier": null }
      ]
    }
  ]
}
```

#### F-08: Frontend — Schritt-Editor im Kochmodus
Der `RecipeCookingMode` zeigt pro Schritt:
- Schritt-Titel („Schritt 1 — Teig")
- Schritt-Text mit aufgelösten Platzhaltern („500g Mehl mit 300ml Wasser und 1 TL Salz vermengen")
- Timer mit Countdown (wenn `duration_minutes` gesetzt)
- Zutaten für DIESEN Schritt (gefiltert aus `RecipeStepIngredient`)
- Cookware für diesen Schritt

#### F-09: Frontend — Interaktiver Drag-and-Drop Step-Editor (MVP)

Der Step-Editor ist das Herzstück der strukturierten Rezeptanleitungen. Er ersetzt den bisherigen `MarkdownEditor` für die Beschreibung vollständig und ist als **visuelle, interaktive Step-Liste** konzipiert.

**Grundlegende Interaktionen:**
- **Drag-and-Drop**: Steps per Drag-and-Drop umsortieren. Visuelles Feedback (Hover-Zone, Einrückung, Animation). Handle (≡) links neben jedem Step
- **Inline-Editing**: Instruction-Text direkt im Step bearbeitbar (contenteditable oder Textarea). Live-Vorschau der aufgelösten Platzhalter
- **Sektionen als Drop-Target**: Steps können in Sektionen hineingezogen werden. Sektionen sind kollabierbare Gruppen
- **Step-Teilung**: Button oder „Enter" an einer Stelle teilt einen Step in zwei (inklusive KI-gestützter Aufteilung der Zutaten)
- **Step-Zusammenführung**: Mehrere Steps auswählen → zusammenführen → KI kombiniert die Texte + Zutaten
- **Undo/Redo**: Vollständige History für alle Editier-Aktionen

**Step-Karte (pro Step):**
```
┌─────────────────────────────────────────────────┐
│  ≡  Schritt 2   ⏱ [10] Min.   Sektion: [▼]     │
│  ┌───────────────────────────────────────────┐  │
│  │ ⋮ {Mehl} mit {Wasser} und {Salz}          │  │
│  │ ⋮ vermengen. ~{10} Minuten ruhen lassen.  │  │
│  │ └─────── Live-Vorschau ─────────────────┐ │  │
│  │ │ ✅ 500g Mehl mit 300ml Wasser und     │ │  │
│  │ │    1 TL Salz vermengen. 10 Minuten   │ │  │
│  │ │    ruhen lassen.                      │ │ │
│  │ └───────────────────────────────────────┘ │  │
│  │ ── Zutaten in diesem Schritt ──────────── │  │
│  │  ☑ Mehl (500g)           [+ Vorbereitung] │  │
│  │  ☑ Wasser (300ml)        [gekühlt     ▼] │  │
│  │  ☑ Salz (1 TL)                           │  │
│  │  [+ Zutat zuordnen ▼]  [🤖 automatisch]  │  │
│  └───────────────────────────────────────────┘  │
│  [🔗 Platzhalter einfügen ▼] [🤖 KI umschreiben]│
│  [＋ Schritt danach]  [✕ Löschen]               │
└─────────────────────────────────────────────────┘
```

**Elemente pro Step-Karte:**
- **≡ Drag-Handle**: Greifbarer Bereich zum Umsortieren
- **Header**: Sektions-Dropdown, Dauer-Eingabe, Schrittnummer (automatisch)
- **Instruction-Editor**: Textarea mit Syntax-Highlighting für Platzhalter, darunter Live-Vorschau
- **Zutaten-Zuordnung**: Liste aller zugeordneten `RecipeItem`-Referenzen
  - Checkbox: Ist die Zutat in diesem Schritt aktiv?
  - Preparation-Text: „gehackt", „in Scheiben", „geschält"
  - Quantity-Modifier: optionale abweichende Menge (z.B. 0.5 für „die Hälfte")
  - „+ Zutat zuordnen"-Dropdown: Alle noch nicht zugeordneten `RecipeItem` des Rezepts
  - 🤖 Automatisch: KI schlägt Zuordnung vor
- **Footer-Aktionen**:
  - 🔗 Platzhalter einfügen: Dropdown mit allen Zutaten-Namen → fügt `{Name}` an Cursor-Position ein
  - 🤖 KI umschreiben: Öffnet Inline-Dialog, KI formuliert den Step um (mit/ohne Beibehaltung der Zutaten)
  - ＋ Schritt danach: Fügt leeren Step ein
  - ✕ Löschen: Entfernt Step (mit Bestätigung bei nicht-leerem Step)

**Toolbar (über der Step-Liste):**
```
[＋ Schritt hinzufügen]  [📥 Aus CookLang importieren]  [🤖 KI-Komplettgenerierung]  [↶ Undo]  [↷ Redo]
```
- **＋ Schritt hinzufügen**: Hängt leeren Step an
- **📥 Aus CookLang importieren**: Öffnet Modal mit Textarea → Parse → Steps
- **🤖 KI-Komplettgenerierung**: Öffnet Modal: „Generiere Schritt-für-Schritt-Anleitung aus den Zutaten"
- **↶ Undo / ↷ Redo**: Step-History (sort_order, text, ingredient assignments)

#### F-10: KI-Integration — Vollständig KI-gestützter Editor

Die KI ist kein separater Button, sondern tief in den Editor integriert — als **ständig verfügbarer Assistent** auf jeder Ebene.

**F-10.1: KI-Komplettgenerierung aus Zutatenliste**
- Button: „🤖 Schritt-für-Schritt generieren"
- AI bekommt: alle `RecipeItem` des Rezepts (Name, Menge, Einheit, Note)
- AI liefert: JSON-Array mit vollständigen Steps inkl. Zutaten-Zuordnung, Timern, Sektionen
- Ergebnis wird als Batch in den Editor geladen (ersetzt nichts, Steps werden angehängt)
- Nutzer kann dann per Drag-and-Drop sortieren und per „KI umschreiben" verfeinern

**F-10.2: KI-Umschreibung eines einzelnen Steps**
- Button: „🤖 KI umschreiben" auf jeder Step-Karte
- Öffnet Inline-Dialog mit Optionen:
  - **Ton**: „präzise", „ausführlich", „für Kochanfänger", „professionell"
  - **Beibehaltung**: „Zutaten exakt behalten", „Zutaten frei anpassen", „optional erweitern"
  - **Format**: „als Fließtext", „als Liste", „als Timer-Struktur"
- KI überschreibt nur diesen einen Step (instruction + duration + preparation-Texte)
- Zutaten-Zuordnung bleibt stabil (außer bei „Zutaten frei anpassen")

**F-10.3: KI-Assistent beim Editieren (Inline)**
- Während der Nutzer den Instruction-Text tippt:
  - **Autocomplete für Zutaten**: Tippt der Nutzer `{` → Dropdown mit allen Zutaten-Namen
  - **KI-Snippet-Vorschläge**: Nach 3 Sekunden Pause schlägt KI die nächsten Worte vor (optional, deaktivierbar)
  - **Erkennung von Zutaten-Referenzen**: Schreibt der Nutzer „Mehl" → KI schlägt vor: „Platzhalter für Mehl einfügen?"
  - **Dauer-Erkennung**: Schreibt der Nutzer „10 Minuten" → KI markiert als Timer und schlägt `~{10}` vor

**F-10.4: KI-Zutaten-Zuordnung**
- Button: „🤖 automatisch" im Zutaten-Bereich eines Steps
- KI analysiert den Instruction-Text und schlägt vor:
  - Welche `RecipeItem` in diesem Schritt vorkommen
  - Welche Preparation („gehackt", „in Scheiben") zutrifft
  - Ob ein Quantity-Modifier nötig ist („die Hälfte der Zwiebeln")
- Nutzer bestätigt oder korrigiert per Checkbox

**F-10.5: KI-Split / KI-Merge**
- **Split**: Nutzer wählt Split-Punkt → KI teilt Instruction-Text und verteilt Zutaten sinnvoll auf beide Steps
- **Merge**: Nutzer wählt 2+ Steps → KI kombiniert Instruction-Texte + fasst Zutaten-Duplikate zusammen
- **KI-optimierte Reihenfolge**: Button „🤖 Reihenfolge optimieren" → KI sortiert Steps nach logischer Abfolge (z.B. „Ofen vorheizen" vor „Backblech einfetten")

**F-10.6: KI-Import-Pipeline**
- **URL-Import** (`url_import_service.py`): `GeminiRecipeExtraction.steps` wird direkt als strukturierte `RecipeStep[]` + `RecipeStepIngredient[]` gespeichert
- **CookLang-Import**: CookLang-Text → Parser → Steps (direkt in den Editor)
- **Freitext-Import**: „Beschreibe dein Rezept in eigenen Worten" → KI parst in strukturierte Steps + legt passende `RecipeItem` an
- **Bild-Import**: Nutzer fotografiert ein Rezept → KI extrahiert Zutaten + Steps

**F-10.7: Backend KI-Services aktualisiert**
```python
# recipe/services/step_ai_service.py

class AiStepService:
    @staticmethod
    def generate_steps_from_items(recipe_items: list[RecipeItem]) -> list[RecipeStepInput]:
        """KI: Aus Zutatenliste komplette Steps generieren"""
    
    @staticmethod
    def rewrite_step(step: RecipeStep, tone: str, preserve_ingredients: bool) -> RecipeStepInput:
        """KI: Einzelnen Step umschreiben"""
    
    @staticmethod
    def suggest_ingredient_assignment(step: RecipeStep, available_items: list[RecipeItem]) -> list[SuggestedAssignment]:
        """KI: Zutaten-Zuordnung für einen Step vorschlagen"""
    
    @staticmethod
    def split_step(step: RecipeStep, split_point: str) -> list[RecipeStepInput]:
        """KI: Step an einer Stelle teilen, Zutaten verteilen"""
    
    @staticmethod
    def merge_steps(steps: list[RecipeStep]) -> RecipeStepInput:
        """KI: Mehrere Steps zusammenführen"""
    
    @staticmethod
    def optimize_order(steps: list[RecipeStep]) -> list[RecipeStepInput]:
        """KI: Step-Reihenfolge optimieren"""
    
    @staticmethod
    def convert_markdown_to_steps(markdown: str, recipe_items: list[RecipeItem]) -> list[RecipeStepInput]:
        """KI: Bestehendes Markdown in strukturierte Steps parsen"""
    
    @staticmethod
    def convert_freetext_to_steps(text: str) -> tuple[list[RecipeStepInput], list[RecipeItemInput]]:
        """KI: Freitext-Beschreibung in Steps + Zutaten parsen"""
```

**F-10.8: Prompt-Struktur (standardisiert)**
Alle KI-Services nutzen ein einheitliches Prompt-Muster:

```text
Du bist ein Koch-Assistent. Strukturiere Rezeptanleitungen in präzise,
logische Schritte. Jeder Schritt enthält:
- section (optional): Sektionsname wie "Teig" oder "Füllung"
- instruction: Anleitungstext mit @Zutat-Platzhaltern
- duration_minutes: Dauer in Minuten (optional)
- ingredient_placeholders: Liste der im Schritt verwendeten @Zutat-Namen

Zutaten-Datenbank für dieses Rezept:
- @Mehl (500g) - Type: Weizenmehl Type 405
- @Wasser (300ml) - kalt
- @Salz (1 TL) - fein

Output-Format strikt als JSON-Array.
```

#### F-11: Drucken
`RecipePrintPage.tsx`:
- Strukturierte Ausgabe: Pro Schritt:
  - Sektions-Überschrift (fett)
  - Schritt-Nummer
  - Instruction mit aufgelösten Mengen
  - Nebenstehende Zutatenliste für den Schritt
  - Timer prominent dargestellt

### 3.2 Nicht-funktionale Anforderungen

| ID | Anforderung |
|---|---|
| NF-01 | **Ladezeit**: Rezept-Detailseite lädt in <200ms (Steps = separate API-Query, kann parallel zu Recipe-Detail geladen werden) |
| NF-02 | **Offline-Fähigkeit**: Steps müssen für Offline-Nutzung gecached werden können (LocalStorage/IndexedDB) |
| NF-03 | **Platzhalter-Auflösung**: Darf <5ms pro Schritt benötigen (Frontend-seitig, einfaches Replace) |
| NF-04 | **Migration**: Kein Datenverlust bei bestehenden Rezepten — `description` bleibt als Fallback erhalten |
| NF-05 | **Mobile**: Step-Editor und Kochmodus müssen auf 320px-Breite bedienbar sein |
| NF-06 | **Barrierefreiheit**: Schritte müssen per Screenreader erfassbar sein |
| NF-07 | **Validierung**: Mindestens ein Schritt pro Rezept, `instruction` nicht leer |

---

## 4. CookLang-Bewertung

### 4.1 Pro CookLang-Integration

| Vorteil | Beschreibung |
|---|---|
| **Bewährtes Format** | CookLang ist ein etablierter Standard mit Parser-Referenzen in Python/Rust/JS |
| **Platzhalter-Syntax** | `@Zutat{Menge%Einheit}` löst das Platzhalter-Problem direkt |
| **Import-Pfad** | CookLang-Import existiert bereits → natürliche Erweiterung |
| **Ecosystem** | Obsidian-Plugin, CLI, Mobile Apps — potenziell Import/Export |
| **Nutzerfreundlich** | Plain-Text-Format, lesbar, versionierbar, diff-bar |
| **Timer/Cookware** | Syntax für Timer und Kochgeschirr ist bereits spezifiziert |
| **Sektionen** | `== Sektion ==`-Syntax für komplexe Rezepte |

### 4.2 Contra / Risiken

| Nachteil | Beschreibung |
|---|---|
| **Eigener Parser nötig** | CookLang-Spezifikation hat Randfälle (Aliase, verschachtelte Präparationen). Parser-Pflege ist eigenes Projekt |
| **Erhöhte Komplexität** | `@`, `{}`, `%`, `~`, `#` — viele neue Konzepte für Nutzer |
| **Nicht für alle Rezepte** | Simple Rezepte („Apfel essen") brauchen kein CookLang |
| **Doppelter Code** | Parser in Python (Backend, Import) + Parser in TS (Frontend, Darstellung) |
| **Randfälle** | Fließtext mit `@`-Zeichen, Inkonsistenzen im CookLang-Okosystem |

### 4.3 Empfehlung

**CookLang-Kompatibilität als optionales Eingabeformat, nicht als internes Speicherformat.**

- **Internes Speicherformat**: Eigenes `RecipeStep` + `RecipeStepIngredient`-Modell (normalisiert, keine Flat-Text-Parsing-Abhängigkeit)
- **Eingabeformate**: 
  1. Strukturiertes JSON (API/Editor) — primär
  2. CookLang — per Parser in Steps konvertieren (one-way)
  3. Freier Markdown — per KI in Steps konvertieren (one-way, einmalig)
- **Ausgabeformate**:
  1. Generiertes Markdown (für `description`-Fallback, SEO, Druck)
  2. Optional: CookLang-Export für Nutzer

Begründung:
- Normalisierte Daten (FK auf `RecipeItem`) sind robuster als Flat-Text
- SQL-Query „alle Zutaten für Schritt 2" ist trivial
- Änderungen an Mengen (Portion-Skalierung) wirken automatisch in Steps
- CookLang-Parser kann als separate Library gehalten und schrittweise verbessert werden
- Fallback-Markdown bleibt als Export-Format erhalten

---

## 5. Datenmodell

### 5.1 Backend (Django-Modelle)

**Neue App oder in `recipe/` integrieren:** In `recipe/models/steps.py` (Package-Struktur, da `recipe` eine Hybrid-Package-App ist).

```python
class RecipeStep(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    recipe = models.ForeignKey(Recipe, CASCADE, related_name="steps")
    sort_order = models.IntegerField()  # unique_together: (recipe, sort_order)
    instruction = models.TextField()  # Text mit Platzhaltern {ingredient_name} oder @Zutat
    duration_minutes = models.IntegerField(null=True, blank=True)
    section = models.CharField(255, null=True, blank=True)  # z.B. "Teig", "Füllung"
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["sort_order"]
        constraints = [
            models.UniqueConstraint(fields=["recipe", "sort_order"], name="unique_step_order_per_recipe")
        ]


class RecipeStepIngredient(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    step = models.ForeignKey(RecipeStep, CASCADE, related_name="step_ingredients")
    recipe_item = models.ForeignKey(RecipeItem, CASCADE, related_name="step_references")
    quantity_modifier = models.FloatField(null=True, blank=True)  # z.B. 0.5 für "die Hälfte"
    preparation = models.CharField(255, null=True, blank=True)  # z.B. "gehackt", "in Scheiben"
    sort_order = models.IntegerField(default=0)

    class Meta:
        ordering = ["sort_order"]
        # Ein RecipeItem kann nur einmal pro Step referenziert werden
        unique_together = ("step", "recipe_item")
```

### 5.2 Frontend (Zod-Schemas)

```typescript
// frontend-food/src/schemas/recipeStep.ts

const RecipeStepIngredientSchema = z.object({
  id: z.string().uuid().optional(), // nur beim Update/Response
  recipe_item_id: z.string().uuid(),
  quantity_modifier: z.number().nullable().optional(),
  preparation: z.string().nullable().optional(),
  sort_order: z.number().default(0),
});

const RecipeStepSchema = z.object({
  id: z.string().uuid().optional(),
  sort_order: z.number(),
  instruction: z.string().min(1, "Anleitung darf nicht leer sein"),
  duration_minutes: z.number().int().nullable().optional(),
  section: z.string().nullable().optional(),
  step_ingredients: z.array(RecipeStepIngredientSchema).default([]),
});

const RecipeStepsBatchSchema = z.object({
  steps: z.array(RecipeStepSchema).min(1, "Mindestens ein Schritt erforderlich"),
});
```

### 5.3 Schema-Änderungen an bestehenden Modellen

**RecipeDetailSchema** erhält:
```typescript
steps: z.array(RecipeStepSchema).optional(),  // nur wenn Steps existieren
has_structured_steps: z.boolean(),  // true wenn RecipeStep-Einträge existieren
description_generated: z.boolean(),  // true wenn description aus Steps generiert wurde
```

**ContentDetailSchema.description** bleibt erhalten (wird aus Steps generiert oder ist Fallback).

---

## 6. Architektur

### 6.1 Datenfluss

```
┌──────────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                     │
│                                                                      │
│  ┌─────────────────────┐  ┌──────────────┐  ┌────────────────────┐   │
│  │ RecipeDetailPage    │  │ CookingMode  │  │ PrintPage          │   │
│  │ Steps-Akkordeon     │  │ Step-View    │  │ Step-Ausgabe       │   │
│  │ je Step: Zutaten    │  │ Timer+Cooking│  │ je Step: Zutaten   │   │
│  └────────┬────────────┘  └──────┬───────┘  └────────┬───────────┘   │
│           │                      │                    │              │
│  ┌────────▼──────────────────────▼────────────────────▼───────────┐ │
│  │                   resolveStepPlaceholders()                     │ │
│  │  Lädt RecipeItems + Portions, ersetzt {name} durch            │ │
│  │  "5 Zwiebeln, geschält", wendet quantity_modifier an           │ │
│  └────────────────────────────────┬───────────────────────────────┘ │
│                                    │                                 │
│  ┌─────────────────────────────────▼──────────────────────────────┐ │
│  │              INTERAKTIVER DRAG-AND-DROP STEP-EDITOR            │ │
│  │                                                                 │ │
│  │  ┌────────────┐  ┌───────────┐  ┌───────────┐  ┌───────────┐  │ │
│  │  │StepCards   │  │Sektionen  │  │Undo/Redo  │  │Live-      │  │ │
│  │  │DnD, Inline│  │Gruppierung│  │Stack      │  │Vorschau   │  │ │
│  │  │Edit, Timer│  │Collapse   │  │           │  │           │  │ │
│  │  └────────────┘  └───────────┘  └───────────┘  └───────────┘  │ │
│  │                                                                 │ │
│  │  ┌───────────────────────────────────────────────────────────┐ │ │
│  │  │               KI-INTEGRATION (überall)                    │ │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │ │ │
│  │  │  │Komplett- │ │Step-     │ │Zutaten-  │ │Autocomplete  │ │ │
│  │  │  │generierung│ │Umschreiben│ │Zuordnung │ │+ Vorschläge │ │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └─────────────┘ │ │ │
│  │  └───────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────┬─────────────────────────────────────────┘ │
│                          │                                          │
│                    PUT /steps/batch                                  │
│                          │                                          │
└──────────────────────────┼──────────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                      BACKEND                                        │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  RecipeStepSerializer / RecipeStepIngredientSerializer         │  │
│  │  - Batch-Update (löscht alte, erstellt neue)                  │  │
│  │  - Validiert FK: RecipeItem muss zu Recipe gehören            │  │
│  │  - Validiert: Step-Referenzen decken alle RecipeItems ab?     │  │
│  └───────────────────────┬───────────────────────────────────────┘  │
│                           │                                         │
│  ┌────────────────────────▼──────────────────────────────────────┐  │
│  │  AiStepService (Backend)                                       │  │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────┐   │  │
│  │  │generate_from_│ │rewrite_step  │ │convert_markdown_to_  │   │  │
│  │  │items         │ │              │ │steps                 │   │  │
│  │  ├──────────────┤ ├──────────────┤ ├──────────────────────┤   │  │
│  │  │split_step    │ │merge_steps   │ │optimize_order        │   │  │
│  │  └──────────────┘ └──────────────┘ └──────────────────────┘   │  │
│  └────────────────────────┬──────────────────────────────────────┘  │
│                           │                                         │
│  ┌────────────────────────▼──────────────────────────────────────┐  │
│  │  generateDescriptionFromSteps()                                │  │
│  │  - Rendert Steps + aufgelöste Mengen → Markdown               │  │
│  │  - Schreibt in Content.description (SEO, Export, Kompatibilität)│  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 6.2 Platzhalter-Auflösung (Frontend)

```typescript
function resolveStepPlaceholders(
  step: RecipeStep,
  recipeItems: Map<string, RecipeItem>
): { resolvedInstruction: string; ingredients: ResolvedIngredient[] } {
  let resolvedInstruction = step.instruction;
  const ingredients: ResolvedIngredient[] = [];

  for (const si of step.step_ingredients) {
    const item = recipeItems.get(si.recipe_item_id);
    if (!item) continue;

    const quantity = si.quantity_modifier ?? item.quantity;
    const display = buildPortionDisplay(quantity, item.portion_name, item.ingredient_name);
    const displayWithPrep = si.preparation ? `${display}, ${si.preparation}` : display;

    ingredients.push({
      recipeItemId: item.id,
      display: displayWithPrep,
      portionDisplay: display,
      preparation: si.preparation,
    });

    // Platzhalter ersetzen: {Zwiebeln} und {id} und @Zwiebeln
    resolvedInstruction = resolvedInstruction
      .replace(`{${item.ingredient_name}}`, displayWithPrep)
      .replace(`{${item.id}}`, displayWithPrep)
      .replace(`@${item.ingredient_name}{}`, displayWithPrep)
      .replace(`@${item.ingredient_name}`, displayWithPrep);
  }

  // Timer-Platzhalter auflösen
  if (step.duration_minutes) {
    resolvedInstruction = resolvedInstruction.replace(
      /~\{duration\}|\{duration\}/g,
      `${step.duration_minutes} Minuten`
    );
  }

  return { resolvedInstruction, ingredients };
}
```

---

## 7. UI/UX-Skizze

### 7.1 Detailseite — „Zubereitung"-Sektion

```
┌─────────────────────────────────────────┐
│  ▲ Zubereitung · 45 Min · 3 Schritte    │ ← Collapsible Header
├─────────────────────────────────────────┤
│                                         │
│  ┌─── Sektion: Teig ─────────────────┐  │
│  │ Schritt 1                          │  │
│  │ ⏱ 10 Minuten                      │  │
│  │ 500g Mehl mit 300ml Wasser und     │  │
│  │ 1 TL Salz vermengen. 10 Minuten   │  │
│  │ ruhen lassen.                      │  │
│  │ ┌ Zutaten ──────────────────────┐  │  │
│  │ │ ☑ Mehl (500g)                 │  │  │
│  │ │ ☑ Wasser (300ml)              │  │  │
│  │ │ ☑ Salz (1 TL)                 │  │  │
│  │ └───────────────────────────────┘  │  │
│  └────────────────────────────────────┘  │
│                                         │
│  ┌─── Sektion: Belag ────────────────┐  │
│  │ Schritt 2                          │  │
│  │ Tomatensauce auf dem Teig          │  │
│  │ verteilen. ...                     │  │
│  └────────────────────────────────────┘  │
│                                         │
│  [ ✏️ Steps bearbeiten ]                │
└─────────────────────────────────────────┘
```

### 7.2 Kochmodus

```
┌─────────────────────┬─────────────────────┐
│  Zutaten für Schritt│  Schritt 2 von 4    │
│                     │                     │
│  ✔ Mehl (500g)      │  Mehl mit Wasser    │
│  ✔ Wasser (300ml)   │  und Salz           │
│  ☐ Salz (1 TL)      │  vermengen.         │
│                     │                     │
│                     │  ⏱ 10:00           │
│                     │  [⏸] [⏹]          │
│                     │                     │
│  [← Zurück]         │  [Weiter →]         │
└─────────────────────┴─────────────────────┘
```

### 7.3 Editor — Interaktiver Drag-and-Drop Step-Editor

```
┌────────────────────────────────────────────────────────────┐
│  Zubereitungsschritte                            Gesamt:    │
│  ⏱ 30 Min · 4 Schritte · 2 Sektionen                       │
│                                                             │
│  [＋ Schritt hinzufügen]  [📥 CookLang]  [🤖 KI generieren] │
│  [↶ Undo]  [↷ Redo]                                         │
│                                                             │
│  ┌────────────────────────────────────────────────────┐    │
│  │  ─── Sektion: Teig ────────────────────────────    │    │
│  │                                                     │    │
│  │  ┌─── Schritt 1 ───────────────────────────────┐   │    │
│  │  │ ≡ ①   ⏱ [10] Min.   Sektion: [Teig     ▼]  │   │    │
│  │  │ ┌────────────────────────────────────────┐  │   │    │
│  │  │ │ ⋮ @Mehl{}, @Wasser{} und @Salz{} in    │  │   │    │
│  │  │ │ ⋮ einer Schüssel vermengen. ~{10} Min. │  │   │    │
│  │  │ │ └─── Live-Vorschau ──────────────────┐ │  │   │    │
│  │  │ │ ✅ 500g Mehl mit 300ml Wasser und    │ │  │   │    │
│  │  │ │     1 TL Salz in einer Schüssel      │ │  │   │    │
│  │  │ │     vermengen. 10 Min. ruhen lassen. │ │  │   │    │
│  │  │ └──────────────────────────────────────┘ │  │   │    │
│  │  │ ── Zutaten ──────────────────────────    │  │   │    │
│  │  │  ☑ Mehl (500g)        Vorbereitung: [ ]  │  │   │    │
│  │  │  ☑ Wasser (300ml)     Vorbereitung: [ ]  │  │   │    │
│  │  │  ☑ Salz (1 TL)        Vorbereitung: [ ]  │  │   │    │
│  │  │  [+ Zutat ▼]  [🤖 automatisch]          │  │   │    │
│  │  │ ─────────────────────────────────────    │  │   │    │
│  │  │ [🔗 Platzhalter ▼]  [🤖 umschreiben ▼]  │  │   │    │
│  │  │ [＋ danach]  [✕ Löschen]  [⟵⟶ Split]    │  │   │    │
│  │  └──────────────────────────────────────────┘  │   │    │
│  │                                                 │   │    │
│  │  ┌─── Schritt 2 ───────────────────────────┐   │   │    │
│  │  │ ≡ ②   ⏱ [15] Min.   Sektion: [Teig  ▼] │   │   │    │
│  │  │ ⋮ Den Teig auf einer bemehlten Fläche    │   │   │    │
│  │  │ ⋮ @Mehl{} kneten...                     │   │   │    │
│  │  │ [🔗 Platzhalter ▼]  [🤖 umschreiben ▼]   │   │   │    │
│  │  └──────────────────────────────────────────┘   │   │    │
│  │                                                 │   │    │
│  │  ─── Sektion: Belag ───────────────────────    │   │    │
│  │                                                 │   │    │
│  │  ┌─── Schritt 3 ───────────────────────────┐   │   │    │
│  │  │ ≡ ③   ⏱ [5] Min.    Sektion: [Belag ▼] │   │   │    │
│  │  │ ─────────────────────────────────────    │   │   │    │
│  │  │  ☑ Tomatensauce (200ml)   Vorbereitung:[ ]│   │    │
│  │  │  [+ Zutat ▼]  [🤖 automatisch]          │   │   │    │
│  │  │ [🤖 umschreiben ▼]                       │   │   │    │
│  │  └──────────────────────────────────────────┘   │   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                             │
│  [💾 Speichern]                    🤖 KI-Assistent aktiv    │
│                                      [Vorschlag anfordern]  │
└────────────────────────────────────────────────────────────┘
```

**Editor-Features im Detail:**
- **Drag-and-Drop**: Steps per ≡-Handle in beliebiger Reihenfolge ziehen, auch zwischen Sektionen
- **Sektionen**: Einklappbare Gruppen. Steps per Drag in eine Sektion ziehen. Neue Sektion per Button
- **Live-Vorschau**: Unter dem Instruction-Editor wird in Echtzeit der aufgelöste Text mit konkreten Mengen angezeigt
- **KI-Autocomplete**: Während der Eingabe schlägt KI Zutaten-Platzhalter, Timer und Formulierungen vor
- **Step-Aktionen pro Karte**: Umschreiben, Split, Löschen, Duplizieren, + danach
- **Bulk-Aktionen**: Mehrere Steps anwählen (Checkbox links) → Zusammenführen, Löschen, KI-optimieren

---

## 8. Migration & Kompatibilität

### 8.1 Bestehende Rezepte

| Szenario | Verhalten |
|---|---|
| Rezept hat `steps` → wird bevorzugt | `description` ist automatisch generiert aus Steps |
| Rezept hat KEINE `steps`, ABER `description` | Fallback: heuristische Schrittparsung wie bisher (`parseRecipeSteps.ts`), API liefert `has_structured_steps: false` |
| Rezept wird zum ersten Mal bearbeitet | Button „Aus Beschreibung Schritte generieren (KI)" → konvertiert `description` → Steps, danach `has_structured_steps: true` |
| Rezept wird via API erstellt mit `steps` | Steps werden gespeichert, `description` wird automatisch generiert |

### 8.2 description wird zum generierten Feld

Sobald ein Rezept strukturierte Steps hat, wird `Content.description` automatisch aus den Steps generiert:

```python
def generate_description_from_steps(recipe):
    lines = []
    for step in recipe.steps.order_by("sort_order"):
        if step.section:
            lines.append(f"## {step.section}")
        instruction = resolve_placeholders(step)
        if step.duration_minutes:
            instruction += f"\n⏱ {step.duration_minutes} Minuten"
        lines.append(instruction)
        lines.append("")  # Leerzeile
    return "\n".join(lines)
```

### 8.3 API-Kompatibilität

- `GET /api/recipes/{slug}`: `description` bleibt enthalten (generiert aus Steps, oder Fallback)
- Neues Feld `has_structured_steps: boolean`
- Neues Feld `steps: RecipeStepOut[]` (optional, nur wenn vorhanden)
- `PUT /api/recipes/{slug}` / `PATCH`: Wenn `steps` im Body → Steps aktualisieren, `description` neu generieren
- Alte Clients: arbeiten weiterhin mit `description` (Markdown)

---

## 9. Aufwandsabschätzung

| Phase | Task | Geschätzter Aufwand |
|---|---|---|---|
| **1. Datenmodell** | Django-Modelle + Migrationen | 2-3 PT |
| **2. Backend API** | CRUD-Endpunkte, Serializer, Batch-Update, Validierung | 3-4 PT |
| **3. Backend AI** | `AiStepService` (generate, rewrite, convert, suggest, split, merge, optimize) | 5-7 PT |
| **4. Frontend Schemas** | Zod-Schemas, Types, API-Hooks, Step-Store (Zustand mit Undo/Redo) | 2-3 PT |
| **5. Frontend Darstellung** | Step-Rendering Detailseite, CookingMode-Integration, Print-Update | 3-4 PT |
| **6. Frontend Editor** | Interaktiver Drag-and-Drop Editor (StepCards, Sektionen, DnD, Live-Vorschau, Inline-Edit, Undo/Redo-UI) | 8-12 PT |
| **7. Frontend KI-Integration** | KI-Button-Komplettgenerierung, Step-weises Umschreiben, Zutaten-Autocomplete, Inline-Vorschläge | 4-6 PT |
| **8. CookLang-Parser** | Python-Parser (Backend) + TS-Parser (Frontend) | 3-5 PT |
| **9. Migration** | Bestandsrezepte, `description`-Generierung, Fallback-Logik | 2-3 PT |
| **10. Tests** | Unit-Tests, Integrationstests (Backend + Frontend), E2E | 5-7 PT |
| **Gesamt** | | **37-54 PT** |

---

## 10. Offene Fragen

1. **CookLang-Parser**: Selbst bauen oder bestehende Library nutzen? Python: `cooklang-py` existiert, aber Wartungszustand prüfen. JS/TS: `cooklang-ts` vorhanden?
2. **Platzhalter-Syntax**: `{ingredient_name}` (einfach, aber Name-Änderungen brechen es) oder `{recipe_item_id}` (robust, aber unleserlich)? Empfehlung: Beide unterstützen, Speicherung bevorzugt per ID.
3. **Sektionen vs. flache Steps**: Sektionen nur als Gruppierung (optional) oder verpflichtend? Empfehlung: Optional, für einfache Rezepte nicht nötig.
4. **Cookware-Tabelle**: Einfaches Text-Feld pro Step, oder eigene Cookware-Tabelle mit FK? Empfehlung: erstmal Text, später ausbaubar.
5. **Mehrsprachigkeit**: Platzhalter nur auf Deutsch? Oder i18n für Zutatennamen? Empfehlung: vorerst Deutsch, Platzhalter-Auflösung sprachabhängig später.
6. **Timer im Kochmodus**: Nur Anzeige oder echter Countdown mit Benachrichtigung (Service Worker, Audio)? Empfehlung: erst Countdown, später Benachrichtigung.
7. **Offline-Caching**: Steps in IndexedDB? Oder reichen LocalStorage/generischer API-Cache?
8. **Drag-and-Drop-Bibliothek**: `dnd-kit` (modern, Tree-Strukturen) oder `react-beautiful-dnd` (einfacher, aber eingestellt)? Empfehlung: `dnd-kit` (aktiv maintained, unterstützt vertikale Listen + Tree für Sektionen)
9. **Undo/Redo-Strategie**: Command-Pattern (jede Aktion = Command mit execute/undo) oder Snapshot-basiert (State vor jeder Änderung speichern)? Empfehlung: Command-Pattern mit Zustand-Store (Zustand + Immer für Diffs)
10. **KI-Latenz**: Step-Umschreibung in Echtzeit (Streaming) oder als separater Request? Empfehlung: Streaming für Autocomplete/ Vorschläge, separater Request für Komplettgenerierung und Umschreibung
11. **Editor-Modus für mobile Geräte**: Auf <768px: Step-Editor als vertikale Liste ohne Drag (nur ↑↓ Buttons), Fokus auf Inline-Editing? Oder komplett separater Mobile-Editor?

---

## 11. Priorisierung (MVP vs. Zukunft)

### MVP (Phase 1 — essenziell)
- [x] `RecipeStep` + `RecipeStepIngredient` Datenmodell + Migrationen
- [x] Batch-API: `PUT /steps/batch` + Validierung
- [x] Interaktiver Drag-and-Drop Step-Editor (umsortieren, editieren, löschen, hinzufügen)
- [x] Platzhalter-System: `{ingredient_name}` → aufgelöste Mengenanzeige
- [x] Live-Vorschau im Editor (Platzhalter → konkrete Werte)
- [x] Zutaten-Zuordnung pro Step (Checkbox-Liste + Preparation + Quantity-Modifier)
- [x] Sektionen-Gruppierung (anlegen, Steps zuweisen, einklappen)
- [x] Undo/Redo für alle Editier-Aktionen
- [x] Schritt-Rendering auf Detailseite (collapsible Akkordeon)
- [x] Schritt-bezogene Zutatenliste im Kochmodus
- [x] Timer-Anzeige + Countdown im Kochmodus
- [x] Backend-KI: `generate_steps_from_items()` — Steps aus Zutaten generieren
- [x] Backend-KI: `convert_markdown_to_steps()` — Bestands-Markdown einmalig konvertieren
- [x] Backend-KI: `rewrite_step()` — Einzelnen Step umschreiben (Ton, Beibehaltung)
- [x] Frontend-KI: „🤖 Schritt-für-Schritt generieren"-Button im Editor
- [x] Frontend-KI: „🤖 KI umschreiben"-Button pro Step-Karte
- [x] Frontend-KI: Zutaten-Autocomplete beim Tippen von `{`
- [x] Auto-Generierung von `description` aus Steps (SEO/Export)
- [x] `has_structured_steps` + `steps`-Felder in API

### Phase 2 — wichtig
- [ ] CookLang-Import (Parser + UI-Button + direkt in Editor laden)
- [ ] KI-Split / KI-Merge (Step teilen + zusammenführen)
- [ ] KI-Zutaten-Zuordnung („🤖 automatisch" pro Step)
- [ ] KI-Reihenfolge-Optimierung
- [ ] KI-Snippet-Vorschläge während der Eingabe (deaktivierbar)
- [ ] Cookware-Tabelle und -Zuordnung
- [ ] Freitext-Import: „Beschreibe dein Rezept" → KI parst in Steps + Items
- [ ] Bild-Import: Rezept fotografieren → KI extrahiert Steps

### Phase 3 — nice to have
- [ ] CookLang-Export für Nutzer
- [ ] Service-Worker-Timer-Benachrichtigungen (Audio bei Ablauf)
- [ ] Step-weise KI-Verbesserung mit Tone-Presets („für Kinder", „professionell")
- [ ] Drag-and-Drop zwischen Sektionen (Step in andere Sektion ziehen)
- [ ] Bulk-Aktionen: Mehrere Steps auswählen → merge/löschen/KI-optimieren
- [ ] i18n für Zutatennamen in Platzhaltern
- [ ] KI-Erkennung von Zutaten-Referenzen im Fließtext („Mehl" → „{Mehl} einfügen?")
- [ ] Dauer-Erkennung: „10 Minuten" → Timer-Markierung vorschlagen
