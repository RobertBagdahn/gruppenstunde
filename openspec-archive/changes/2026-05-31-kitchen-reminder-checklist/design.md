## Context

Die `shopping` App hat bereits Models für `ShoppingList`, `ShoppingListItem` und Kollaboratoren. Einkaufslisten werden aus Rezepten oder Essensplänen generiert und zeigen Zutaten gruppiert nach Einzelhandelsabteilung (`RetailSection`). Non-Food-Artikel wie Klopapier oder Spülmittel fehlen komplett, da sie in keinem Rezept vorkommen.

## Goals / Non-Goals

**Goals:**
- Eigenes Datenmodell für Küchenbedarf-Erinnerungen, pflegbar über Django Admin
- Kategorien als eigenes Model für maximale Flexibilität
- Anzeige als reine Erinnerungsliste (kein persistenter Check-Status) am Ende jeder Einkaufsliste
- User können Vorschläge einreichen, die erst nach Admin-Freigabe für alle sichtbar werden
- Data-Migration mit 20 initialen Artikeln in 5 Kategorien

**Non-Goals:**
- Kein Abhaken mit Persistenz (rein visuell im Frontend, ggf. localStorage)
- Keine Verknüpfung zwischen Reminder und konkreter ShoppingList
- Keine Mengenangaben
- Kein Bestell-/Warenwirtschaftssystem

## Decisions

### 1. Zwei neue Models in `shopping` App

```python
class KitchenReminderCategory(models.Model):
    name = CharField(max_length=100)          # z.B. "Reinigung"
    sort_order = IntegerField(default=0)
    created_at = DateTimeField(auto_now_add=True)

class KitchenReminder(models.Model):
    name = CharField(max_length=200)          # z.B. "Spülmittel"
    category = ForeignKey(KitchenReminderCategory)
    sort_order = IntegerField(default=0)
    is_published = BooleanField(default=False)
    suggested_by = ForeignKey(User, null=True, blank=True)
    created_at = DateTimeField(auto_now_add=True)
```

### 2. API-Design

- `GET /api/kitchen-reminders/` — Alle veröffentlichten + eigene unveröffentlichte, gruppiert nach Kategorie
- `POST /api/kitchen-reminders/suggest/` — Neuen Vorschlag einreichen (is_published=False, suggested_by=request.user)

### 3. Admin-Workflow

- `KitchenReminderCategory`: Sortierbar, inline editierbar
- `KitchenReminder`: Liste mit Filter nach `is_published` und `suggested_by`. Admin kann Vorschläge prüfen, Kategorie zuweisen, umbenennen, veröffentlichen.

### 4. Frontend-Integration

Neue Sektion am Ende von `ShoppingListDetailPage`:
- Trennlinie + Überschrift "Küchenbedarf – Erinnerung"
- Gruppiert nach Kategorie
- Lokales Abhaken (localStorage oder component state, nicht persistiert)
- "Vorschlag hinzufügen"-Button mit einfachem Input-Feld

### 5. Kein Check-Status auf dem Server

Bewusste Entscheidung: Erinnerungen sind global und statisch. Es gibt keinen Grund, pro Einkaufsliste zu tracken ob "Klopapier" abgehakt wurde. Lokaler State reicht.

## Risks / Trade-offs

- **Risiko**: Liste wird zu lang → Mitigation: Kategorien sind klappbar (Accordion)
- **Trade-off**: Kein Server-seitiger Check-Status bedeutet, dass Kollaboratoren den Status nicht teilen → Akzeptabel, da es nur eine Erinnerung ist
- **Trade-off**: Vorschlags-Workflow über Admin statt eigener UI → Einfacher, reicht für den Anfang
