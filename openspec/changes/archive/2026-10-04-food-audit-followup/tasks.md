# Tasks: food-audit-followup

## 1. Backend: Zutatensuche und Pläne
- [x] 1.1 Essensplan-Suche findet bei einer Suchanfrage alle sichtbaren, verifizierten Zutaten statt nur `is_standalone_food`; die ungefilterte Vorschlagsansicht bleibt kompakt.
- [x] 1.2 Entwürfe und gelöschte Zutaten werden ausgeschlossen; Zutatenrelevanz und Rezept-SearchRank bleiben mit stabilem Tie-Breaker erhalten.
- [x] 1.3 Gewählte Einzelzutaten-Portion bleibt gespeichert und wird mit der Personenzahl genau einmal berechnet (bereits durch `food-audit-bugfixes` P1 abgedeckt und regressionstestiert).
- [x] 1.4 `origin=mine` beschränkt auch Staff-Nutzer auf Pläne, die sie selbst erstellt haben; Staff-Globalübersicht bleibt separat erhalten.
- [x] 1.5 Eindeutiger manueller Text wie „2 kg Zimt“ wird zur verifizierten Zutat normalisiert, mit bestehendem quellenlosem Listeneintrag zusammengeführt und in Gramm gespeichert; mehrdeutiger Text bleibt unverändert.
- [x] 1.6 Legacy-Zubereitungsschritte aus einem Markdown-Abschnitt „Zubereitung“ werden in Detail- und Kochansicht sichtbar; keine Migration erforderlich.

## 2. Frontend: Suche, Formulare und Anzeige
- [x] 2.1 Pydantic- und Zod-Vertrag der Standardmaß-Antwort um das explizite Volumen synchron erweitert.
- [x] 2.2 Suchdialog per Touch-Auswahl und explizitem Hinzufügen-Button bedienbar; Dialoghöhe und scrollbarer Listenbereich halten den Button ab 320 px erreichbar.
- [x] 2.3 Rezept-Wizard erfasst Titel und Typ nur in „Basis & Portionen“; Validierungsfehler erscheinen barrierefrei direkt am Feld.
- [x] 2.4 Einkaufslisten zeigen eindeutige Mengen/Einheiten; sicher erkannte Freitext-Zutaten werden verknüpft und quellenlose manuelle Duplikate zusammengeführt.
- [x] 2.5 Detail- und Kochansicht nutzen dieselbe Extraktion strukturierter Legacy-Zubereitungsschritte aus Markdown.

## 3. Standardmaße und Qualitätssicherung
- [x] 3.1 Volumenmaße werden einmal über Dichte in Gramm umgerechnet; Masseinheiten ignorieren Dichte. API liefert zusätzlich `volume_ml`, damit 200-ml-Standardtasse und Zutaten-Portion unterscheidbar sind.
- [x] 3.2 Gleichnamige Standard- und Zutatenmaße zeigen Volumen beziehungsweise Gewicht eindeutig statt unerklärter Abweichung.
- [x] 3.3 Backend-Regressionstests decken Suchstatus, Trefferrelevanz, Staff-Ownerfilter, Textmatch und Flüssigkeits-Portionsanzeige ab.
- [x] 3.4 Food-Frontend-Tests decken Touch-Auswahl, 320-px-Dialogstruktur, Feldvalidierung, Maßbeschriftung und Legacy-Schritte ab.
- [x] 3.5 Backend/Food-Frontend-Prüfungen vollständig ausgeführt, OpenSpec-Change validiert und `makemigrations --check` ohne Änderungen bestätigt.
