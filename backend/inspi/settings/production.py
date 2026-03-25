"""
Production settings for GCP deployment.
"""

import io

from google.cloud import secretmanager

from .base import *  # noqa: F401,F403

DEBUG = False

APPENGINE_URL = env("APPENGINE_URL", default="https://gruppenstunde.de")  # noqa: F405
ALLOWED_HOSTS = [
    APPENGINE_URL.replace("https://", "").replace("http://", ""),
    "gruppenstunde.de",
    "www.gruppenstunde.de",
]

CSRF_TRUSTED_ORIGINS = [APPENGINE_URL]

# Security
SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# GCS for media files
STORAGES = {
    "default": {
        "BACKEND": "storages.backends.gcloud.GoogleCloudStorage",
        "OPTIONS": {
            "bucket_name": env("GCS_BUCKET_NAME", default="gruppenstunde-media"),  # noqa: F405
            "default_acl": "publicRead",
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
        "NAME": env("DB_NAME", default="inspi"),  # noqa: F405
        "USER": env("DB_USER", default="inspi"),  # noqa: F405
        "PASSWORD": env("DB_PASSWORD", default=""),  # noqa: F405
        "HOST": env("DB_HOST", default="/cloudsql/PROJECT_ID:REGION:INSTANCE"),  # noqa: F405
        "PORT": env("DB_PORT", default="5432"),  # noqa: F405
    }
}

# CORS for production frontend
CORS_ALLOWED_ORIGINS = [
    "https://gruppenstunde.de",
    "https://www.gruppenstunde.de",
]
