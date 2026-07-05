"""
Production settings for GCP deployment.
"""

from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F403

# Fail fast if the production secret key was not set — the base.py default
# ("change-me-in-production") must never reach a live deployment.
if SECRET_KEY == "change-me-in-production":
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY is not configured. "
        "Set the environment variable before deploying to production."
    )

DEBUG = env("DEBUG", default="False").lower() in ("true", "1")

APPENGINE_URL = env("APPENGINE_URL", default="https://gruppenstunde.de")
ALLOWED_HOSTS = [
    APPENGINE_URL.replace("https://", "").replace("http://", ""),
    "gruppenstunde.de",
    "www.gruppenstunde.de",
    ".run.app",
]

CSRF_TRUSTED_ORIGINS = [
    APPENGINE_URL,
    "https://inspi-frontend-148679246533.europe-west1.run.app",
    "https://inspi-frontend-food-148679246533.europe-west1.run.app",
    "https://essensplan.app",
    "https://www.essensplan.app",
]

# Security
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "Lax"
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# GCS for media files
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.gcloud.GoogleCloudStorage",
        "OPTIONS": {
            "bucket_name": env("GCS_BUCKET_NAME", default="inspi-media"),
            "querystring_auth": False,
        },
    },
    "staticfiles": {
        "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
    },
}

# Cloud SQL
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", default="inspi"),
        "USER": env("DB_USER", default="inspi"),
        "PASSWORD": env("DB_PASSWORD", default=""),
        "HOST": env("DB_HOST", default=""),
        "PORT": env("DB_PORT", default="5432"),
        "CONN_MAX_AGE": 60,
    }
}

# CORS for production frontend
CORS_ALLOWED_ORIGINS = [
    "https://gruppenstunde.de",
    "https://www.gruppenstunde.de",
    "https://inspi-frontend-148679246533.europe-west1.run.app",
    "https://inspi-frontend-food-148679246533.europe-west1.run.app",
    "https://essensplan.app",
    "https://www.essensplan.app",
]
CORS_ALLOW_CREDENTIALS = True

# Logging – send ALL Django errors to stderr (visible in Cloud Logging)
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
        },
    },
    "root": {
        "handlers": ["console"],
        "level": "INFO",
    },
    "loggers": {
        "django": {
            "handlers": ["console"],
            "level": "INFO",
            "propagate": False,
        },
        "django.request": {
            "handlers": ["console"],
            "level": "ERROR",
            "propagate": False,
        },
    },
}
