## Context

Die `NutritionalTag`-Einträge sind Master Data (Stammdaten), die über M2M-Relationen mit `Ingredient`, `Recipe`, `UserProfile`, `Person` und `Participant` verknüpft sind. Die aktuellen Seed-Daten (28 Einträge in `backend/data/masterdata/supply_nutritionaltag.json`) haben inkonsistente Semantik: `name` enthält mal ein Lebensmittel ("Tierische Produkte"), mal ein Merkmal ("vegan"). `name_opposite` ist ebenso uneinheitlich.

Das Modell selbst (`supply.NutritionalTag`) ändert sich nicht — nur die Daten. Es gibt keine Migration im Django-Sinne, sondern eine Datenbereinigung des Seeds und der Produktionsdaten.

## Goals / Non-Goals

**Goals:**
- Einheitliche Semantik: `name` = menschliches Merkmal, `name_opposite` = problematischer Inhaltsstoff
- Zwei konsistente Namensschemata: medizinisch (`-allergie`/`-unverträglichkeit`) und Präferenz (`-frei`)
- Vollständige EU-Allergen-Abdeckung mit korrektem `is_dangerous`
- Bestehende PKs und M2M-Verknüpfungen bleiben erhalten
- Löschung von Halal und Koscher (keine echten Ernährungsmerkmale)

**Non-Goals:**
- Keine Schema-Änderungen (Pydantic/Zod)
- Keine API-Änderungen
- Keine Änderung der `import_legacy_food`-Logik (nutzt `get_or_create(name=...)` und findet bestehende Einträge)
- Keine neuen UI-Komponenten

## Decisions

### Decision 1: PK-Erhalt statt Neuanlage

**Entscheidung**: Bestehende Einträge werden per UPDATE auf neue name/name_opposite-Werte geändert, neue Einträge (Milchallergie, Schalentierallergie) werden als INSERT hinzugefügt. Gelöschte Einträge (Halal, Koscher) werden entfernt.

**Alternativen**:
- *Alles löschen und neu anlegen*: Würde alle M2M-Verknüpfungen zerstören. Abgelehnt.
- *Data-Migration mit PK-Mapping*: Overkill für Stammdaten-Änderung, da nur 28→30 Einträge.

**Umsetzung**: Fixture-Datei wird komplett neu geschrieben. Für den Import auf Prod wird ein separates Update-Skript erstellt, das die bestehenden Einträge anhand ihrer aktuellen `name`-Werte identifiziert und aktualisiert.

### Decision 2: Zwei Namensschemata

**Entscheidung**: Medizinische Einträge enden auf `-allergie` (Immunsystem-Reaktion) oder `-unverträglichkeit` (Stoffwechsel/Mangel). Präferenz-Einträge enden auf `-frei` (freiwilliger Verzicht).

**Begründung**: Die Unterscheidung ist für die Darstellung in der UI wichtig — Allergien sind gefährlich (`is_dangerous=true`) und müssen hervorgehoben werden. Die Endung kommuniziert bereits den Schweregrad.

**Begründung `-unverträglichkeit` statt `-intoleranz`**: Im Deutschen sind beide synonym. `-unverträglichkeit` ist das gebräuchlichere deutsche Wort, `-intoleranz` ist ein Latinismus. Einheitlichkeit war das Ziel.

### Decision 3: Vegan/Vegetarisch als Ausnahmen

**Entscheidung**: "Vegan" und "Vegetarisch" behalten ihre etablierten Namen, obwohl sie nicht auf `-frei` enden.

**Begründung**: "Tierproduktfrei" und "Fleischfrei" sind ungebräuchlich und würden Benutzer verwirren. Die etablierten Begriffe haben hohen Wiedererkennungswert.

### Decision 4: Fixture-basierter Import statt Management Command

**Entscheidung**: Die neuen Daten werden als Fixture-JSON (`supply_nutritionaltag.json`) gespeichert und über den bestehenden `import_prod_data --only food`-Workflow importiert.

**Alternativen**:
- *Eigenes Management Command*: Würde Logik duplizieren. Der `import_prod_data`-Workflow existiert bereits und lädt Fixtures in FK-sicherer Reihenfolge.
- *Django data migration*: Nicht geeignet, da Fixtures der etablierte Weg für Stammdaten im Projekt sind.

### Decision 5: Schalentierallergie fasst Krebstiere und Weichtiere zusammen

**Entscheidung**: Statt zwei separater Einträge für Krebstiere und Weichtiere (beide EU-Allergene) wird ein Eintrag "Schalentierallergie" erstellt.

**Begründung**: Für die Pfadfinder-Küche ist die Unterscheidung praktisch irrelevant. Weniger Einträge reduzieren die kognitive Last in der UI. Der Begriff "Schalentiere" umfasst im deutschen Sprachgebrauch Krebstiere und Weichtiere.

### Decision 6: Gluten-Einträge als medizinisch + Präferenz getrennt

**Entscheidung**: Zwei Gluten-Einträge mit gleichem `name_opposite="Gluten"`:
- "Glutenunverträglichkeit (Zöliakie)" — medizinisch, `is_dangerous=true`, Rang 3
- "Glutenfrei (freiwillig)" — Präferenz, `is_dangerous=false`, Rang 8

