# ============================================================
# Inspi – GCP Infrastructure (Terraform)
#
# Resources:
#   - GCP APIs
#   - Artifact Registry
#   - GCS Buckets (frontend, media, pgdata, terraform state)
#   - Cloud Run Services (backend, db)
#   - Cloud Build Triggers (deploy + PR check)
#   - IAM bindings
#   - Secret Manager
# ============================================================

locals {
  env_prefix    = var.environment == "prod" ? "inspi" : "inspi-${var.environment}"
  backend_image = "${var.region}-docker.pkg.dev/${var.project_id}/inspi/backend"
  db_image      = "${var.region}-docker.pkg.dev/${var.project_id}/inspi/db"
  is_prod       = var.environment == "prod"
}

# -----------------------------------------------
# Enable required GCP APIs
# -----------------------------------------------

resource "google_project_service" "apis" {
  for_each = toset([
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "storage.googleapis.com",
    "iam.googleapis.com",
  ])

  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}

# -----------------------------------------------
# Artifact Registry
# -----------------------------------------------

resource "google_artifact_registry_repository" "inspi" {
  location      = var.region
  repository_id = "inspi"
  description   = "Inspi container images"
  format        = "DOCKER"

  depends_on = [google_project_service.apis["artifactregistry.googleapis.com"]]
}

# -----------------------------------------------
# GCS Buckets
# -----------------------------------------------

resource "google_storage_bucket" "frontend" {
  name          = "${local.env_prefix}-static"
  location      = var.region
  force_destroy = !local.is_prod

  website {
    main_page_suffix = "index.html"
    not_found_page   = "index.html"
  }

  uniform_bucket_level_access = true

  depends_on = [google_project_service.apis["storage.googleapis.com"]]
}

resource "google_storage_bucket_iam_member" "frontend_public" {
  bucket = google_storage_bucket.frontend.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

resource "google_storage_bucket" "media" {
  name          = "${local.env_prefix}-media"
  location      = var.region
  force_destroy = !local.is_prod

  uniform_bucket_level_access = true

  depends_on = [google_project_service.apis["storage.googleapis.com"]]
}

resource "google_storage_bucket" "pgdata" {
  name          = "${local.env_prefix}-pgdata-${var.project_id}"
  location      = var.region
  force_destroy = !local.is_prod

  uniform_bucket_level_access = true

  depends_on = [google_project_service.apis["storage.googleapis.com"]]
}

# -----------------------------------------------
# Secret Manager – Django Settings
# -----------------------------------------------

resource "google_secret_manager_secret" "django_settings" {
  secret_id = "${var.environment}_django_settings"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret" "db_password" {
  secret_id = "${var.environment}_db_password"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

# -----------------------------------------------
# Cloud Run – Database (PostgreSQL + pgvector)
# -----------------------------------------------

resource "google_cloud_run_v2_service" "db" {
  name     = "${local.env_prefix}-db"
  location = var.region

  template {
    containers {
      image = "${local.db_image}:latest"

      ports {
        container_port = 5432
      }

      env {
        name  = "POSTGRES_DB"
        value = "inspi"
      }
      env {
        name  = "POSTGRES_USER"
        value = "inspi"
      }
      env {
        name = "POSTGRES_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = var.db_cpu
          memory = var.db_memory
        }
      }

      volume_mounts {
        name       = "pgdata"
        mount_path = "/var/lib/postgresql/data"
      }
    }

    volumes {
      name = "pgdata"
      gcs {
        bucket    = google_storage_bucket.pgdata.name
        read_only = false
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_secret_manager_secret_version.db_password,
  ]
}

# DB: no public access
resource "google_cloud_run_v2_service_iam_member" "db_no_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.db.name
  role     = "roles/run.invoker"
  member   = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

# -----------------------------------------------
# Cloud Run – Backend (Django / Gunicorn)
# -----------------------------------------------

resource "google_cloud_run_v2_service" "backend" {
  name     = "${local.env_prefix}-backend"
  location = var.region

  template {
    containers {
      image = "${local.backend_image}:latest"

      ports {
        container_port = 8000
      }

      env {
        name  = "DJANGO_SETTINGS_MODULE"
        value = "inspi.settings.production"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "APPENGINE_URL"
        value = "https://${var.domain}"
      }
      env {
        name  = "GCS_BUCKET_NAME"
        value = google_storage_bucket.media.name
      }
      env {
        name  = "DB_HOST"
        value = google_cloud_run_v2_service.db.uri
      }
      env {
        name  = "DB_NAME"
        value = "inspi"
      }
      env {
        name  = "DB_USER"
        value = "inspi"
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db_password.secret_id
            version = "latest"
          }
        }
      }

      resources {
        limits = {
          cpu    = var.backend_cpu
          memory = var.backend_memory
        }
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = var.backend_max_instances
    }
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_cloud_run_v2_service.db,
  ]
}

# Backend: allow public access
resource "google_cloud_run_v2_service_iam_member" "backend_public" {
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.backend.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# -----------------------------------------------
# Data sources
# -----------------------------------------------

data "google_project" "current" {
  project_id = var.project_id
}

# -----------------------------------------------
# Cloud Build – IAM for Service Account
# -----------------------------------------------

resource "google_project_iam_member" "cloudbuild_run_admin" {
  project = var.project_id
  role    = "roles/run.admin"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_sa_user" {
  project = var.project_id
  role    = "roles/iam.serviceAccountUser"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_storage_admin" {
  project = var.project_id
  role    = "roles/storage.admin"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudbuild_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${data.google_project.current.number}@cloudbuild.gserviceaccount.com"
}

# -----------------------------------------------
# Cloud Build – Triggers
# -----------------------------------------------

# NOTE: The GitHub connection must be created manually first via Console:
#   https://console.cloud.google.com/cloud-build/triggers → Connect Repository
# After connecting, set the repository resource name in terraform.tfvars:
#   cloudbuild_repo = "projects/PROJECT/locations/REGION/connections/CONNECTION/repositories/REPO"

# Deploy trigger (push to main)
resource "google_cloudbuild_trigger" "deploy" {
  count    = var.cloudbuild_repo != "" ? 1 : 0
  name     = "${local.env_prefix}-deploy"
  location = var.region

  repository_event_config {
    repository = var.cloudbuild_repo
    push {
      branch = var.cloudbuild_branch
    }
  }

  filename = "cloudbuild.yaml"

  substitutions = {
    _REGION          = var.region
    _ENVIRONMENT     = var.environment
    _BACKEND_SERVICE = "${local.env_prefix}-backend"
    _FRONTEND_BUCKET = google_storage_bucket.frontend.name
  }

  depends_on = [google_project_service.apis["cloudbuild.googleapis.com"]]
}

# PR check trigger (only for prod – dev deploys on every push)
resource "google_cloudbuild_trigger" "pr_check" {
  count    = var.cloudbuild_repo != "" && local.is_prod ? 1 : 0
  name     = "${local.env_prefix}-pr-check"
  location = var.region

  repository_event_config {
    repository = var.cloudbuild_repo
    pull_request {
      branch = "^main$"
    }
  }

  filename = "cloudbuild-pr.yaml"

  depends_on = [google_project_service.apis["cloudbuild.googleapis.com"]]
}
