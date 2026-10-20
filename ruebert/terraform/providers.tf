terraform {
  required_version = ">= 1.5"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }

  # Same state bucket as Gruppenstunde, own prefix. Init: tofu init
  backend "gcs" {
    bucket = "inspi-terraform-state"
    prefix = "terraform/ruebert"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
