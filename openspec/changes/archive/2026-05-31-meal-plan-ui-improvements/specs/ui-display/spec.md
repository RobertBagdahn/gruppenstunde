## ADDED Requirements

### Faktor-Formatierung

- Alle Faktor-Werte werden mit genau einer Nachkommastelle und deutschem Dezimalkomma dargestellt (z.B. "1,0", "1,5", "2,0")
- Gilt für: FactorInput-Initialwert, Read-only-Anzeige, Tabellen-Zellen

### Soll/Ist-Energie-Anzeige

- Meal-Slot-Header zeigt Soll- und Ist-Energie als beschriftetes Paar: `Soll: X% │ Ist: Y%`
- Soll = `day_part_factor * 100`, gerundet auf ganze Zahl
- Ist = berechneter Coverage-Prozentsatz

### Erweiterte Tabellen-Zellen

- Jede Tabellen-Zelle zeigt pro Rezept: Name, Faktor, Energie (kcal), Kosten (€)
- Format Energie: `{Math.round(energy_kj / 4.184)} kcal`
- Format Kosten: `{cost.toFixed(2).replace('.', ',')} €`
- Portionen-Anzeige bleibt bestehen
