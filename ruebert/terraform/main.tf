# Rübert demo: one Cloud Run service (API + built frontend), an Artifact Registry for its images,
# a private bucket for the v1 database (uploaded by hand, never in git), a secret for the GitHub token,
# and a deployer account that GitHub Actions impersonates. Access (Google accounts) is set by the pipeline
# from ruebert/access/viewers.txt, because Terraform has no resource for Cloud Run IAP yet.

locals {
  service_name = "ruebert"
  apis = [
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "iap.googleapis.com",
    "iam.googleapis.com",
    "iamcredentials.googleapis.com",
  ]
}

data "google_project" "this" {}

# ------------------------------------------------------------
# APIs
# ------------------------------------------------------------

resource "google_project_service" "apis" {
  for_each           = toset(local.apis)
  service            = each.value
  disable_on_destroy = false
}

# ------------------------------------------------------------
# Images and data
# ------------------------------------------------------------

resource "google_artifact_registry_repository" "ruebert" {
  location      = var.region
  repository_id = "ruebert"
  format        = "DOCKER"
  description   = "Rübert demo images"

  depends_on = [google_project_service.apis]
}

resource "google_storage_bucket" "data" {
  name                        = "${var.project_id}-ruebert-data"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  depends_on = [google_project_service.apis]
}

# ------------------------------------------------------------
# Secrets: the GitHub token value is added by hand (see docs/DEPLOY.md), never by Terraform
# ------------------------------------------------------------

resource "google_secret_manager_secret" "github_token" {
  secret_id = "ruebert-github-token"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis]
}

# ------------------------------------------------------------
# Accounts
# ------------------------------------------------------------

resource "google_service_account" "runtime" {
  account_id   = "ruebert-runtime"
  display_name = "Rübert runtime"
}

resource "google_secret_manager_secret_iam_member" "runtime_token" {
  secret_id = google_secret_manager_secret.github_token.id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.runtime.email}"
}

resource "google_service_account" "deployer" {
  account_id   = "ruebert-deployer"
  display_name = "Rübert GitHub deployer"
}

# Only what a deploy needs: push images, update this service, read the data bucket, manage IAP access.
resource "google_artifact_registry_repository_iam_member" "deployer_push" {
  location   = google_artifact_registry_repository.ruebert.location
  repository = google_artifact_registry_repository.ruebert.name
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_storage_bucket_iam_member" "deployer_data" {
  bucket = google_storage_bucket.data.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "deployer_run" {
  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_project_iam_member" "deployer_iap" {
  project = var.project_id
  role    = "roles/iap.admin"
  member  = "serviceAccount:${google_service_account.deployer.email}"
}

# The deployer acts as the runtime account when it deploys the service.
resource "google_service_account_iam_member" "deployer_acts_as_runtime" {
  service_account_id = google_service_account.runtime.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}

# GitHub Actions in the repository may impersonate the deployer (the pool and provider exist already).
resource "google_service_account_iam_member" "github_impersonates_deployer" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/projects/${data.google_project.this.number}/locations/global/workloadIdentityPools/${var.workload_identity_pool}/attribute.repository/${var.github_repository}"
}

# ------------------------------------------------------------
# Cloud Run service
# ------------------------------------------------------------

resource "google_cloud_run_v2_service" "ruebert" {
  name     = local.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.runtime.email
    timeout         = "300s"

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      image = var.initial_image

      ports {
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1"
          memory = "1Gi"
        }
        cpu_idle = true
      }

      env {
        name  = "GITHUB_REPO"
        value = var.github_issue_repository
      }

      env {
        name = "GITHUB_TOKEN"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.github_token.secret_id
            version = "latest"
          }
        }
      }
    }
  }

  depends_on = [
    google_project_service.apis,
    google_secret_manager_secret_iam_member.runtime_token,
  ]

  # The deploy workflow owns the image; Terraform owns everything else.
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
      client,
      client_version,
    ]
  }
}
