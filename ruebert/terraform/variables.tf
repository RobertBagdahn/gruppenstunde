variable "project_id" {
  description = "GCP project (shared with Gruppenstunde for now)"
  type        = string
  default     = "inspi-441320"
}

variable "region" {
  description = "Cloud Run, Artifact Registry and bucket region (same as Gruppenstunde)"
  type        = string
  default     = "europe-west1"
}

variable "github_repository" {
  description = "GitHub repository (owner/name) whose workflows may deploy Rübert via Workload Identity Federation"
  type        = string
  default     = "RobertBagdahn/gruppenstunde"
}

variable "workload_identity_pool" {
  description = "Workload Identity pool created by Gruppenstunde's scripts/setup-github-deploy.sh"
  type        = string
  default     = "github"
}

variable "github_issue_repository" {
  description = "Repository in which the feedback button creates issues"
  type        = string
  default     = "RobertBagdahn/seed-demand"
}

variable "initial_image" {
  description = "Image used only for the first creation of the service; the deploy workflow replaces it"
  type        = string
  default     = "us-docker.pkg.dev/cloudrun/container/hello"
}
