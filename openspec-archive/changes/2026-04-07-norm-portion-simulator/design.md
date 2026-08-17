## Context

Die Plattform Inspi bietet Pfadfinder-Gruppenführern verschiedene Tools. Im Backend existiert bereits ein vollständiger `norm_person_service.py` in `backend/supply/services/`, der BMR/TDEE-Berechnungen (Mifflin-St Jeor), Referenztabellen für Gewicht/Größe nach Alter und Geschlecht, sowie Normfaktor-Berechnungen durchführt. Die Referenz-Normperson ist definiert als: 15 Jahre, männlich, PAL 1.5.

Dieser Service ist aktuell nicht über die API exponiert und hat keine Frontend-Darstellung. Das Normportion-Simulationstool soll diese Lücke schließen.

Betroffene Dateien:
- `backend/supply/services/norm_person_service.py` (bestehend, wird genutzt, nicht verändert)
- `backend/supply/api/` (neuer Router für Normperson-Endpunkte)
- `backend/supply/schemas/` (neue Pydantic-Schemas)
- `backend/inspi/urls.py` (Router-Registrierung)
- `frontend/src/schemas/` (neue Zod-Schemas)
- `frontend/src/api/` (neue TanStack Query Hooks)
- `frontend/src/pages/tools/NormPortionSimulatorPage.tsx` (neue Seite)
- `frontend/src/App.tsx` (neue Route)

## Goals / Non-Goals

**Goals:**
- Bestehenden `norm_person_service.py` über REST-API zugänglich machen
- Interaktive Visualisierung des Energiebedarfs und Normfaktors nach Alter, Geschlecht und Aktivitätslevel
- Graphen getrennt nach männlich/weiblich für Energiebedarf (kJ) und Normfaktor
- PAL-Slider/Auswahl als Steuerelement für die Graphen
- Einzelperson-Rechner: Alter + Geschlecht + PAL → detaillierte Normfaktor-Berechnung
- Transparente Darstellung der Referenz-Normperson

**Non-Goals:**
- Gruppenportions-Skalierung im Simulator (gehört zum Essensplan-Feature)
- Rezept-Integration (kommt separat)
- Benutzerdefinierte Gewichts-/Größendaten (nur Referenzdaten)
- Persistierung von Simulationsergebnissen
- Authentifizierung (Tool ist öffentlich zugänglich)

## Decisions

### 1. API-Struktur: Dedizierter Norm-Person Router

**Entscheidung:** Eigener Router unter `/api/norm-person/` statt Erweiterung des Supply-Routers.

**Alternativen:**
- Supply-Router erweitern (`/api/supplies/norm-person/...`) — Abgelehnt, da konzeptionell eigenständig und nicht direkt mit Material/Ingredient-CRUD verwandt.
- Utility-Router (`/api/utils/norm-person/...`) — Abgelehnt, kein allgemeiner Utils-Namespace im Projekt.

**Begründung:** Der Normperson-Service gehört zur `supply` App, aber die Endpunkte sind eigenständig genug für einen separaten Router. Montage in `urls.py` unter `/api/norm-person/`.

### 2. API-Endpunkte

Zwei Endpunkte:

**`GET /api/norm-person/calculate`** — Einzelberechnung
- Query-Parameter: `age` (int, 0–99), `gender` (male/female), `pal` (float, 1.0–2.5)
- Response: `NormPersonResultOut` (bmr, tdee, norm_factor, weight_kg, height_cm, age, gender, pal)

**`GET /api/norm-person/curves`** — Bulk-Kurvendaten für Graphen
- Query-Parameter: `pal` (float, 1.0–2.5, default 1.5)
- Response: `NormPersonCurvesOut` — enthält Arrays für alle Alter (0–99) mit TDEE und Normfaktor je Geschlecht

**Begründung:** Zwei separate Endpunkte statt einem kombinierten, weil die Use-Cases verschieden sind (Graph-Daten vs. Einzelabfrage). Der Kurven-Endpunkt berechnet serverseitig statt clientseitig, um die Formellogik zentral zu halten.

**Alternative:** Berechnung komplett clientseitig — Abgelehnt, da die Referenztabellen und Formeln im Backend verbleiben sollten (Single Source of Truth).

### 3. Chart-Bibliothek: recharts

**Entscheidung:** recharts als Chart-Bibliothek.

**Alternativen:**
- chart.js / react-chartjs-2 — Mehr Low-Level, weniger React-idiomatic
- visx — Zu komplex für die Anforderungen
- nivo — Gute Optionen, aber recharts hat größere Community und einfachere API

**Begründung:** recharts ist React-nativ, unterstützt responsive Charts, hat gute TypeScript-Unterstützung und ist leichtgewichtig. Passt zum Tech-Stack.

### 4. State-Management: URL-Parameter

**Entscheidung:** PAL-Wert und ggf. ausgewähltes Alter als URL-Query-Parameter (`?pal=1.5`).

**Begründung:** Projekt-Konvention ist URL-driven State. Ermöglicht Teilen von Simulator-Konfigurationen per Link.

### 5. Keine Datenbankmigrationen

**Entscheidung:** Keine neuen Models oder DB-Änderungen. Reine Berechnungslogik.

**Begründung:** Der Service arbeitet mit statischen Referenztabellen im Code. Kein Persistierungsbedarf.

## API-Endpunkte

### `GET /api/norm-person/calculate`

Request (Query-Parameter):
```
age: int (0-99)
gender: str ("male" | "female")
pal: float (1.0-2.5, default 1.5)
```

Response `NormPersonResultOut`:
```json
{
  "bmr": 1485.0,
  "tdee": 2227.5,
  "norm_factor": 1.0,
  "weight_kg": 56.0,
  "height_cm": 170.0,
  "age": 15,
  "gender": "male",
  "pal": 1.5
}
```

### `GET /api/norm-person/curves`

Request (Query-Parameter):
```
pal: float (1.0-2.5, default 1.5)
```

Response `NormPersonCurvesOut`:
```json
{
  "pal": 1.5,
  "reference": {
    "age": 15,
    "gender": "male",
    "pal": 1.5,
    "tdee": 2227.5,
    "norm_factor": 1.0
  },
  "data_points": [
    {
      "age": 0,
      "male_tdee": 350.0,
      "female_tdee": 330.0,
      "male_norm_factor": 0.157,
      "female_norm_factor": 0.148
    },
    ...
  ]
}
```

## Risks / Trade-offs

- **[Performance: 100 Berechnungen pro Kurven-Request]** → Mitigiert: Reine Arithmetik, kein DB-Zugriff. Response-Zeit unter 50ms erwartet. Caching nicht nötig.
- **[Neue Frontend-Dependency: recharts]** → Mitigiert: Tree-shakeable, ~45kB gzipped. Wird wahrscheinlich auch für andere Visualisierungen nützlich sein (Rezept-Nährwerte, Event-Statistiken).
- **[Formel-Abweichung zwischen alter NormPerson-Klasse und neuem Service]** → Mitigiert: Die User-bereitgestellte `NormPerson`-Klasse und der bestehende `norm_person_service.py` verwenden beide Mifflin-St Jeor, aber leicht unterschiedliche Referenztabellen. Wir verwenden ausschließlich den bestehenden `norm_person_service.py` als Source of Truth.
