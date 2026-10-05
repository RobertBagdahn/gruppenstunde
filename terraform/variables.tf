# ============================================================
# Variables
# ============================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "europe-west3"
}

variable "environment" {
  description = "Environment name: dev or prod"
  type        = string
  default     = "prod"

  validation {
    condition     = contains(["dev", "prod"], var.environment)
    error_message = "environment must be 'dev' or 'prod'"
  }
}

variable "db_password" {
  description = "PostgreSQL password for the inspi-db Cloud Run service"
  type        = string
  sensitive   = true
}

variable "domain" {
  description = "Primary domain for the application"
  type        = string
  default     = "gruppenstunde.de"
}

variable "cloudbuild_repo" {
  description = "Cloud Build GitHub repository resource name. Create the connection via Console first, then set this. Format: projects/PROJECT/locations/REGION/connections/CONNECTION/repositories/REPO"
  type        = string
  default     = ""
}

variable "cloudbuild_branch" {
  description = "Branch pattern for Cloud Build deploy trigger"
  type        = string
  default     = "^main$"
}

variable "backend_max_instances" {
  description = "Max Cloud Run instances for the backend"
  type        = number
  default     = 10
}

variable "backend_cpu" {
  description = "CPU allocation for backend Cloud Run service"
  type        = string
  default     = "1"
}

variable "backend_memory" {
  description = "Memory allocation for backend Cloud Run service"
  type        = string
  default     = "1Gi"
}

variable "cloudbuild_region" {
  description = "Cloud Build region (must match GitHub connection region)"
  type        = string
  default     = "europe-west3"
}

variable "db_tier" {
  description = "Cloud SQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

# -----------------------------------------------
# Social login (OAuth). Providers without client id are not offered.
# Redirect URIs to register per provider and domain:
#   https://<domain>/api/accounts/<provider>/login/callback/
# -----------------------------------------------

variable "oauth_client_ids" {
  description = "Public OAuth client ids per provider (google, microsoft, apple, facebook); empty = disabled"
  type        = map(string)
  default     = {}
}

variable "oauth_client_secrets" {
  description = "OAuth client secrets per provider (apple: private key PEM)"
  type        = map(string)
  default     = {}
  sensitive   = true
}

variable "apple_oauth_key_id" {
  description = "Apple Sign in key id (only needed when apple is enabled)"
  type        = string
  default     = ""
}

variable "apple_oauth_team_id" {
  description = "Apple developer team id (only needed when apple is enabled)"
  type        = string
  default     = ""
}
