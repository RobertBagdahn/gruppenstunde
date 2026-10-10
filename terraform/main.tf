# ============================================================
# Inspi – GCP Infrastructure (Terraform)
#
# Resources:
#   - GCP APIs
#   - Artifact Registry
#   - GCS Buckets (frontend, media)
#   - Cloud SQL (PostgreSQL)
#   - Cloud Run Service (backend)
#   - Cloud Build Triggers (deploy + PR check)
#   - IAM bindings
#   - Secret Manager
# ============================================================

locals {
  env_prefix    = var.environment == "prod" ? "inspi" : "inspi-${var.environment}"
  backend_image = "${var.region}-docker.pkg.dev/${var.project_id}/inspi/backend"
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
    "sqladmin.googleapis.com",
    "storage.googleapis.com",
    "iam.googleapis.com",
    "monitoring.googleapis.com",
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

  lifecycle {
    ignore_changes = [location]
  }

  uniform_bucket_level_access = true

  depends_on = [google_project_service.apis["storage.googleapis.com"]]
}

resource "google_storage_bucket_iam_member" "media_public" {
  bucket = google_storage_bucket.media.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
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

locals {
  oauth_providers = toset([for provider, id in var.oauth_client_ids : provider if id != ""])
  oauth_secret_env = {
    google    = "GOOGLE_OAUTH_CLIENT_SECRET"
    microsoft = "MICROSOFT_OAUTH_CLIENT_SECRET"
    facebook  = "FACEBOOK_OAUTH_CLIENT_SECRET"
    apple     = "APPLE_OAUTH_PRIVATE_KEY"
  }
}

resource "google_secret_manager_secret" "oauth" {
  for_each  = local.oauth_providers
  secret_id = "${var.environment}_oauth_${each.key}"

  replication {
    auto {}
  }

  depends_on = [google_project_service.apis["secretmanager.googleapis.com"]]
}

resource "google_secret_manager_secret_version" "oauth" {
  for_each    = local.oauth_providers
  secret      = google_secret_manager_secret.oauth[each.key].id
  secret_data = lookup(var.oauth_client_secrets, each.key, "")
}

resource "google_secret_manager_secret_iam_member" "oauth_accessor" {
  for_each  = local.oauth_providers
  secret_id = google_secret_manager_secret.oauth[each.key].secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.db_password
}

# -----------------------------------------------
# Cloud SQL – PostgreSQL Database
# -----------------------------------------------

resource "google_sql_database_instance" "db" {
  name             = "${local.env_prefix}-db-west1"
  database_version = "POSTGRES_17"
  region           = var.region

  settings {
    tier              = var.db_tier
    edition           = "ENTERPRISE"
    availability_type = "ZONAL"
    disk_size         = 10
    disk_autoresize   = false

    disk_type = "SD_HDD"
    backup_configuration {
      enabled = false
    }

    ip_configuration {
      ipv4_enabled = true
    }
  }

  deletion_protection = local.is_prod

  lifecycle {
    ignore_changes = [settings[0].disk_type]
  }

  depends_on = [google_project_service.apis["sqladmin.googleapis.com"]]
}

resource "google_sql_database" "inspi" {
  name     = "inspi"
  instance = google_sql_database_instance.db.name
}

resource "google_sql_user" "inspi" {
  name     = "inspi"
  instance = google_sql_database_instance.db.name
  password = var.db_password
}

# -----------------------------------------------
# Cloud Run – Backend (Django / Gunicorn)
# -----------------------------------------------

resource "google_cloud_run_v2_service" "backend" {
  name     = "${local.env_prefix}-backend"
  location = var.region

  lifecycle {
    ignore_changes = [template]
  }

  template {
    max_instance_request_concurrency = var.backend_concurrency

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
        value = "/cloudsql/${google_sql_database_instance.db.connection_name}"
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
        name  = "BACKEND_MAX_INSTANCES"
        value = tostring(var.backend_max_instances)
      }
      env {
        name  = "BACKEND_CONCURRENCY"
        value = tostring(var.backend_concurrency)
      }
      env {
        name  = "GUNICORN_WORKERS"
        value = "2"
      }
      env {
        name  = "GUNICORN_THREADS"
        value = "4"
      }
      env {
        name  = "BACKGROUND_WORKERS_PER_PROCESS"
        value = "1"
      }
      env {
        name  = "DB_CONNECTION_RESERVE"
        value = "8"
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
      dynamic "env" {
        for_each = local.oauth_providers
        content {
          name  = "${upper(env.value)}_OAUTH_CLIENT_ID"
          value = var.oauth_client_ids[env.value]
        }
      }
      dynamic "env" {
        for_each = local.oauth_providers
        content {
          name = local.oauth_secret_env[env.value]
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.oauth[env.value].secret_id
              version = "latest"
            }
          }
        }
      }
      env {
        name  = "APPLE_OAUTH_KEY_ID"
        value = var.apple_oauth_key_id
      }
      env {
        name  = "APPLE_OAUTH_TEAM_ID"
        value = var.apple_oauth_team_id
      }

      resources {
        limits = {
          cpu    = var.backend_cpu
          memory = var.backend_memory
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.db.connection_name]
      }
    }

    scaling {
      min_instance_count = 0
      max_instance_count = var.backend_max_instances
    }
  }

  depends_on = [
    google_project_service.apis["run.googleapis.com"],
    google_sql_database_instance.db,
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
# Secret Manager – IAM for Compute Service Account
# -----------------------------------------------

resource "google_secret_manager_secret_iam_member" "db_password_accessor" {
  secret_id = google_secret_manager_secret.db_password.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
}

resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${data.google_project.current.number}-compute@developer.gserviceaccount.com"
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
# Operational capacity alerts
# -----------------------------------------------

resource "google_monitoring_alert_policy" "database_connection_pressure" {
  project      = var.project_id
  display_name = "${local.env_prefix} backend database connection pressure"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Cloud SQL PostgreSQL connections approaching budget"

    condition_threshold {
      filter          = "resource.type = \"cloudsql_database\" AND resource.labels.database_id = \"${google_sql_database_instance.db.connection_name}\" AND metric.type = \"cloudsql.googleapis.com/database/postgresql/num_backends\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.database_connection_warning_threshold
      duration        = "60s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }
    }
  }

  notification_channels = var.monitoring_notification_channels

  documentation {
    mime_type = "text/markdown"
    content   = "Backend request concurrency is budgeted for 8 application DB sessions. Inspect Cloud Run revisions and run `manage.py check_database_capacity` before increasing scaling limits."
  }

  depends_on = [google_project_service.apis["monitoring.googleapis.com"]]
}

