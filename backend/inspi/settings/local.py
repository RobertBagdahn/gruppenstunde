"""
Local development settings.
"""

from .base import *  # noqa: F401,F403

DEBUG = True

INSTALLED_APPS += [  # noqa: F405
    "debug_toolbar",
]

MIDDLEWARE.insert(0, "debug_toolbar.middleware.DebugToolbarMiddleware")  # noqa: F405

INTERNAL_IPS = ["127.0.0.1"]

# Local media storage — outside project dir to avoid triggering StatReloader
import os

MEDIA_ROOT = "/tmp/inspi-media/"
os.makedirs(MEDIA_ROOT, exist_ok=True)

DEFAULT_FILE_STORAGE = "django.core.files.storage.FileSystemStorage"

# Use console backend for emails locally if no App Password is provided
if not env("EMAIL_HOST_PASSWORD", default=None):
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

