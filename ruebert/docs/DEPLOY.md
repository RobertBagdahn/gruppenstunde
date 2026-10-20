# Rübert-Showcase: Deployment auf Google Cloud Run

Der Showcase läuft als **ein** Cloud-Run-Dienst (API und gebaute Oberfläche im selben Container). Der Zugang
läuft über Google Identity-Aware Proxy (IAP): Man braucht ein Google-Konto und muss freigeschaltet sein.
Das Deployment passiert ausschließlich über GitHub Actions (Workflow „Deploy Rübert“). Infrastruktur
bauen wir mit Terraform, wie bei Gruppenstunde (`terraform/`). Der Infrastruktur-Apply läuft von Hand.

Bewusst **nicht persistent**: Entscheidungen im Journal und Änderungen an Einstellungen gehen beim
nächsten Neustart verloren. Die Datenbank ist im Container, der Datenstand wird beim Bauen erzeugt.

## Was schon existiert (nicht neu anlegen)

- Google-Projekt `inspi-441320` (Account `robertbaggi@googlemail.com`), Region `europe-west1`
- Workload Identity Federation: Pool `github`, Provider `github-actions`, auf `RobertBagdahn/gruppenstunde` begrenzt
- GitHub-Secrets im Repository `RobertBagdahn/gruppenstunde`: `GCP_WORKLOAD_IDENTITY_PROVIDER`, `GCP_SERVICE_ACCOUNT`
- Terraform-State-Bucket `inspi-terraform-state`

Das vorhandene Secret `Github-Robert-github-oauthtoken-570f8b` wird **nicht** verwendet, weil es zu
Gruppenstunde gehört. Siehe Schritt 1.

## Schritt 1: GitHub-Token für das Feedback

Der Rübe-Knopf legt Issues im Repository `RobertBagdahn/seed-demand` an. Dafür braucht der Dienst ein
eigenes Token mit möglichst wenig Rechten.

1. GitHub öffnen: **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**
2. **Resource owner:** `RobertBagdahn`
3. **Expiration:** 90 Tage (Termin im Kalender setzen, dann erneuern)
4. **Repository access:** *Only select repositories* → `RobertBagdahn/seed-demand`
5. **Permissions → Repository permissions → Issues:** *Read and write*. Sonst nichts.
6. Token kopieren. Es wird nur einmal angezeigt.

Token in Secret Manager ablegen, **ohne** dass es in der Shell-Historie landet:

```bash
read -rs RUEBERT_GITHUB_TOKEN
printf '%s' "$RUEBERT_GITHUB_TOKEN" | gcloud secrets versions add ruebert-github-token \
  --data-file=- --project inspi-441320
unset RUEBERT_GITHUB_TOKEN
```

Danach `read -rs` eingeben und das Token einfügen, dann Enter. Die Eingabe ist unsichtbar.
Das Secret muss **nach** dem ersten `tofu apply` (Schritt 3) existieren.

## Schritt 2: Google-Konten für Daniel und Elena

Daniel und Elena brauchen jeweils ein Google-Konto (Gmail oder Google Workspace). Ihre Adressen
trägst du in `ruebert/access/viewers.txt` ein, eine pro Zeile. Der nächste Deploy gibt ihnen Zugriff.
Entfernen aus der Datei widerruft den Zugriff **nicht** automatisch (siehe unten).

## Schritt 3: Infrastruktur anlegen (einmalig, von Hand)

```bash
cd ruebert/terraform
gcloud auth application-default login      # Google-Konto mit Projektrechten
tofu init
tofu plan -out=ruebert.tfplan              # prüfen: 19 neue Ressourcen, keine Änderungen
tofu apply ruebert.tfplan
```

Terraform legt an: Artifact Registry `ruebert`, Bucket `inspi-441320-ruebert-data`, Secret
`ruebert-github-token`, Dienstkonten `ruebert-runtime` und `ruebert-deployer`, die Bindung für GitHub
Actions und den Cloud-Run-Dienst `ruebert` (zunächst mit einem Platzhalter-Image).

Den Plan mit dem Stand vom 20.10.2026 haben wir geprüft: 19 Ressourcen, keine Löschungen.

## Schritt 4: Datenbank in den Bucket legen

Die v1-Datenbank ist nicht in Git. Der Deploy-Workflow holt sie aus dem Bucket und baut sie in den Container.

```bash
gcloud storage cp data/seed_demand.duckdb gs://inspi-441320-ruebert-data/seed_demand.duckdb \
  --project inspi-441320
```

Die Datei liegt im Hauptcheckout von `flower-demand` unter `data/seed_demand.duckdb`. Nach jedem neuen
Stand der Daten wiederholst du den Befehl.

## Schritt 5: Deploy

Nach dem Merge auf `main` (Änderungen unter `ruebert/`) startet „Deploy Rübert“ automatisch. Manuell:
GitHub → **Actions → Deploy Rübert → Run workflow**.

Der Ablauf: Backend- und Frontend-Checks → Datenbank holen → Container bauen → Revision deployen →
IAP einschalten → Zugriffsliste anwenden → Smoke-Test (erwartet ist eine Anmeldeweiterleitung).

Die Adresse des Dienstes findest du mit:

```bash
gcloud run services describe ruebert --region europe-west1 --project inspi-441320 --format='value(status.url)'
```

## Zugriff entziehen

```bash
gcloud beta iap web remove-iam-policy-binding --resource-type=cloud-run --service=ruebert \
  --region=europe-west1 --project=inspi-441320 \
  --member="user:ADRESSE" --role=roles/iap.httpsResourceAccessor
```

Danach die Zeile aus `ruebert/access/viewers.txt` entfernen, damit der nächste Deploy sie nicht wieder vergibt.

## Bekannte Grenzen

- **Keine Persistenz:** Journal-Einträge, Einstellungen und Feedback-Pending-Einträge gehen bei Neustart verloren.
  Ein Neustart passiert bei jedem Deploy und bei Leerlauf (Skalierung auf 0).
- **Ein Instanz** (`max 1`), keine Sicherung.
- **Feedback** ohne Token landet nur im (flüchtigen) Journal. Ohne Token ist der Knopf harmlos, aber die Rückmeldung
  erreicht niemanden. Schritt 1 ist also Voraussetzung dafür.
- **IAP-Zustimmungsbildschirm:** Falls beim ersten Zugriff eine OAuth-Zustimmung verlangt wird, muss sie einmal in der
  Google-Cloud-Konsole unter „Google Auth Platform“ eingerichtet werden. Das lässt sich nicht per Terraform erledigen.
  Wir prüfen es beim ersten Deploy.
- Die Gruppenstunde-Pipeline (`deploy.yml`) ignoriert Änderungen unter `ruebert/`, damit sie nicht mitdeployt.
