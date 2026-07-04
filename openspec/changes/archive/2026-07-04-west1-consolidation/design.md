## Context

### Aktuelle Architektur

```
europe-west1                    europe-west3
┌──────────────────────┐        ┌──────────────────┐
│ inspi-backend        │  ◀──  │ inspi-db          │
│ inspi-frontend       │  CORS  │ (PG 15, db-f1-micro)
│ inspi-frontend-food  │        └──────────────────┘
└──────────────────────┘
```

**Probleme:**
1. **Cross-Region DB**: Cloud SQL (west3) → Backend (west1). Der Auth Proxy ist cross-region instabil. Latenz ~5-15ms zusätzlich.
2. **iOS-Login**: `VITE_API_URL` zwingt Frontend zu Direktaufrufen ans Backend. iOS blockiert die Cross-Origin-Cookies.

### DB-spezifische Details

| Attribut | Wert |
|----------|------|
| Instance | `inspi-db` |
| Region | europe-west3 |
| Version | POSTGRES_15 |
| Tier | db-f1-micro (0.6GB RAM, shared vCPU) |
| Disk | 10GB PD_SSD |
| Backups | ❌ Deaktiviert |
| Auto-Resize | ❌ Deaktiviert |
| IP | 35.246.147.106 (Public) |

Da db-f1-micro keine Cross-Region-Replicas unterstützt (min. 3.75GB RAM nötig),
ist nur pg_dump/pg_restore als Migrationsverfahren möglich.

## Goals / Non-Goals

**Goals:**
- DB in dieselbe Region wie Backend bringen (west1)
- Backups aktivieren (aktuell aus — Risiko)
- iOS-Login fixen (Same-Origin-Proxy statt Direct-CORS)
- `proxy_cookie_path`-Hack entfernen
- Prod-Migrationen (`is_optional`, `tag.group`) nachholen

**Non-Goals:**
- Keine Änderung an Cloud Run Services (bleiben in west1)
- Keine Code-Refactoring der Apps
- Keine Private-IP/ VPC-Umstellung (bleibt Public IP)
- Kein Scale-Up der DB (bleibt db-f1-micro)

## Decisions

### 1. DB-Migration: pg_dump/pg_restore (nicht Replica)

Da db-f1-micro keine Cross-Region-Replicas unterstützt, bleibt nur Dump/Restore.

**Alternative verworfen:** Instance auf höheren Tier upgraden (z.B. db-g1-small), Replica erstellen, promoten, downgraden. Das wäre teurer und aufwändiger bei ~24k Einträgen.

**Geschätzte Downtime:** 30min (Dump: ~2min, Restore mit pgvector: ~20min, Verifikation: ~5min)

### 2. iOS-Login: VITE_API_URL entfernen + SameSite=Lax

Siehe `ios-login-fix/design.md` — die Entscheidungen sind identisch.
**Kurz:** Relative API-Calls → nginx-Proxy → Same-Origin → iOS akzeptiert Cookies.

### 3. Backups aktivieren

Beim Anlegen der neuen Instance werden Backups aktiviert (aktuell deaktiviert — unbeabsichtigt). Tägliches Backup-Fenster: 02:00-05:00 MEZ.

### 4. Kein Private IP / VPC

Die aktuelle Instance nutzt Public IP. Ein Wechsel auf Private IP + VPC Connector wäre wünschenswert, ist aber ein separater Change. Beim Neuanlegen in west1 bleibt es vorerst bei Public IP.

## Migration Plan

### Phase 1: Vorbereitung (Code-Änderungen)

1. `production.py`: SameSite auf `"Lax"` ändern
2. `nginx.conf.template`: `proxy_cookie_path` entfernen
3. `Makefile`: `VITE_API_URL` aus Builds entfernen
4. Neue Cloud SQL Instance in west1 erstellen

### Phase 2: DB-Migration (Downtime)

1. Backend in den Wartungsmodus versetzen (oder akzeptieren, dass ~30min keine DB-Schreibzugriffe erfolgen)
2. pg_dump der west3-DB
3. pg_restore auf west1-DB
4. DB_HOST-Secret auf neue IP updaten
5. Backend neustarten
6. Verifizieren (API-Calls funktionieren)
7. Alte Instance in west3 löschen

### Phase 3: Frontend-Deploy

1. Frontend-Images (main + food) ohne `VITE_API_URL` bauen
2. Deployen
3. iOS-Login testen

## Risks / Trade-offs

- **[Datenverlust bei Dump/Restore]** Bei einem Fehler während des Dumps kann der Zustand der west3-DB inkonsistent sein. → **Mitigation**: Vor dem Dump alle aktiven Verbindungen zum Backend killen, `pg_dump` mit `--no-blocks` verwenden.
- **[Kein Backup der alten DB]** Backups sind aktuell deaktiviert. → **Mitigation**: Vor der Migration ein manuelles Backup via `gcloud sql backups create` erstellen, auch wenn kein automatisierter Backup läuft.
- **[pgvector-Kompatibilität]** Die neue Instance braucht pgvector. → **Mitigation**: `gcloud sql instances create` mit `--database-flags=cloudsql.enable_pgvector=on`.
- **[Session-Verlust]** Alle User müssen sich nach der SameSite-Änderung neu anmelden (Cookies werden ersetzt). → **Mitigation**: Automatisch beim nächsten Seitenbesuch — kein Eingriff nötig.
- **[Rollback DB]** Bei Problemen: DB_HOST auf alte IP zurücksetzen, Backend neustarten. Daten in west3 sind bis zum Löschen erhalten.
- **[Rollback Frontend]** Altes Docker-Image (mit VITE_API_URL) deployen.
