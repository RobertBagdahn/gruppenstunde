"""
Test settings – uses SQLite for fast test runs.
"""

from .base import *  # noqa: F401,F403

DEBUG = False

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}

# Faster password hashing for tests
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.MD5PasswordHasher",
]

# Disable migrations for faster tests
class DisableMigrations:
    def __contains__(self, item: str) -> bool:
        return True

    def __getitem__(self, item: str) -> None:
        return None


MIGRATION_MODULES = DisableMigrations()

# No email sending during tests
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"

DEFAULT_FILE_STORAGE = "django.core.files.storage.InMemoryStorage"
