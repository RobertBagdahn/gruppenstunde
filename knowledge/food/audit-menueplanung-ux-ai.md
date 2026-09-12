# Analyse der Menüplanung: Bestandsaufnahme, UX-Vereinfachung, KI-Funktionen und Befunde

Datum: 10. September 2026
Status: Bestandsaufnahme & Architektur-Exploration (Explore Mode)
Ziel: Grundlage für gezielte OpenSpec-Proposals

---

## 1. Einleitung & Zusammenfassung

Die Menüplanung in Inspi verfügt über ein breites Spektrum an mächtigen Fachfunktionen:
- Nährwertaggregation und Soll-Ist-Bänder nach DGE/Normportionen.
- Frühstücks-Assistent mit prozentualer Aufteilung und Kcal-Dichteberechnung.
- Rezeptvarianten für Unverträglichkeiten und vegetarische/vegane Alternativen.
- Dynamische Einkaufslisten-Generierung mit Supermarkt-Warengruppen und REWE-Export.
- Intelligente KI-Rezeptvorschläge (Gemini) und automatisierte Gesamtplan-Generierung.

**Das Kernproblem:**
Aktuell wirkt die Menüplanung sehr komplex, weil technische Abstraktionen (Faktoren, Referenzmahlzeiten, Day-Part-Factors, unvollständige Speichermodi) direkt in die Benutzeroberfläche durchschlagen. Der Nutzer muss oft wissen, *welches Datenmodell* er gerade bedient, anstatt einfach Essen für eine Gruppe zu planen. Zudem existieren mehrere parallele Abläufe mit subtil unterschiedlicher Semantik (z. B. Tagesplan vs. Tabelle, Direktfrühstück vs. Referenzfrühstück).

---

## 2. Der aktuelle Ablauf im Detail

### 2.1 Wie man Mahlzeiten hinzufügt
- **Mittag-/Abendessen:**
  - Im Tagesplan: Klick auf „Rezept hinzufügen“ öffnet den `RecipeSearchDialog`. Dort kann man suchen, Kategorien filtern oder auf „Vorschläge“ umschalten.
  - Nach Klick auf ein Rezept öffnet sich eine Inline-Vorschau. Nach Bestätigung wird das Rezept hinzugefügt.
  - Falls das Rezept optionale Zutaten oder Tauschgruppen besitzt, öffnet sich automatisch der `VariantSliderDialog`, in dem Portionen aufgeteilt werden müssen.
  - Problem: Kontextvorschläge (AI) fügen das Rezept beim Klick sofort hinzu, ohne Vorschau oder Varianten-Vorkonfiguration.
- **Frühstück:**
  - Kann manuell mit einzelnen Rezepten/Zutaten gefüllt werden ODER über den 6-stufigen `BreakfastWizardPage` (Basis, Streichfett, Belag, Extras, Getränke, Cockpit/Abschluss).
  - Der Assistent existiert in zwei Modi: `directMeal` (ersetzt den Inhalt einer einzelnen Mahlzeit) und `refMeal` (erstellt/editiert eine globale Vorlage).
- **Snacks:**
  - Werden wie normale Mahlzeiten befüllt. Mehrere Snacks pro Tag sind möglich.
- **Getränke:**
  - Werden entweder als Zutat/Rezept in Frühstück/Snack gepackt oder als eigenständige Mahlzeit vom Typ `drinks`. Letztere fehlt jedoch in zentralen Enums und wird in Tabelle/Kochplan ausgeblendet.

### 2.2 Wie man Mahlzeiten sucht
- Der `RecipeSearchDialog` bietet Textsuche (debounced 300ms, ab 2 Zeichen), Kategoriefilter, Ernährungs-Filter (Nutritional Tags) und „Kürzlich verwendet“.
- Umschaltbar auf Zutaten-Modus. Im Zutaten-Modus wird jedoch das Suchfeld ausgeblendet, sodass nur die ersten 20 Standard-Zutaten sichtbar sind.

