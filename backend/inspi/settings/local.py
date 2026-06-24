"""
Local development settings.
"""

from .base import *  # noqa: F403

DEBUG = True

INSTALLED_APPS += [
    "debug_toolbar",
]

MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")

INTERNAL_IPS = ["127.0.0.1"]

# Local media storage — outside project dir to avoid triggering StatReloader
import os

MEDIA_ROOT = "/tmp/inspi-media/"
os.makedirs(MEDIA_ROOT, exist_ok=True)

DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# Use console backend for emails locally if no App Password is provided
if not env("EMAIL_HOST_PASSWORD", default=None):
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
