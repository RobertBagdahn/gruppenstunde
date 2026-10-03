#!/usr/bin/env bash
# One-time setup: lets GitHub Actions (RobertBagdahn/gruppenstunde) deploy to GCP via
# Workload Identity Federation. Idempotent-ish; review before running. Needs project owner rights.
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-inspi-441320}"
REPO="${REPO:-RobertBagdahn/gruppenstunde}"
POOL="github"
PROVIDER="github-actions"
SA_NAME="github-deployer"
SA="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format="value(projectNumber)")

gcloud iam service-accounts create "$SA_NAME" --project "$PROJECT_ID" --display-name "GitHub Actions deployer" || true

for role in roles/run.admin roles/cloudbuild.builds.editor roles/artifactregistry.writer \
            roles/storage.admin roles/serviceusage.serviceUsageConsumer roles/cloudsql.viewer \
            roles/logging.viewer; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member "serviceAccount:$SA" --role "$role" --condition=None >/dev/null
done

# Cloud Run deploys act as the runtime service accounts; Cloud Build uploads source via the default bucket.
gcloud iam service-accounts add-iam-policy-binding "${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --project "$PROJECT_ID" --member "serviceAccount:$SA" --role roles/iam.serviceAccountUser >/dev/null

gcloud iam workload-identity-pools create "$POOL" --project "$PROJECT_ID" --location global --display-name "GitHub" || true
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" --project "$PROJECT_ID" --location global \
  --workload-identity-pool "$POOL" --issuer-uri "https://token.actions.githubusercontent.com" \
  --attribute-mapping "google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --attribute-condition "assertion.repository=='${REPO}'" || true

gcloud iam service-accounts add-iam-policy-binding "$SA" --project "$PROJECT_ID" \
  --role roles/iam.workloadIdentityUser \
  --member "principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}" >/dev/null

cat <<OUT

Add these GitHub repository secrets (Settings > Secrets and variables > Actions):
  GCP_WORKLOAD_IDENTITY_PROVIDER = projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/providers/${PROVIDER}
  GCP_SERVICE_ACCOUNT            = ${SA}
OUT