### 2.3 Welche AI-Funktionen existieren
1. **Vollständige Plan-Generierung (`POST /api/meal-plans/ai/suggest/`):**
   - Im Erstellungs-Wizard: Prompt eingeben → Gemini wählt Frühstückskombinationen und Rezepte aus einem Kandidaten-Pool → Vorschau → Übernahme via `apply-ai`.
2. **Kontextuelle Mahlzeitenvorschläge (`GET .../suggestions/`):**
   - Basiert auf Heuristik (Saison, Beliebtheit, Abwechslung, Historie, Budget) und optionalem Gemini-Reranking für 9 kuratierte Vorschläge in drei Kategorien (Top Picks, Abwechslung, Entdeckungen).
3. **Rezept-KI (angrenzend):**
   - URL/Text-Import, Mengenschätzung, Schrittgenerierung, Umformulierung, Gesundheitsoptimierung.

### 2.4 Wie man bearbeitet, kopiert und löscht
- **Bearbeiten:**
  - Inline-Faktor-Eingabe (z. B. `1,00`) für Rezepte; Mengeneingabe für Portionseinheiten bei Zutaten.
  - Mahlzeiten-Zeit und Notizen über `MealActionsMenu`.
- **Kopieren:**
  - „Aus anderem Plan kopieren“ im Mahlzeiten-Menü (kopiert alle Items einer Mahlzeit).
  - Gesamten Plan duplizieren (über Vorlage oder Listen-Aktion).
- **Löschen:**
  - Einzelne Items über X-Icon (öffnet Bestätigungsdialog).
  - Mahlzeiten oder ganze Tage über das Aktionsmenü mit Bestätigung.

---

## 3. Top-Befunde & Fehler (Auditergebnisse)

### 🔴 Kritisch / Hohe Priorität (Datenverlust, Sicherheit, falsche Berechnungen)
1. **Datenschutzleck bei KI-Frühstückskandidaten:**
   `_get_breakfast_candidates` holt die letzten Frühstücke aller Nutzer quer über die Datenbank ohne Prüfung von Mandant/Ownership oder Sichtbarkeit. Private Essenspläne landen im Prompt anderer Nutzer.
2. **Rechteumgehung bei Referenzen & KI-Apply:**
   `create_ref_meal` und `apply_suggestions` speichern übergebene `recipe_id`s und `ingredient_id`s direkt in die DB, ohne die `food_access`-Sichtbarkeit des Users zu prüfen. Private Rezepte Fremder können eingebunden werden.
3. **Falsches Allergen-PDF („Keine Allergene gefunden“):**
   Im allgemeinen Plan-PDF wird `_build_allergen_matrix` mit leeren Sets initialisiert, aber nie mit den echten Allergenen befüllt. Das PDF gibt fälschlicherweise immer Entwarnung aus.
4. **Fehlende Skalierung & Varianten im Plan-PDF:**
   Rezeptzutaten im PDF ignorieren den Mahlzeitenfaktor (`factor`), die Mengeneinheit der Portion und aktive Varianten-Auswahlen. Gedruckte Mengenangaben stimmen nicht mit Einkauf und Küche überein.
5. **Einheitenverlust bei KI-Frühstückszutaten:**
   `apply_suggestions` legt Zutaten ohne `measuring_unit_id` an. Der zentrale Gewichtsresolver liefert dafür 0 g. Kcal und Kosten werden mit 0 berechnet.
6. **Mengenverfälschung bei Zutatenauswahl:**
   Im Dialog wird bei Portionsauswahl (z. B. 2 Scheiben à 50g) `totalWeightG` (100) berechnet, aber zusammen mit der Scheiben-Unit-ID abgeschickt. Im System landen 100 Scheiben.
7. **Frühstücks-Wiederöffnungs-Bug (Zehntelung der Mengen):**
   `refMealItemsToWizardState` teilt gespeicherte Zutatenmengen durch `normPortions`, obwohl die Mengen in der DB bereits pro Person gespeichert sind. Bei 10 Personen schrumpft das Frühstück auf 10 %.
