# Buffet-Datenqualitätsvorschläge

## ADDED Requirements

### Requirement: Staff können Buffet-Katalogvorschläge erstellen und pflegen
Das Datenqualitätssystem SHALL Staff eine Vorschlagsmaske für Buffet-Katalogdaten bereitstellen. Staff SHALL Vorschläge für bestehende Zutaten/Rezepte (Rollen hinzufügen oder entfernen) und Dubletten (Quelle → Ziel) erstellen, bearbeiten und verwerfen können. Zusätzlich SHALL die Maske neue Zutaten und Rezepte sowohl manuell als auch mit KI-Unterstützung als Vorschläge erfassen können. KI-Ergebnisse SHALL editierbare Vorschläge bleiben und DÜRFEN vor einer expliziten Staff-Freigabe keine Ingredient-, Recipe-, Tag- oder Status-Daten verändern. Die Maske SHALL KI-/manuelle Herkunft und den prüfenden Staff-Nutzer nachvollziehbar machen. Vorschläge SHALL persistent und auditierbar sein; Listen SHALL `page=1`, `page_size=20` und das bestehende paginierte Response-Format unterstützen.

#### Scenario: Bestehendes Item einer Rolle vorschlagen
- **GIVEN** eine sichtbare Zutat oder ein Rezept existiert ohne eine gewünschte Buffet-Rolle
- **WHEN** Staff in der Datenqualitätsmaske eine Rolle zuordnet und den Vorschlag speichert
- **THEN** wird ein ausstehender Zuordnungsvorschlag angelegt und das Item erhält noch keinen neuen Tag

#### Scenario: Neue Zutat manuell oder mit KI vorschlagen
- **WHEN** Staff eine neue Zutat als Vorschlag erfasst und Felder manuell ausfüllt oder eine KI-Vorbelegung anfordert
- **THEN** können die Felder vor dem Speichern bearbeitet werden
- **THEN** wird bis zur Freigabe keine aktive Ingredient-Zeile erzeugt und kein Status auf `verified` gesetzt

#### Scenario: Neues Rezept manuell oder mit KI vorschlagen
- **WHEN** Staff ein neues Rezept als Vorschlag anlegt und Felder manuell ausfüllt oder durch KI vorbefüllen lässt
- **THEN** bleibt der Vorschlag bearbeitbar und enthält mindestens Titel, `recipe_type`, Portionsangabe und Rezeptbestandteile
- **THEN** wird bis zur Freigabe kein veröffentlichtes Rezept erzeugt

#### Scenario: Fehlende Pflichtdaten blockieren Freigabe
- **GIVEN** ein neuer Zutatenvorschlag hat keine Energieangabe, Retail-Section oder sinnvolle Portionsdaten
- **WHEN** Staff den Vorschlag testen oder freigeben will
- **THEN** zeigt das System konkrete blockierende Validierungsfehler und erlaubt keine Freigabe als verifizierter Systemeintrag

#### Scenario: Fehlende Katalogprodukte als prüfbare Vorschläge
- **GIVEN** die Bestandsprüfung findet keine passende vorhandene Zutat oder kein passendes Rezept
- **WHEN** Staff die Vorschlagsmaske für die Ergänzung des Katalogs öffnet
- **THEN** bietet die Maske mindestens ungeprüfte Vorschlagskandidaten aus diesen Gruppen an: Getränke (Apfelschorle, stilles/sprudelndes Mineralwasser, Eistee, Zitronenlimonade, Cola, Fanta-/Limo-Äquivalent, Orangenschorle, Kirschsaft-Schorle, Milch-Mixgetränke), Snacks (Salzstangen, Cracker, Käsegebäck, Chips Paprika/Salz, Tortilla-Chips Naturell), Dips (Guacamole, Tzatziki, Sour Cream, Kräuterquark, Käsesoße), Ergänzungen (geriebener Parmesan, Backkartoffeln) sowie Getränkerezepte (Apfelschorle 1:1, Zitronenwasser, Früchtetee-Kanne, Kakao-Kanne) und Platten-Rezepte (Snackplatte, Käseplatte, Rohkostplatte mit Dip, Antipasti-Platte, Nachos überbacken)
- **THEN** werden vorhandene passende Namen/Aliase angezeigt und es wird kein Vorschlag für ein bereits vorhandenes Item als `create` freigegeben

