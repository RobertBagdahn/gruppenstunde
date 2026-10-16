## ADDED Requirements

### Requirement: Löffel-Portionen werden am Namen erkannt
Die Mengenumrechnung SHALL eine Portion als EL/TL/Prise/Msp erkennen, wenn ihr normalisierter Name damit beginnt (`1 TL (2g)`, `1 EL (10ml)`, `Esslöffel`). Der Name der Maßeinheit MUST nur gelten, wenn der Portionsname keine andere Einheit nennt.

#### Scenario: TL-Portion mit Gewicht im Namen
- **GIVEN** `Knoblauchpulver` hat die Portion `1 TL (2g)`
- **WHEN** `1 TL Knoblauchpulver` umgerechnet wird
- **THEN** ergibt sich 1 × `1 TL (2g)` = 2 g

#### Scenario: ml-Portion mit falscher Maßeinheit
- **GIVEN** `Limettensaft` hat die Portion `200 ml` mit Maßeinheit „Esslöffel“
- **WHEN** `1 EL Limettensaft` umgerechnet wird
- **THEN** wird die Portion `200 ml` nicht als Esslöffel gezählt und das Ergebnis liegt bei 15 g

### Requirement: Größenangaben bei Stückportionen
Bei Stück-Einheiten SHALL die Umrechnung eine Stückportion mit passender Größe wählen (`kleines Stück` für `klein`, `großes Stück` für `groß`). Fehlt sie, MUST das Gewicht der normalen Stückportion skaliert werden (klein × 0,6, groß × 1,4). Ohne Größenangabe MUST eine normale (nicht „kleine“) Stückportion bevorzugt werden.

#### Scenario: Große Zwiebeln
- **WHEN** `3 große Zwiebel(n)` umgerechnet wird und die Zutat `Stück` (100 g) und `kleines Stück` (50 g) hat
- **THEN** ergibt sich 420 g

### Requirement: Standardgewichte ohne KI
Für Stück- und Gebinde-Einheiten ohne passende Portion SHALL die Umrechnung zuerst eine Tabelle typischer Gewichte verwenden (u. a. Zehe 5 g, Bund Kräuter 20 g, Topf Kräuter 25 g, Zweig 1 g, Stiel 1 g, Blatt 0,4 g, Stange Lauch 200 g, Knolle Sellerie 700 g, Pck. Backpulver 16 g, Pck. Vanillezucker 8 g, Glas Wein 150 ml, Dose Tomaten 400 g) sowie typische Stückgewichte je Zutat. Gemini MUST erst danach und nur für angemeldete Nutzer gefragt werden.

#### Scenario: Bund Rosmarin
- **WHEN** `1 Bund Rosmarin` ohne Bund-Portion umgerechnet wird
- **THEN** ergibt sich 20 g ohne KI-Aufruf

#### Scenario: Prise
- **WHEN** `1 Prise Salz` umgerechnet wird
- **THEN** ergibt sich 0,5 g

### Requirement: Dichte nach Kategorie
Ist für eine Zutat keine eigene Dichte gepflegt (Wert 1,0), SHALL die Volumenumrechnung eine Kategorie-Dichte verwenden: Pulver und gemahlene Gewürze 0,5, Öle 0,92, Honig und Sirup 1,4, Zucker 0,85, Mehl 0,55, sonst 1,0.

#### Scenario: Cayennepfeffer
- **WHEN** `1 TL Cayennepfeffer` ohne passende Portion umgerechnet wird
- **THEN** ergibt sich 2,5 g