8. **Verlust von Varianten & Overrides beim Kopieren:**
   `duplicate_meal_plan` und Mahlzeiten-Kopieren übertragen `active_recipe_item_ids` und `variant_group_id` nicht. Aus einer laktosefreien Variante wird beim Duplizieren wieder die Standard-Kuhmilch-Variante.
9. **Externes Essen bleibt im Einkauf:**
   Wird eine Mahlzeit nachträglich als „extern / Restaurant“ markiert, bleiben vorherige Zutaten in der DB und fließen weiterhin in Einkaufsliste und Nährwertübersicht ein.
10. **Varianten-Schieberegler Berechnungsfehler:**
    Bei 3 oder mehr Tauschzutaten multipliziert der Algorithmus absolute Portionen fälschlicherweise ein zweites Mal mit der Gesamtmenge. Aus 10 Portionen werden rechnerisch 65, was das Speichern blockiert.

### 🟠 Mittlere Priorität (UX-Brüche & logische Inkonsistenzen)
11. **Getränke fehlen im zentralen Mahlzeiten-Register:**
    Der Typ `drinks` fehlt in `MEAL_TYPE_ORDER`, Labels und Farbschemata. In der Tabelle und im Kochplan werden Getränke komplett ausgeblendet.
12. **Keine Zutatensuche im Zutaten-Modus:**
    Das Suchfeld wird im Zutatenmodus ausgeblendet; Nutzer können nur aus 20 festen Elementen wählen.
13. **Verfrühte Lösch-Erfolgsmeldung mit falschem Undo:**
    In der Tabelle wird „Item gelöscht [Rückgängig]“ angezeigt, bevor der Bestätigungsdialog überhaupt bestätigt wurde.
14. **Gefährlicher Kontextwechsel beim Frühstücksassistenten:**
    Klickt man im Menü eines Dienstags-Frühstücks auf „Frühstücksassistent“, öffnet sich die *globale Plan-Referenz* und überschreibt potenziell alle verknüpften Tage.
15. **KI „Anderen Prompt probieren“ ist wirkungslos:**
    Der Button setzt denselben Prompt erneut und löscht die alten Vorschläge nicht.
16. **Nährwert-Tagesansicht zeigt identischen Durchschnitt:**
    In der Nährwertansicht wird unter jedem einzelnen Wochentag derselbe gemittelte Planwert gerendert.

---

## 4. Zehn Vorschläge zur UX-Vereinfachung

1. **Drei Hauptbereiche statt sieben Tabs:**
   Navigation reduzieren auf **Planen**, **Einkaufen** und **Kochen**. Tabelle und Tagesplan werden Umschalter innerhalb von „Planen“.
2. **Einheitliches Hinzufügen-Fenster:**
   Ein zentrales Such- und Auswahlfenster für Rezepte, Zutaten und Bundles mit durchgehender Suche und klarer Vorschau.
3. **Kompakte Mahlzeitenkarten:**
   Karten zeigen nur Name, Zeit, Personenanzahl und Kosten. Detaillierte Nährwerte und Grammangaben werden nur bei Bedarf eingeblendet.
4. **Frühstück als kompakte Bausteine:**
   Standardmäßig einfache Auswahl (Brot, Belag, Obst, Getränke) mit Standardmengen; die 6-stufige Prozentverteilung wird zur optionalen Expertenansicht.
5. **Klartext-Mengen statt Faktoren:**
   Anzeige und Eingabe in „Portionen für X Personen“ bzw. haushaltsüblichen Mengeneinheiten statt technischer Multiplikatoren wie `× 0,35`.
6. **Eindeutiger Wirkungsbereich bei Änderungen:**
   Explizite Wahl vor dem Speichern: „Nur dieses Essen ändern“ oder „Für alle Tage mit dieser Vorlage übernehmen“.
