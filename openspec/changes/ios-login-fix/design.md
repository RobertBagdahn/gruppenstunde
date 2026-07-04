## Context

Die Produktionsarchitektur für `essensplan.app`:

```
Browser ──→ Google Front End (GFE)
              │
              └── inspi-frontend-food (Cloud Run, europe-west1)
                    ├── nginx: served React SPA
                    └── nginx: proxy_pass /api/ → inspi-backend
```

Das React-Frontend wurde bisher mit `VITE_API_URL=https://inspi-backend-...` gebaut.
API-Calls gehen direkt Cross-Origin zum Backend, **nicht durch den nginx-Proxy**.
Der nginx-Proxy (`location /api/ { proxy_pass ${BACKEND_URL}; }`) ist vorhanden,
aber ungenutzt, weil `VITE_API_URL` die React-App zu Direktaufrufen veranlasst.

Das Backend setzt `SESSION_COOKIE_SAMESITE = "None"` und
`CSRF_COOKIE_SAMESITE = "None"`, weil es Cross-Origin-Calls erwartet.
nginx überschreibt das per `proxy_cookie_path / "/; SameSite=Lax"` — ein Hack,
der SameSite=Lax in den Path-Wert injectt.

## Goals / Non-Goals

**Goals:**
- Login auf iOS (Chrome/Safari) funktioniert: Session-Cookies werden akzeptiert
- API-Calls sind same-origin → keine Third-Party-Cookie-Blockade
- `proxy_cookie_path`-Hack wird entfernt
- Backend-Cookie-Settings sind korrekt für Same-Origin-Proxy

**Non-Goals:**
- Architektur-Änderung (Cloud Run, GFE, nginx bleiben wie sind)
- Code-Refactoring der React-App oder des Backend
- Neue Infrastruktur-Komponenten
- Migration des Backends nach europe-west3 (separater Change)

## Decisions

### 1. VITE_API_URL entfernen (statt SameSite=None zu erzwingen)

**Optionen:**
- A) VITE_API_URL leer lassen → relative API-Calls → nginx-Proxy → same-origin
- B) SameSite=None beibehalten + Storage Access API auf iOS
- C) Partitioned Cookies (CHIPS) nutzen

**Entscheidung: A**

| Kriterium | A (Proxy) | B (SAA) | C (CHIPS) |
|-----------|-----------|---------|-----------|
| iOS-Kompatibilität | ✅ Voll | ⚠️ User-Prompt nötig | ⚠️ Nur embedded contexts |
| Desktop | ✅ | ✅ | ✅ |
| Komplexität | Niedrig | Mittel | Niedrig |
| Wartbarkeit | ✅ Standard | ❌ Speziallösung | ⚠️ Neuere API |

Der Proxy-Ansatz ist der Web-Standard, den die allermeisten Produktionen verwenden.
Kein Workaround, keine Browser-API-Abhängigkeit.

### 2. Backend-SameSite auf Lax ändern

Nach dem Proxy-Wechsel sind alle API-Calls same-origin (vom Browser aus gesehen).
`SameSite=None` ist nicht mehr nötig und schwächt die Sicherheit.
`SameSite=Lax` ist der sichere Default für same-origin-Requests.

### 3. proxy_cookie_path entfernen

Der Hack `proxy_cookie_path / "/; SameSite=Lax"` ist überflüssig, wenn:
- Backend SameSite=Lax setzt (dann ist kein Override nötig)
- API-Calls durch den nginx-Proxy gehen (dann sind Cookies sowieso same-origin)

## Risiken / Trade-offs

- **[CORS-Konfiguration obsolet]** Die CORS-Einstellungen in `production.py` werden nach
  dem Proxy-Wechsel nicht mehr für normale API-Calls benötigt, schaden aber nicht.
  Sie bleiben für zukünftige Use-Cases (z.B. Drittanbieter-Integrationen) erhalten.
- **[Cache-Invalidierung]** Nach dem Deploy müssen User ihre Session neu holen
  (Cookies ändern ihre SameSite-Eigenschaft). Das passiert automatisch beim nächsten
  Seitenbesuch — kein manuelles Eingreifen nötig.
- **[nginx DNS-Auflösung]** Der `proxy_pass` im nginx verwendet einen `resolver`
  (8.8.8.8). Falls der Backend-Cloud-Run-DNS nicht aufgelöst werden kann, wird die
  Seite mit API-Fehlern laden. Das ist die aktuelle Baseline — keine Veränderung.
- **[Migrationen auf Prod]** Die ausstehenden Migrationen (`is_optional`, `tag.group`)
  werden separat ausgeführt. Falls sie Fehler werfen (z.B. bereits teilweise
  angewandt), müssen sie manuell repariert werden.
- **[Rollback]** Bei Problemen: Altes Frontend-Image mit `VITE_API_URL`-Build
  deployen. Backend-Änderung (SameSite) separat revertieren. Kein Datenverlust.
