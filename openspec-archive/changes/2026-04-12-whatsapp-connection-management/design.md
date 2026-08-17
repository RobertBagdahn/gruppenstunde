## Context

Die WhatsApp-Integration nutzt neonize (Python WhatsApp-Library) mit PostgreSQL-Session-Storage. Die aktuelle Implementierung (`backend/event/services/whatsapp.py`) hat einen `WhatsAppClientManager` (Singleton, in-memory Client-Cache) und einen `WhatsAppService` (Business-Logik). Der Verbindungsstatus wird aus der DB (`WhatsAppConnection.is_active`) gelesen, ohne die tatsaechliche neonize-Session zu validieren. Es gibt keinen Mechanismus, um die Verbindung aktiv zu testen oder nach einem Ausfall wiederherzustellen.

Betroffene Dateien:
- `backend/event/services/whatsapp.py` — `WhatsAppClientManager` + `WhatsAppService`
- `backend/event/api/whatsapp.py` — `whatsapp_router` Endpunkte
- `backend/event/schemas/whatsapp.py` — Pydantic Schemas
- `backend/event/models/whatsapp.py` — `WhatsAppConnection` Model
- `frontend/src/api/whatsapp.ts` — TanStack Query Hooks
- `frontend/src/schemas/whatsapp.ts` — Zod Schemas
- `frontend/src/components/whatsapp/WhatsAppConnectionCard.tsx` — Profilseiten-UI

## Goals / Non-Goals

**Goals:**
- Aktive Verbindungspruefung: Echten neonize-Session-Status abfragen statt nur DB-Flag
- Test-Nachricht: Nutzer kann sich selbst eine WhatsApp-Nachricht senden zur Verifizierung
- Reconnect: Bestehende Session wiederherstellen ohne neuen QR-Code (wenn moeglich)
- Verbindungs-Log: Letzte Verbindungsereignisse anzeigen fuer Diagnose
- Robustere Status-Anzeige: `is_active` automatisch korrigieren wenn Session ungueltig

**Non-Goals:**
- Automatisches Reconnect im Hintergrund (kein Polling/Cron — nur user-initiiert)
- Push-Benachrichtigungen bei Verbindungsverlust
- WhatsApp-Gruppen-Support
- Aenderungen am Messaging-Flow (`MessagingService`, `MessagingTab`)

## Decisions

### 1. Health Check via neonize Client-Status statt externer API

**Entscheidung**: Der Health Check prueft den In-Memory-Status des neonize-Clients (`client.is_connected()` / `client.is_logged_in()`) und versucht bei Bedarf ein lazy Reconnect aus der PostgreSQL-Session.

**Alternativen erwogen**:
- WhatsApp Web API Ping: Nicht moeglich — neonize bietet keine dedizierte Ping-Methode
- Periodischer Background-Check: Zu aufwendig fuer Cloud Run (Scale-to-Zero), und nicht user-initiiert

**Rationale**: neonize haelt den Verbindungsstatus im Client-Objekt. Wir koennen `get_or_create_client()` nutzen, um ein Reconnect zu versuchen, und dann den Status abfragen. Das ist konsistent mit der bestehenden Lazy-Client-Architektur.

### 2. Test-Nachricht an eigene Nummer

**Entscheidung**: `POST /api/whatsapp/test/` sendet eine vordefinierte Nachricht an die in `WhatsAppConnection.phone_number` gespeicherte Nummer des Nutzers. Die Nachricht zaehlt nicht gegen das Rate-Limit, wird aber als `WhatsAppMessage` mit `event=None` geloggt.

**Alternativen erwogen**:
- Separate Test-Tabelle: Ueberkompliziert — ein WhatsAppMessage ohne Event-FK reicht
- Echo-Bot: Nicht moeglich ohne zweites WhatsApp-Konto

**Rationale**: Die eigene Nummer ist bereits gespeichert. Eine Test-Nachricht mit festem Text ("Inspi WhatsApp-Test: Deine Verbindung funktioniert!") ist der einfachste Beweis, dass die Verbindung funktioniert.

### 3. Reconnect-Strategie: Session-basiert mit QR-Fallback

**Entscheidung**: `POST /api/whatsapp/reconnect/` versucht:
1. Pruefen ob Client bereits verbunden ist → return success
2. `get_or_create_client()` + `start_client_in_thread()` → neonize versucht Session-Reconnect
3. Warten (max 10s Polling) ob Status auf `connected` springt
4. Falls nicht → return `needs_qr: true` (Frontend zeigt QR-Dialog)

**Alternativen erwogen**:
- Sofort QR-Dialog oeffnen: Schlechte UX — meistens reicht ein Session-Reconnect
- Synchrones Warten: Neonize braucht einen Thread — Polling ist konsistent mit bestehendem QR-Flow

**Rationale**: In den meisten Faellen (Container-Restart, temporaerer Netzwerk-Ausfall) ist die Session noch gueltig. Nur bei WhatsApp-seitigem Logout braucht man einen neuen QR-Code.

### 4. Verbindungs-Log: Letzte 10 Ereignisse in-memory + optional DB

**Entscheidung**: Ein neues Model `WhatsAppConnectionLog` speichert Verbindungsereignisse (connected, disconnected, health_check_ok, health_check_failed, reconnect_success, reconnect_failed, test_sent, test_failed) mit Timestamp. Max. 50 Eintraege pro User (aeltere werden geloescht). API liefert die letzten 10.

