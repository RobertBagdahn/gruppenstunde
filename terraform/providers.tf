terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  backend "gcs" {
    bucket = "inspi-terraform-state"
    # prefix is set per environment via -backend-config or init:
    #   tofu init -backend-config="prefix=terraform/dev"
    #   tofu init -backend-config="prefix=terraform/prod"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