resource "google_monitoring_alert_policy" "backend_memory_pressure" {
  project      = var.project_id
  display_name = "${local.env_prefix} backend memory pressure"
  combiner     = "OR"
  enabled      = true

  conditions {
    display_name = "Cloud Run backend memory utilization above 85 percent"

    condition_threshold {
      filter          = "resource.type = \"cloud_run_revision\" AND resource.labels.service_name = \"${local.env_prefix}-backend\" AND metric.type = \"run.googleapis.com/container/memory/utilizations\""
      comparison      = "COMPARISON_GT"
      threshold_value = var.backend_memory_warning_threshold
      duration        = "60s"

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_MAX"
      }
    }
  }

  notification_channels = var.monitoring_notification_channels

  documentation {
    mime_type = "text/markdown"
    content   = "Inspect concurrent ingredient-statistics requests and Cloud Run revision memory limits before raising service capacity."
  }

  depends_on = [google_project_service.apis["monitoring.googleapis.com"]]
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
  location = var.cloudbuild_region

  github {
    owner = "RobertBagdahn"
    name  = "gruppenstunde"
    push {
      branch = var.cloudbuild_branch
    }
  }

  filename = "cloudbuild.yaml"

  substitutions = {
    _REGION                = var.region
    _ENVIRONMENT           = var.environment
    _BACKEND_SERVICE       = "${local.env_prefix}-backend"
    _FRONTEND_BUCKET       = google_storage_bucket.frontend.name
    _BACKEND_MAX_INSTANCES = tostring(var.backend_max_instances)
    _BACKEND_CONCURRENCY   = tostring(var.backend_concurrency)
  }

  depends_on = [google_project_service.apis["cloudbuild.googleapis.com"]]
}

# PR check trigger (only for prod – dev deploys on every push)
resource "google_cloudbuild_trigger" "pr_check" {
  count    = var.cloudbuild_repo != "" && local.is_prod ? 1 : 0
  name     = "${local.env_prefix}-pr-check"
  location = var.cloudbuild_region

  github {
    owner = "RobertBagdahn"
    name  = "gruppenstunde"
    pull_request {
      branch = "^main$"
    }
  }

  filename = "cloudbuild-pr.yaml"

  depends_on = [google_project_service.apis["cloudbuild.googleapis.com"]]
}
