## Context

Der Zutat-Zauberstab (`ai-suggest-all`) erzeugt Portionsvorschläge über Gemini, aber vier unabhängige Code-Stellen pflegen eigene Prompt-Formulierungen und Beispieltabellen für Einheiten-Gewichte:

1. `backend/supply/services/ingredient_ai_suggest_service.py::suggest_all_fields()` (bestehende Zutat, Preview-only Endpoint)
2. `backend/supply/services/ingredient_ai_suggest_service.py::ai_create_ingredient()` (neue Zutat aus Namen, speichert direkt)
3. `backend/recipe/services/url_import_service.py` (Rezept-URL-Import)
4. `backend/recipe/services/ingredient_enrichment.py` (unbekannte Zutat beim Rezept-Parsing)

Das Antwortschema für Pfad 1 (`PortionSuggestionOut`) verliert dabei `measuring_unit_name` beim Serialisieren, wodurch das Frontend beim Übernehmen eines Vorschlags nie eine gültige `measuring_unit_id` an `POST /{slug}/portions/` schicken kann — das nicht-nullable FK-Feld `Portion.measuring_unit` bleibt unbelegt und der Save schlägt fehl. Zusätzlich ist der gesamte Übernehmen-Flow rein additiv (kein Replace), feuert mehrere `createPortion`-Mutationen parallel ohne Transaktion (TOCTOU-Risiko am Unique-Constraint `unique_portion_name_per_ingredient`), und die Prompt-Texte verlangen explizit Zahlen im Portionsnamen (z.B. „1 Packung (500g)").

`Portion` wird von `RecipeItem.portion` mit `on_delete=PROTECT` referenziert; das existierende Lösch-Pattern ist **Soft-Delete** (`deleted_at`, siehe `portion-soft-delete` Spec) — ein Hard-Delete kommt im gesamten Code nirgends vor. System-Portionen (`is_system=True`: „g", „Packung", „Stück") werden aktuell einmalig per `post_save`-Signal (`_create_system_portions`) angelegt und sind vor Soft-Delete über die normale API geschützt (422). Die Frühstücks-„Belag knapp/normal/üppig"-Portionen (Tag `breakfast-topping`) sind dagegen **nicht** `is_system=True` und daher schon heute ungeschützt löschbar — der KI-Flow kennt dieses System bisher gar nicht.

## Goals / Non-Goals

**Goals:**
- Ein einziges, wiederverwendbares `PortionSuggestion`-Pydantic-Schema (inkl. `portion_type`-Enum) für alle vier Prompt-Stellen.
- Portionsnamen ohne Ziffern; Gewicht ausschließlich in `weight_g`/`quantity`.
- Verpflichtende Mindestabdeckung im Antwortschema: System-Gramm (1g), ≥1 Rezeptportion, ≥1 Packungsgröße; bedingt Belag (bei `breakfast-topping`) und Backmenge (bei neuem Tag `baking-ingredient`).
- Neuer atomarer Endpoint `POST /{slug}/portions/ai-apply/`, der Delete (optional) + Create in einer DB-Transaktion durchführt und den `measuring_unit_id`-Bug behebt.
- Opt-in „Alte Portionen ersetzen"-Checkbox: Soft-Delete aller bestehenden Portionen der Zutat (inkl. system/Belag), danach verpflichtende Neuanlage der „1g"-System-Portion.
- Konsolidierte Einheiten-Wissensbasis (`portion_knowledge.py`) als Single Source of Truth für Beispielgewichte (EL, TL, Prise, Ei, Schuss, …), genutzt von allen vier Call-Sites.

**Non-Goals:**
- Kein automatischer Backfill bestehender, zahlenhaltiger Portionsnamen (nur Neuvorschläge sind betroffen).
- Keine Änderung am `Portion`-Datenbankschema (alle benötigten Felder existieren bereits).
- Keine Änderung an Drag&Drop-Ranking (`portion-ranking` Spec) oder an der Anzeige-Logik in `IngredientList`.
- Keine Migration/Anpassung des `ingredient_specs.py`-Datensatzes (kuratierte Packungsgrößen) — Cross-Referenzierung ist ein mögliches Folge-Thema, aber nicht Teil dieses Changes.
- Kein Hard-Delete von Portionen unter irgendeiner Bedingung.

## Decisions

### 1. Ein gemeinsames `PortionSuggestion`-Schema mit `portion_type`-Enum statt separater Scalar-Felder

Statt wie bisher `stueck_weight_g`/`packung_weight_g` als eigene Scalar-Felder neben einer flachen `portions`-Liste zu führen, wird ein einziges `portion_type`-Enum (`system_gramm`, `rezeptportion`, `packung`, `belag`, `backmenge`) pro `PortionSuggestion`-Eintrag eingeführt. Das Antwortschema (`IngredientPortionSuggestSchema`) gruppiert danach:
```python
class PortionSuggestion(BaseModel):
    name: str  # KEINE Ziffern, validiert via field_validator
    weight_g: float
    quantity: float = 1.0
    measuring_unit_name: str
    rank: int
    portion_type: PortionType

class IngredientPortionSuggestSchema(BaseModel):
    system_gramm: PortionSuggestion            # Pflicht, immer name="g", weight_g=1
    rezeptportionen: list[PortionSuggestion]    # min_length=1
    packungen: list[PortionSuggestion]          # min_length=1
    belag: list[PortionSuggestion] = []         # nur befüllt bei Tag breakfast-topping
    backmengen: list[PortionSuggestion] = []    # nur befüllt bei Tag baking-ingredient
```
**Alternative verworfen**: Weiterhin eine flache Liste mit `rank`-Heuristik zur Kategorisierung — wurde verworfen, weil das genau die heutige Mehrdeutigkeit ist (Frontend muss raten, was „System" vs. „Belag" vs. „Packung" ist) und weil das Pydantic-`min_length`-Constraint die Mindestabdeckung nicht erzwingen kann, wenn alles in einem Array liegt.

### 2. Namens-Validator statt Prompt-only-Instruktion

Ein `field_validator` auf `PortionSuggestion.name` lehnt Namen mit Ziffern hart ab (Gemini-Retry mit Fehlermeldung im Prompt-Kontext), statt sich allein auf die Prompt-Formulierung zu verlassen. Modelle halten sich erfahrungsgemäß nicht zuverlässig an rein textuelle Vorgaben (siehe aktuelle Prompt-Texte, die bereits Beispielnamen mit Zahlen enthalten).
**Alternative verworfen**: Serverseitiges stillschweigendes Strippen von Ziffern aus dem Namen — verworfen, da das zu unsinnigen Namen führen kann (z.B. „500g Packung" → „g Packung") und Fehler verschleiert statt sie sichtbar zu machen.

### 3. Mehrere Packungsgrößen über deskriptive Namen, nicht über Zahlen

Da Namen keine Ziffern enthalten dürfen, aber mehrere Packungsgrößen unterscheidbar sein müssen, wird der Prompt angewiesen, Adjektive zu verwenden: „Packung", „Großpackung", „Vorratspackung", „Kleine Packung". Das Gewicht steckt ausschließlich in `weight_g`.

### 4. Neuer atomarer Apply-Endpoint statt Wiederverwendung der Einzel-Endpoints

`POST /{slug}/portions/ai-apply/` mit Body `{ replace_all: bool, selected: PortionApplyIn[] }`:
```python
@transaction.atomic
def ai_apply_portions(request, slug, payload):
    ingredient = get_object_or_404(Ingredient, slug=slug)
    if payload.replace_all:
        Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True).update(deleted_at=timezone.now())
    # System-Gramm-Portion ist nach Replace immer verpflichtend zuerst neu anzulegen
    if payload.replace_all or not ingredient.portions.filter(name__iexact="g", deleted_at__isnull=True).exists():
        _create_system_portions(ingredient)  # bestehende, get_or_create-basierte Funktion aus signals.py wiederverwendet
    for suggestion in payload.selected:
        measuring_unit = MeasuringUnit.objects.get_or_create(name__iexact=suggestion.measuring_unit_name, ...)
        Portion.objects.create(ingredient=ingredient, name=suggestion.name, measuring_unit=measuring_unit,
                                quantity=suggestion.quantity, weight_g=suggestion.weight_g, rank=suggestion.rank)
```
Dies löst gleichzeitig: den `measuring_unit_id`-Bug (jetzt serverseitig aus `measuring_unit_name` aufgelöst), die Race-Condition (eine Transaktion statt N parallele Mutationen), und macht „Ersetzen" atomar (entweder alles oder nichts, kein Zwischenzustand ohne „g"-Portion sichtbar).
**Alternative verworfen** (Frontend sequenzialisiert bestehende Einzel-Endpoints): technisch möglich, aber löst die Atomarität nicht (kein DB-Transaktions-Wrapper über HTTP-Requests hinweg möglich) und würde bei einem Fehler mitten in der Sequenz einen inkonsistenten Zustand (z.B. alte Portionen bereits gelöscht, neue nur teilweise angelegt) hinterlassen.

### 5. Soft-Delete auch für System-Portionen im Replace-Fall

Der bestehende Schutz „System-Portionen können nicht gelöscht werden" (422 in `delete_portion`) gilt nur für den regulären Einzel-Lösch-Endpoint. Der neue `ai-apply`-Endpoint bypassed diesen Schutz gezielt und ausschließlich für den Fall `replace_all=true`, da hier die sofortige Pflicht-Neuanlage der „g"-Portion im selben Request-Zyklus garantiert ist. Da Löschen `soft_delete()` ist, bleiben referenzierende `RecipeItem`s unversehrt (siehe `portion-soft-delete` Spec: „RecipeItem mit gelöschter Portion" — Name bleibt korrekt angezeigt).

### 6. Konsolidierte Einheiten-Wissensbasis als eigenes Modul

Neues Modul `backend/supply/services/portion_knowledge.py` mit einer zentralen Konstante (z.B. `TYPICAL_UNIT_WEIGHTS: dict[str, float]`, `PORTION_TYPE_EXAMPLES: dict[PortionType, list[str]]`) und einer Funktion `build_portion_prompt_section(ingredient, tags) -> str`, die von allen vier Call-Sites importiert wird. Damit ist sichergestellt, dass z.B. „1 EL = 15g" überall konsistent verwendet wird statt an vier Stellen leicht unterschiedlich formuliert zu sein.

### 7. Neuer Tag `baking-ingredient` statt Wiederverwendung von `RetailSection`

Ein dedizierter Content-Tag (analog `breakfast-topping`/`breakfast-fat`, Pattern aus `breakfast-spread` Spec) statt des bestehenden `RetailSection`-Felds „Brot & Backwaren", da Letzteres auch fertige Backwaren (nicht nur Zutaten wie Mehl/Zucker/Hefe) umfassen würde und damit zu falsch-positiven Backmengen-Vorschlägen führen könnte (z.B. bei einem fertigen Brötchen).

## Risks / Trade-offs

- **[Risk]** `replace_all=true` löscht auch manuell/sorgfältig gepflegte Portionen, wenn der Nutzer die Checkbox versehentlich aktiviert. → **Mitigation**: Checkbox ist explizit opt-in (Standard: aus), UI zeigt vor dem Absenden eine deutliche Warnung/Zusammenfassung („N bestehende Portionen werden ersetzt"); da Soft-Delete, ist der Vorgang bei Bedarf über Admin/DB reversibel.
- **[Risk]** Gemini hält sich trotz Validator nicht an die Mindestabdeckung (z.B. keine Packungsgröße für sehr spezielle Zutaten wie Gewürze). → **Mitigation**: Pydantic `min_length=1` erzwingt einen Retry/Fehler statt eines stillen leeren Arrays; Fallback-Text im Prompt mit Beispielen für schwierige Fälle (z.B. Salz → „Prise" als Rezeptportion, „Streuer" als Packung).
- **[Risk]** Bestehende, bereits gespeicherte Portionsnamen mit Ziffern werden durch diesen Change nicht bereinigt — Inkonsistenz zwischen alten und neuen Zutaten bleibt sichtbar. → **Mitigation**: Bewusster Non-Goal (siehe oben); optionaler Folge-Change für Backfill/Migration wird in `tasks.md` als offene Notiz vermerkt, nicht in diesem Change umgesetzt.
- **[Risk]** Konsolidierung der 4 Prompt-Stellen kann bestehende, funktionierende Prompts (`url_import_service`, `ingredient_enrichment`) subtil verändern und dortige Test-Snapshots/Verhalten brechen. → **Mitigation**: Bestehende Tests für diese beiden Services vor Umbau laufen lassen, nach Umbau erneut prüfen; Wissensbasis wird additiv importiert (Werte identisch übernommen, nicht neu erfunden).
- **[Trade-off]** Der neue `ai-apply`-Endpoint dupliziert einen Teil der Logik aus `create_portion`/`delete_portion` (Einheiten-Resolution, Validierung) statt sie wiederzuverwenden. Bewusst in Kauf genommen, da der System-Portion-Bypass für `replace_all` und die Transaktions-Anforderung sich nicht sauber in die bestehenden öffentlichen Einzel-Endpoints einfügen lassen, ohne deren reguläre Schutzmechanismen (422 bei is_system) aufzuweichen.

## Migration Plan

1. Backend: `portion_knowledge.py` + `PortionType`-Enum + `PortionSuggestion`-Schema neu anlegen (keine DB-Migration nötig).
2. Backend: `baking-ingredient` Tag per Management-Command/Data-Migration seeden (analog `seed_breakfast_catalog`-Pattern), keine Anwendung auf bestehende Zutaten in diesem Change (manuelle/spätere Zuordnung).
3. Backend: Vier Prompt-Stellen nacheinander auf gemeinsames Schema umstellen, beginnend mit `suggest_all_fields()` (höchste Priorität, da Zauberstab-Flow).
4. Backend: Neuer `ai-apply`-Endpoint + Zod/Pydantic-Schema-Sync.
5. Frontend: Dialog-Gruppierung nach `portion_type`, Checkbox, neuer Hook für `ai-apply`.
6. Rollback: Da keine DB-Schema-Änderung, ist ein Rollback ein reiner Code-Revert; einzige persistente Nebenwirkung ist der geseedete `baking-ingredient`-Tag (harmlos, kann bleiben).

## Open Questions

- Soll der optionale Folge-Change „Backfill alter, zahlenhaltiger Portionsnamen" als eigener Change vorgeschlagen werden, sobald dieser Change abgeschlossen ist?
- Soll `ingredient_specs.py` (kuratierte Packungsgrößen) in einem Folge-Change gegen die Live-KI-Vorschläge abgeglichen werden, um Doppelarbeit/Widersprüche zu vermeiden?
