## Context

Die Essensplan-Detailansicht (`MealEventDetailPage.tsx`) und Tabellenansicht (`TableView.tsx`) im Frontend-Food zeigen Mahlzeiten-Daten an. Die API liefert bereits alle benötigten Felder (`energy_kj`, `cost_eur`, `factor`, `day_part_factor`, `total_energy_kj`), aber die UI nutzt sie nicht optimal.

## Goals / Non-Goals

**Goals:**
- Soll/Ist-Energievergleich klar und verständlich darstellen
- Faktoren immer mit deutscher Dezimalformatierung (Komma, eine Nachkommastelle)
- Tabellen-Zellen informativer gestalten (Energie, Kosten, Faktor)

**Non-Goals:**
- Keine API-Änderungen
- Keine neuen Berechnungslogik im Backend
- Kein Redesign der Gesamtstruktur

## Decisions

### 1. Soll/Ist-Energie als Label-Paar

**Entscheidung:** `Soll: 35% │ Ist: 7%` statt `(35%) 7%`

**Rationale:** Explizite Labels eliminieren Mehrdeutigkeit. Der Pipe-Separator (`│`) trennt visuell ohne zu viel Platz zu brauchen.

**Betroffene Datei:** `frontend-food/src/pages/planning/MealEventDetailPage.tsx` (Zeilen 808-814)

### 2. Faktor-Formatierung mit `toFixed(1)` + Komma

**Entscheidung:** Alle Faktor-Anzeigen verwenden `value.toFixed(1).replace('.', ',')` für konsistente Darstellung.

**Betroffene Stellen:**
- `FactorInput` Komponente (Zeile 515): Initial-Wert und Reset-Wert
- Read-only Faktor (Zeile 898): Anzeige ohne Input

### 3. Tabellen-Zellen mit Zusatzinfos

**Entscheidung:** Pro Zelle zeigen: Rezeptname, Faktor (× 1,0), Energie (kcal), Kosten (€), Portionen.

**Betroffene Datei:** `frontend-food/src/pages/planning/TableView.tsx` (Zeilen 101-126)

**Layout pro Zelle:**
```
Kartoffelsuppe
× 1,0 · 76 kcal · 3,50 €
12 Pers.
```

## Risks / Trade-offs

- **Platzbedarf in Tabelle**: Mehr Info pro Zelle kann auf kleinen Bildschirmen eng werden → `min-w` ggf. erhöhen, `truncate` beibehalten
- **Keine Migration nötig**: Rein kosmetisch, kein Risiko für Datenverlust
