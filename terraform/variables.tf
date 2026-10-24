# ============================================================
# Variables
# ============================================================

variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "Cloud SQL, Cloud Run and Artifact Registry region"
  type        = string
  default     = "europe-west1"
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

variable "backend_max_instances" {
  description = "Maximum backend instances, bounded by the Cloud SQL connection budget"
  type        = number
  default     = 3

  validation {
    condition     = var.backend_max_instances >= 1
    error_message = "backend_max_instances must be at least 1."
  }
}

variable "backend_concurrency" {
  description = "Maximum simultaneous requests per backend instance; PDF renders are serialized in-process by a semaphore"
  type        = number
  default     = 4

  validation {
    condition     = var.backend_concurrency >= 1 && var.backend_concurrency <= 80
    error_message = "backend_concurrency must be between 1 and 80."
  }
}

variable "backend_gunicorn_workers" {
  description = "Gunicorn worker processes per backend instance"
  type        = number
  default     = 1

  validation {
    condition     = var.backend_gunicorn_workers >= 1
    error_message = "backend_gunicorn_workers must be at least 1."
  }
}

variable "backend_gunicorn_threads" {
  description = "Gunicorn threads per worker process"
  type        = number
  default     = 4

  validation {
    condition     = var.backend_gunicorn_threads >= 1
    error_message = "backend_gunicorn_threads must be at least 1."
  }
}

variable "database_connection_warning_threshold" {
  description = "Cloud SQL backend connection count that should raise an operator alert"
  type        = number
  default     = 7
}

variable "backend_memory_warning_threshold" {
  description = "Cloud Run memory utilization ratio that should raise an operator alert"
  type        = number
  default     = 0.85

  validation {
    condition     = var.backend_memory_warning_threshold > 0 && var.backend_memory_warning_threshold < 1
    error_message = "backend_memory_warning_threshold must be between 0 and 1."
  }
}

variable "backend_429_warning_threshold" {
  description = "Number of HTTP 429 responses from the backend within 5 minutes that should raise an operator alert"
  type        = number
  default     = 5

  validation {
    condition     = var.backend_429_warning_threshold >= 0
    error_message = "backend_429_warning_threshold must be zero or greater."
  }
}

variable "backend_latency_p95_warning_ms" {
  description = "Backend p95 request latency in milliseconds that should raise an operator alert when sustained for 10 minutes"
  type        = number
  default     = 5000

  validation {
    condition     = var.backend_latency_p95_warning_ms > 0
    error_message = "backend_latency_p95_warning_ms must be greater than 0."
  }
}

variable "uptime_check_host" {
  description = "Public host probed by the uptime check on /api/auth/providers/"
  type        = string
  default     = "essensplan.app"
}

variable "monitoring_notification_channels" {
  description = "Optional Cloud Monitoring notification channel resource names"
  type        = list(string)
  default     = []
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

variable "management_job_name" {
  description = "Cloud Run job that runs Django management commands (image updated by every deploy)"
  type        = string
  default     = "inspi-migrate"
}

variable "ingredient_quantity_stats_schedule" {
  description = "Cron schedule (Europe/Berlin) for recalculating the ingredient quantity baseline"
  type        = string
  default     = "30 3 * * *"
}