**Begründung**: Zöliakie ist eine Autoimmunerkrankung mit strenger Diätpflicht. Freiwilliger Glutenverzicht ist eine Lifestyle-Entscheidung. Die Unterscheidung ist für Köche relevant: Bei Zöliakie muss Kreuzkontamination vermieden werden, bei freiwilligem Verzicht nicht.

## Risks / Trade-offs

- **[Risiko] M2M-Verlust bei falscher PK-Zuordnung**: Wenn das Update-Skript einen bestehenden Eintrag nicht findet, wird er gelöscht und neu angelegt → M2M-Links gehen verloren.
  - **Mitigation**: Update-Skript arbeitet mit einer Mapping-Tabelle (alter `name` → neue Werte). Nur Einträge, die im Mapping fehlen, werden gelöscht.

- **[Risiko] Doppelte Einträge durch `import_legacy_food`**: Das Command nutzt `get_or_create(name=...)`. Wenn der name-Wert geändert wurde, findet es den alten nicht → erstellt Duplikat.
  - **Mitigation**: Nach der Datenbereinigung muss `import_legacy_food` mit den neuen name-Werten umgehen können. Da `import_legacy_food` aber Legacy-Daten aus der alten food-App importiert, ist die Wahrscheinlichkeit gering, dass es nach dieser Bereinigung noch aufgerufen wird.

- **[Trade-off] `description` wird manuell geschrieben, nicht generiert**: Die Entscheidung im Explore-Modus war "automatisch generieren", aber bei genauerer Betrachtung sind die Beschreibungen zu unterschiedlich für ein einfaches Template. Jeder Eintrag bekommt eine individuell formulierte, aber inhaltlich konsistente Beschreibung.

## Migration Plan

1. **Lokal**: Fixture-Datei `supply_nutritionaltag.json` aktualisieren, `import_prod_data --flush` ausführen
2. **Prod vorbereiten**: Update-Skript schreiben, das bestehende Einträge mappt und aktualisiert
3. **Prod ausführen**: Skript auf Prod ausführen (per ssh), Halal/Koscher per Django Admin löschen
4. **Verifikation**: `GET /api/nutritional-tags/` prüfen, dass 30 Einträge mit korrekten Namen zurückkommen
5. **Kein Rollback nötig**: Da PKs erhalten bleiben, funktionieren alle M2M-Verknüpfungen weiter. Die neuen Namen sind rein kosmetisch.

## Target Seed List

```
Rang  name                                  name_opposite
──────────────────────────────────────────────────────────────────────────────
 1    Vegan                                 Tierische Produkte
 2    Vegetarisch                           Fleisch
 3    Glutenunverträglichkeit (Zöliakie)    Gluten
 4    Laktoseunverträglichkeit              Laktose
 5    Nussallergie                          Nüsse und Schalenfrüchte
 6    Eiallergie                            Ei und Eierzeugnisse
 8    Glutenfrei (freiwillig)               Gluten
 9    Fischallergie                         Fisch und Fischerzeugnisse
10    Sojaallergie                          Soja und Sojaerzeugnisse
11    Erdnussallergie                       Erdnüsse und Erdnusserzeugnisse
12    Hülsenfruchtunverträglichkeit         Hülsenfrüchte
13    Fructoseunverträglichkeit             Fructose
14    Histaminunverträglichkeit             Histamin
15    Alkoholfrei                           Alkohol
16    Milchallergie                         Milch und Milcherzeugnisse
18    Schärfefrei                           Scharf
19    Knoblauchfrei                         Knoblauch
20    Sellerieallergie                      Sellerie und Sellerieerzeugnisse
21    Sesamallergie                         Sesam und Sesamerzeugnisse
22    Senfallergie                          Senf und Senferzeugnisse
23    Koffeinfrei                           Koffein
24    Weizenfrei                            Weizen und Weizenerzeugnisse
25    Roggenfrei                            Roggen und Roggenerzeugnisse
26    Gerstenfrei                           Gerste und Gerstenerzeugnisse
27    Haferfrei                             Hafer und Hafererzeugnisse
28    Dinkelfrei                            Dinkel und Dinkelerzeugnisse
29    Kamutfrei                             Kamut und Kamuterzeugnisse
38    Sulfitallergie                        Schwefeldioxid und Sulfite
39    Lupinenallergie                       Lupinen und Lupinenerzeugnisse
17    Schalentierallergie                   Krebstiere und Weichtiere
```

`is_dangerous=true` für: Glutenunverträglichkeit (Zöliakie), Laktoseunverträglichkeit, Nussallergie, Eiallergie, Fischallergie, Sojaallergie, Erdnussallergie, Milchallergie, Sellerieallergie, Sesamallergie, Senfallergie, Sulfitallergie, Lupinenallergie, Schalentierallergie.

## Open Questions

- **Schalentierallergie Rang**: Im Explore-Modus wurde Rang 17 (zwischen Milchallergie 16 und Schärfefrei 18) noch nicht final bestätigt. Wird vor Implementierung geklärt.
- **Description-Texte**: Die genauen Formulierungen der `description`-Felder müssen noch definiert werden. Vorschlag: Jeder Eintrag bekommt eine kurze Erklärung des menschlichen Merkmals (z.B. "Keine tierischen Produkte wie Fleisch, Milch, Eier, Honig" für Vegan).