#### Scenario: Nicht-Staff darf Vorschläge nicht pflegen
- **WHEN** ein anonymer oder authentifizierter Nicht-Staff-Nutzer Vorschläge auflistet, erstellt, ändert, testet oder freigibt
- **THEN** antwortet die API mit 403 und verändert keine Vorschlags- oder Katalogdaten

### Requirement: Alle plausiblen Mapping- und Dublettenkandidaten sind prüfbar
Die Vorschlagsmaske SHALL Kandidaten aus den Buffet-Strategiedaten sowie aus aktuellen, datenbankbasierten Berichten über Retail-Section, `is_standalone_food`, `recipe_type` und normalisierte Namensähnlichkeit auffindbar machen. Die initialen, aus der Bestandsaufnahme bekannten Dublettenkandidaten SHALL als ungeprüfte Vorschläge enthalten sein:

| Gruppe | Kandidaten / vorgesehene Prüfung |
|---|---|
| Cocktailtomaten | Zielvorschlag 6934; Quellen 6626, 36 und 7058; 6925 „Tomaten“ bleibt als Schnitttomate getrennt |
| Gurken | 299 Salatgurke, 6664 Gemüsegurke und weitere erkannte Dubletten; 6977 Minigurken bleiben separat |
| Möhren | 41 Karotte, 42 Möhre und Speisemöhren als Prüfgruppe |
| Bananen / Äpfel | 298/6927/frische Banane sowie 57/295 Äpfel als Prüfgruppen |
| Käse / Milchprodukte | „Käse (Gouda)“ als Quelle für 105 Gouda; Joghurt-/Quarkvarianten als Prüfgruppe |
| Säfte | 6703/7346 Apfelsaft und 200/7345 Orangensaft als Prüfgruppen |

Alle Vorschläge MUST vor einer Merge-Freigabe durch Staff bestätigt werden. Wasser 199 Mineralwasser und 198 Trinkwasser aus der Leitung SHALL getrennt bleiben; 0 kcal ist für beide plausibel und DARF NICHT als fehlender Wert gemeldet werden. Die Maske MUST Kandidaten paginieren statt Treffer stillschweigend abzuschneiden. Für `merge_into` SHALL Staff explizit Quelle und Ziel festlegen; Ähnlichkeit allein DARF weder einen Merge genehmigen noch Daten ändern. Ein Kandidat MUSS ID und erwarteten Namen speichern, damit die Prüfung eine spätere Änderung oder Prod-Drift erkennen kann.

#### Scenario: Plausible Dubletten zur Prüfung anbieten
- **GIVEN** der Kandidatenbericht findet ähnlich benannte Zutaten, darunter bekannte Cocktailtomaten- und Saftvarianten
- **WHEN** Staff den Buffet-Datenqualitätsbereich öffnet
- **THEN** sind die Kandidaten seitenweise auffindbar und noch nicht zusammengeführt

#### Scenario: Kandidatendaten haben sich geändert
- **GIVEN** ein Vorschlag referenziert eine ID mit erwartetem Namen „Cocktailtomaten“
- **WHEN** das aktuelle Item unter dieser ID einen abweichenden Namen hat
- **THEN** meldet die Prüfung die Abweichung als Blocker und führt die Aktion nicht aus

#### Scenario: Quelle und Ziel explizit wählen
- **WHEN** Staff eine Merge-Aktion erstellt
- **THEN** muss die Maske Quell- und Ziel-Item, erwartete Namen und die Richtung sichtbar darstellen

#### Scenario: Produktspezifische Unterschiede bewahren
- **GIVEN** der Kandidatenbericht enthält Salatgurke und Minigurken oder Mineralwasser und Leitungswasser
- **WHEN** Staff eine Merge-Gruppe prüft
- **THEN** werden die fachlichen Unterschiede angezeigt und kein Merge wird vorausgewählt
- **THEN** bleiben korrekte `0`-Nährwerte bei Wasser ohne Warnung als fehlender Wert erhalten