**Alternativen erwogen**:
- Nur In-Memory-Log: Geht bei Container-Restart verloren
- Django Audit Log: Zu generisch, zu viel Overhead

**Rationale**: Ein einfaches Model mit auto-cleanup ist robust und ueberlebt Restarts. 50 Eintraege pro User sind minimal im Storage.

### 5. Model-Aenderungen

**Neue Felder auf `WhatsAppConnection`**:
- `last_health_check_at: DateTimeField(null=True, blank=True)` — letzter erfolgreicher Health Check

**Neues Model `WhatsAppConnectionLog`**:
- `connection: ForeignKey(WhatsAppConnection, CASCADE)`
- `event_type: CharField(max_length=30)` — connected/disconnected/health_check_ok/health_check_failed/reconnect_success/reconnect_failed/test_sent/test_failed
- `message: TextField(blank=True, default="")` — optionale Details (z.B. Fehlermeldung)
- `created_at: DateTimeField(auto_now_add=True)`

**Migration**: Eine Migration fuer `last_health_check_at` auf `WhatsAppConnection` und `WhatsAppConnectionLog` Model.

### 6. API-Endpunkt-Design

| Methode | Pfad | Request | Response | Beschreibung |
|---------|------|---------|----------|-------------|
| `POST` | `/api/whatsapp/health-check/` | — | `WhatsAppHealthCheckOut` | Aktive Verbindungspruefung |
| `POST` | `/api/whatsapp/test/` | — | `WhatsAppTestResultOut` | Test-Nachricht an eigene Nummer |
| `POST` | `/api/whatsapp/reconnect/` | — | `WhatsAppReconnectOut` | Session-Reconnect versuchen |
| `GET` | `/api/whatsapp/logs/` | — | `list[WhatsAppConnectionLogOut]` | Letzte 10 Verbindungsereignisse |

**Neue Pydantic Schemas**:

```python
class WhatsAppHealthCheckOut(Schema):
    is_healthy: bool
    status: str  # "connected", "disconnected", "session_invalid", "error"
    checked_at: str
    message: str  # Menschenlesbare Statusmeldung

class WhatsAppTestResultOut(Schema):
    success: bool
    message: str  # Erfolgs- oder Fehlermeldung

class WhatsAppReconnectOut(Schema):
    success: bool
    needs_qr: bool  # True wenn QR-Pairing noetig
    status: str  # "connected", "pending_qr", "failed"
    message: str

class WhatsAppConnectionLogOut(Schema):
    event_type: str
    message: str
    created_at: str
```

**Neue Zod Schemas** (1:1 Match):

```typescript
export const WhatsAppHealthCheckSchema = z.object({
  is_healthy: z.boolean(),
  status: z.enum(['connected', 'disconnected', 'session_invalid', 'error']),
  checked_at: z.string(),
  message: z.string(),
});

export const WhatsAppTestResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

export const WhatsAppReconnectSchema = z.object({
  success: z.boolean(),
  needs_qr: z.boolean(),
  status: z.enum(['connected', 'pending_qr', 'failed']),
  message: z.string(),
});

export const WhatsAppConnectionLogSchema = z.object({
  event_type: z.string(),
  message: z.string(),
  created_at: z.string(),
});
```

### 7. Frontend UI-Erweiterung: WhatsAppConnectionCard

Die bestehende `WhatsAppConnectionCard` wird erweitert mit:

**Im verbundenen Zustand**:
- "Verbindung pruefen"-Button (Health Check) → zeigt Ergebnis als Toast + aktualisiert Status-Dot
- "Test senden"-Button → sendet Test-Nachricht, zeigt Ergebnis als Toast
- Reconnect-Button (nur sichtbar wenn Health Check fehlschlaegt)
- Verbindungs-Log (letzte 5 Eintraege, aufklappbar)

**Im nicht-verbundenen Zustand**:
- "Erneut verbinden"-Button (versucht Reconnect, oeffnet bei Bedarf QR-Dialog)
- Grund der Trennung anzeigen (aus Log)

## Risks / Trade-offs

- **[Risk] neonize `is_connected()` ist nicht zuverlaessig nach Container-Restart** → Mitigation: Health Check versucht immer erst `get_or_create_client()` mit Session-Reconnect bevor Status geprueft wird
- **[Risk] Test-Nachricht koennte WhatsApp-Account-Sperre ausloesen bei zu haeufiger Nutzung** → Mitigation: Rate-Limit von max 1 Test-Nachricht pro Minute (eigenes Limit, unabhaengig vom Message-Rate-Limit)
- **[Risk] Reconnect-Timeout (10s) koennte fuer langsame Netzwerke nicht reichen** → Mitigation: Timeout ist konfigurierbar, Frontend zeigt Spinner waehrend Reconnect
- **[Trade-off] Verbindungs-Log in DB statt in-memory**: Minimal mehr DB-Writes, aber ueberlebt Restarts und ist einfacher zu debuggen
- **[Trade-off] `WhatsAppMessage` fuer Test-Nachrichten mit `event=None`**: Erfordert `event` FK als nullable — aber vermeidet separates Model
