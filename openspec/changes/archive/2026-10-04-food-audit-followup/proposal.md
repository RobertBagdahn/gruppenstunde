# Food-Audit-Follow-up: verlässliche Zutatensuche und Eingaben

## Why

Nach den Korrekturen aus `food-audit-bugfixes` hat ein weiterer Durchgang noch Fehler in der Zutatensuche des Essensplans, bei Einheiten sowie in mehreren Formular- und Anzeigeabläufen offengelegt. Diese Fehler sind nicht durch den bestehenden P1/P2-Umfang abgedeckt und sollen separat geplant werden, damit sie nicht mit den bereits behobenen Mengen- und Pagination-Problemen verwechselt werden.

- Die Zutatensuche im Essensplan findet nur 32 statt rund 5.747 Zutaten. Entwürfe können auftauchen, gelöschte Zutaten werden nicht zuverlässig ausgefiltert, und eine spätere Sortierung überschreibt die Relevanzreihenfolge.
- Standardmaße und Zutaten-Portionen sind uneinheitlich. Beispielsweise können aus „2 Tassen Mehl“ bei der Umrechnung „2,4 Tassen“ werden; mehrere gleichnamige Tassen-/Esslöffel-Optionen mit abweichenden Gewichten machen die Auswahl unklar.
- Bei mobiler Bedienung des Suchdialogs ist die Vorschau teilweise nur per Hover erreichbar; der Übernehmen-/Hinzufügen-Knopf kann außerhalb des sichtbaren Dialogbereichs liegen.
- Der Rezept-Assistent fragt Titel und Typ erneut ab und zeigt Validierungsfehler nur als Toast statt am betroffenen Feld.
- „Meine Pläne“ kann für Staff-Nutzer Pläne anderer Besitzer enthalten.
- Einkaufslisten können Mengen und Portionen missverständlich zusammensetzen; Freitext wie „2 kg Zimt“ wird nicht zuverlässig der bestehenden Zutat zugeordnet, und Einzelzutaten erhalten teilweise eine unpassende Einheit.
- Bei einzelnen Rezepten stimmen gespeicherte Zubereitungsschritte und deren Anzeige nicht überein: Schritte liegen in der Beschreibung, während die Detailseite „Noch keine Schritte“ meldet.

## What Changes

- Die Essensplan-Zutatensuche liefert passende, auswählbare und aktive Zutaten aus dem vorgesehenen Katalog. Entwürfe und gelöschte Zutaten werden ausgeschlossen; Relevanz und stabile Tie-Breaker bleiben über API, Hook und UI erhalten.
- Die Suche und Auswahl behalten die vom Nutzer gewählte Portion und deren Mengenbedeutung. Mengen für die Personenzahl des Plans werden genau einmal berechnet.
- Es wird eine eindeutige fachliche Umrechnungsregel für Standardmaße gegenüber Zutaten-Portionen festgelegt. Gleiche Maße dürfen nicht ohne erklärten Grund konkurrierende Werte und unerwartete Umrechnungen erzeugen.
- Suchdialog und Vorschau funktionieren auf Touch-Geräten ohne Hover und bleiben ab 320 px vollständig bedienbar.
- Der Rezept-Assistent fragt bereits erfasste Basisdaten nicht nochmals ab und zeigt Validierungsfehler direkt an den betroffenen Feldern.
- „Meine Pläne“ beschränkt die Ergebnisse auf den angemeldeten Nutzer als Besitzer; Staff- und Kollaborator-Rechte bleiben davon getrennt und werden explizit getestet.
- Einkaufslisten ordnen erkannte Zutaten konsistent zu und zeigen Menge, Einheit und Portion ohne doppelte oder widersprüchliche Einheiten an.
- Rezept-Zubereitungsschritte werden aus der maßgeblichen Datenquelle konsistent in Detail- und Bearbeitungsansicht dargestellt.

## Capabilities

### Modified Capabilities
- `meal-planner-omnibar-search`: vollständige, statusgefilterte Zutatensuche, erhaltene Relevanzsortierung und Touch-bedienbare Vorschau.
- `standard-measure-catalog`: eindeutige, massenkonsistente Umrechnung zwischen Standardmaßen und Zutaten-Portionen.
- `meal-plan-frontend`: Eigentümerfilter für „Meine Pläne“ sowie korrekt skalierte Einzelzutaten.
- `unified-recipe-creation`: keine doppelte Erfassung von Basisfeldern und feldbezogene Validierungsfehler.
- `shopping-list`: konsistente Zuordnung von Freitext-Zutaten sowie klare Mengen-/Einheitenanzeige.
- `recipe`: Zubereitungsschritte stimmen zwischen Detail- und Bearbeitungsansicht überein.

## Impact

- **Backend-Apps:** `supply` (Zutatensuche und Statusfilter), `planner` (Suchresultate, MealPlan-Listenfilter und Einzelzutaten), `shopping` (Zutatenzuordnung und Mengenformatierung), `recipe` (Schritt-Daten und Ausgabe).
- **React:** `frontend-food/src/pages/planning/RecipeSearchDialog.tsx`, Omnibar-/Suchkomponenten, `frontend-food/src/pages/planning/SettingsPanel.tsx`, Rezept-Wizard, Einkaufslistenansichten und Rezept-Detailseite.
- **Schemas:** Die konkreten Pydantic- und Zod-Schemas sind beim Implementieren anhand der betroffenen Endpunkte zu synchronisieren. Insbesondere sind Ingredient-Suchresultate, Planlisten-Filter sowie Shopping-List-Item-Antworten zu prüfen.
- **Migrationen:** Keine Migration ist vorab festgelegt. Eine Migration ist nur erforderlich, falls die Untersuchung zeigt, dass Rezeptschritte oder Messwert-Definitionen nicht ohne Datenmigration konsistent darstellbar sind.
- **Abgrenzung:** Die allgemeine Datenbereinigung (falsche Warengruppen, Nährwerte, fehlende Tags, Dubletten/Testdaten) und lokale Datenbankdrift durch fehlende Migrationen sind nicht Teil dieses Changes. P3-Formatierungs- und 320-px-Aufgaben, die bereits in `food-audit-bugfixes` stehen, werden nicht doppelt erfasst.
