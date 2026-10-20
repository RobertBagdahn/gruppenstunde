output "service_url" {
  description = "Cloud Run URL (behind IAP once the pipeline has enabled it)"
  value       = google_cloud_run_v2_service.ruebert.uri
}

output "image_repository" {
  description = "Artifact Registry path for the Rübert images"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.ruebert.repository_id}/ruebert"
}

output "data_bucket" {
  description = "Bucket for the v1 database (upload by hand, see docs/DEPLOY.md)"
  value       = google_storage_bucket.data.name
}

output "deployer_service_account" {
  description = "Service account GitHub Actions impersonates to deploy Rübert"
  value       = google_service_account.deployer.email
}

output "github_token_secret" {
  description = "Secret that holds the GitHub token for the feedback button"
  value       = google_secret_manager_secret.github_token.secret_id
}
