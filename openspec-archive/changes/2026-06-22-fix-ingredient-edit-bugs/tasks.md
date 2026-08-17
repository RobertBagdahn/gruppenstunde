## 1. Frontend: energyKj → energyKcal umbenennen

- [x] 1.1 `IngredientEditPage.tsx:96`: `const [energyKj, setEnergyKj]` → `const [energyKcal, setEnergyKcal]`
- [x] 1.2 Alle weiteren Vorkommen von `energyKj`/`setEnergyKj` in der Datei ersetzen (Zeilen 156, 224, 398 und ggf. weitere)

## 2. Frontend: cooking_factor min-Wert korrigieren

- [x] 2.1 `IngredientEditPage.tsx:474`: `min="1"` → `min="0.01"` (ermöglicht Schrumpffaktoren)
- [x] 2.2 Beschriftung/Tooltip klarstellen: `"Kochfaktor (< 1 = schrumpft, > 1 = quillt auf)"`

## 3. Frontend: Rang-Tausch korrigieren

- [x] 3.1 `IngredientDetailPage.tsx:1041-1057`: Rang-Tausch auf tatsächliche `rank`-Feldwerte der Portionen umschreiben (Design D1)
- [x] 3.2 Sicherstellen, dass `portions` im State `rank`-Feldwerte enthält (Schema und API prüfen)

## 4. Frontend: powder-Viskositätsoption ergänzen

- [x] 4.1 `IngredientEditPage.tsx:443-451`: Option `<option value="powder">Pulver/Schüttgut</option>` hinzufügen

## 5. Frontend: Umlaute korrigieren

- [x] 5.1 Zeile 406: `"ges. Fettsaeuren (g)"` → `"ges. Fettsäuren (g)"`
- [x] 5.2 Zeile 442: `"Viskositaet"` → `"Viskosität"`
- [x] 5.3 Zeile 449: `"Fluessig"` → `"Flüssig"`
- [x] 5.4 Zeile 479: `"Ja, fuers Zeltlager geeignet"` → `"Ja, fürs Zeltlager geeignet"`
- [x] 5.5 Zeilen 487 + 503: `"Ganzjaehrig"` → `"Ganzjährig"`
- [x] 5.6 Zeile 560: `"Allergene & Unvertraeglichkeiten"` → `"Allergene & Unverträglichkeiten"`

## 6. Backend: Status-Guard für non-Staff

- [x] 6.1 `supply/api/ingredients.py`: Im `update_ingredient`-Endpunkt prüfen: wenn `status == "verified"` und `not request.user.is_staff` → `HttpError(403, "Nur Admins können den Status auf 'verified' setzen")`

## 7. Tests

- [x] 7.1 Backend-Test: Non-Staff-Nutzer kann eigene Zutat nicht auf `status="verified"` setzen
- [x] 7.2 Frontend-Test (manuell): Ingredient mit `cooking_factor=0.7` speichern → kein Formular-Error
- [x] 7.3 Frontend-Test (manuell): Portionen umsortieren → Reihenfolge korrekt nach Reload