7. **Direktes Verschieben und Wiederholen:**
   Drag-and-Drop oder einfaches Menü „Verschieben nach Tag X“ / „Kopieren auf weitere Tage“ direkt an der Mahlzeitenkarte.
8. **Echtes, sicheres Rückgängig-Machen:**
   Einzelne Zutaten und Rezepte sofort mit Toast und vollwertigem „Rückgängig“ entfernen, ohne blockierende Dialoge.
9. **Schlanker Schnelleinstieg für neue Pläne:**
   Planerstellung auf Name, Datum und Personenzahl reduzieren; alle Detailkonfigurationen (Budgets, Standardzeiten) erst bei Bedarf im Plan anbieten.
10. **Aufgabenorientierte Hinweise (Actionable Alerts):**
    Warnungen als konkrete Handlungsvorschläge mit einem Klick lösen („Samstagmittag ist noch leer → Gericht wählen“).

---

## 5. Zehn Vorschläge für KI-gestützte Vereinfachungen (Magic Wand Prinzip)

**Das durchgängige Interaktionsprinzip:**
> **Knopf / Zauberstab (🪄) drücken → 2–3 strukturierte Vorschläge mit Begründung sehen → Akzeptieren, Ablehnen oder „Weitere Vorschläge“ anfordern.**
> Keine stille automatische Manipulation von Daten ohne Nutzerbestätigung!

1. **🪄 „Was passt hier?“ (Einzelne Mahlzeit):**
   Schlägt 3 passende Gerichte für einen Slot vor – abgestimmt auf Gruppe, Saison, bisherige Tage und Budget.
2. **🪄 „Diesen Tag vervollständigen“:**
   Füllt alle noch offenen Slots eines Tages mit einer harmonischen Kombination (z. B. leichtes Mittagessen + deftigeres Abendessen).
3. **🪄 „Gesamtplan-Vorschlag mit Teilannahme“:**
   Generiert einen Wochenplan, bei dem der Nutzer einzelne Tage/Mahlzeiten annehmen oder sperren kann und nur der Rest neu gewürfelt wird.
4. **🪄 „Frühstücks-Kombination vorschlagen“:**
   Erstellt auf Knopfdruck ein abgestimmtes Frühstücksbuffet (z. B. „Klassisch Rustikal“, „Süß & Fruchtig“, „Warmes Lagerfrühstück“) mit korrekten Grammmengen.
5. **🪄 „Snack- & Getränke-Paket“:**
   Schlägt passende Zwischenmahlzeiten und Getränkemengen für das Tagesprogramm vor (z. B. Wanderung, Stationenspiel).
6. **🪄 „Budget optimieren“:**
   Identifiziert teure Mahlzeiten und bietet konkrete, günstigere Tausch-Gerichte mit Angabe der Ersparnis in Euro.
7. **🪄 „Ernährungs-Alternative finden“:**
   Erzeugt bei Allergien oder vegetarischem Bedarf mit einem Klick die passende Parallel-Variante für die betroffene Personengruppe.
8. **🪄 „Reste verwerten & Vorräte nutzen“:**
   Schlägt Rezepte vor, die angebrochene Packungen oder Reste vom Vortag (z. B. gekochter Reis) geschickt aufbrauchen.
9. **🪄 „Küchen-Entlaster (Einfacher kochen)“:**
   Schlägt Rezepte mit weniger Kochstellen, kürzerer Zubereitungszeit oder ohne Backofen vor, wenn der Tag zu stressig wird.
10. **🪄 „Planungs-Check & Quick-Fixes“:**
    Ein zentraler Knopf analysiert den Plan und liefert die 3 wichtigsten Verbesserungen direkt mit Ein-Klick-Lösungsvorschlägen.

---

## 6. Nächste Schritte

Diese Analyse dient als Diskussionsgrundlage. Im nächsten Schritt gehen wir die Punkte gemeinsam durch, priorisieren die Vorhaben und erstellen für jedes gewünschte Thema eine präzise OpenSpec-Spezifikation.