### Requirement: Mapping-Test ist schreibfrei und verwendet dieselbe Prüfung wie der Apply-Command
Staff SHALL einen oder mehrere Vorschläge in der Datenqualitätsmaske gegen die aktuelle Datenbank prüfen können. Der Preview-/Testlauf MUST dieselben Validierungs- und Merge-Preview-Services wie `migrate_buffet_roles --dry-run` verwenden und MUST ohne Datenbankänderungen enden. Er MUST pro Aktion geplante Tags/Erstellungen/Merges, Namensabweichungen, fehlende Pflichtfelder, mögliche Duplikate, betroffene Recipe-/Meal-Referenzen und Qualitätswarnungen anzeigen. Ein fehlgeschlagener oder veralteter Test MUST eine Freigabe blockieren. Der Preview MUST den geprüften Mapping-Inhalt und Zeitpunkt referenzieren; jede Änderung am Vorschlag invalidiert die vorherige Prüfung.

#### Scenario: Erfolgreicher schreibfreier Test
- **GIVEN** ein Rollen-Mapping oder Merge-Vorschlag ist vollständig und IDs/Namen stimmen
- **WHEN** Staff „Mapping testen“ auswählt
- **THEN** erhält Staff einen vollständigen Dry-Run-Plan mit betroffenen Referenzen
- **THEN** bleiben Zutaten, Rezepte, Tags, Portionsdaten und Status unverändert

#### Scenario: Merge-Preview zeigt Auswirkungen
- **GIVEN** ein bestätigter Zutaten-Merge-Kandidat wird getestet
- **WHEN** Staff die Preview öffnet
- **THEN** zeigt die Maske Quelle, Ziel und betroffene Rezept-, Einkaufs-/Mahlzeit- und Portionsreferenzen des Merge-Service
- **THEN** wird kein Merge ausgeführt

#### Scenario: Vorschlag nach Test geändert
- **GIVEN** ein Vorschlag wurde erfolgreich getestet
- **WHEN** Staff anschließend Rolle, IDs, Namen oder vorgeschlagene Stammdaten ändert
- **THEN** wird der Teststatus ungültig und eine erneute Prüfung ist vor Freigabe erforderlich

### Requirement: Freigegebene Vorschläge werden getrennt vom Datenbank-Apply behandelt
Staff SHALL einzeln geprüfte und erfolgreich getestete Vorschläge als freigegebenes Mapping markieren oder ablehnen können. Die Maske SHALL freigegebene Mappingdaten exportierbar machen, damit sie versioniert in die deklarative Mapping-Quelle übernommen werden können. Freigabe eines Vorschlags MUST NOT automatisch Änderungen an Zutaten, Rezepten, Tags oder Prod-Daten ausführen. Ein Apply SHALL weiter über den kontrollierten Mapping-Command erfolgen; Prod erfordert einen neuen Dry-Run und eine separate explizite Freigabe gemäß `docs/prod-runbook.md`. Nach bestätigtem Apply SHALL neu erstellte Zutaten nur bei vollständigen, fachlich geprüften Daten `verified` erhalten; Rezeptstatus und Sichtbarkeit SHALL dem bestehenden Staff-Freigabeprozess folgen.

#### Scenario: Freigabe nach erfolgreichem Test
- **GIVEN** ein unveränderter Vorschlag hat einen erfolgreichen aktuellen Preview
- **WHEN** Staff den Vorschlag freigibt
- **THEN** wird er in den freigegebenen Mapping-Export aufgenommen, ohne den Katalog zu verändern

#### Scenario: Freigabe ohne erfolgreichen Test
- **GIVEN** ein Vorschlag wurde nicht getestet, der Test ist veraltet oder enthält Blocker
- **WHEN** Staff versucht, ihn freizugeben
- **THEN** verweigert das System die Freigabe und erklärt den Grund

#### Scenario: Prod-Apply bleibt außerhalb der Maske
- **WHEN** Staff Vorschläge in der Maske speichert, testet oder freigibt
- **THEN** führt keine dieser Aktionen ein Prod-Apply aus
