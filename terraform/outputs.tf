# ============================================================
# Outputs
# ============================================================

output "environment" {
  description = "Current environment (dev or prod)"
  value       = var.environment
}

output "backend_url" {
  description = "Cloud Run URL for the backend service"
  value       = google_cloud_run_v2_service.backend.uri
}

output "db_url" {
  description = "Cloud Run URL for the database service"
  value       = google_cloud_run_v2_service.db.uri
}

output "frontend_bucket" {
  description = "GCS bucket for frontend static files"
  value       = google_storage_bucket.frontend.url
}

output "media_bucket" {
  description = "GCS bucket for media uploads"
  value       = google_storage_bucket.media.url
}

output "artifact_registry" {
  description = "Artifact Registry repository URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.inspi.repository_id}"
}
