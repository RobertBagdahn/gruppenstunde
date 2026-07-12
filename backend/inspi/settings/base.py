"""
Django base settings for Inspi project.
Shared between local and production environments.
"""

from pathlib import Path

import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent
env = environ.Env()

# Read .env file if it exists (check backend/ first, then project root)
env_file = BASE_DIR / ".env"
if not env_file.exists():
    env_file = BASE_DIR.parent / ".env"
if env_file.exists():
    env.read_env(str(env_file))

SECRET_KEY = env("DJANGO_SECRET_KEY", default="change-me-in-production")

ALLOWED_HOSTS = env.list("ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

# Application definition
INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django.contrib.sites",
    # Third-party
    "channels",
    "corsheaders",
    "allauth",
    "allauth.account",
    "django_cleanup.apps.CleanupConfig",
    "imagekit",
    # Project apps – core & shared
    "content",
    "supply",
    "core",
    "profiles",
    # Project apps – content types
    "session",
    "blog",
    "game",
    "recipe",
    # Project apps – tools
    "planner",
    "event",
    "packinglist",
    "shopping",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "allauth.account.middleware.AccountMiddleware",
]

ROOT_URLCONF = "inspi.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "inspi.wsgi.application"
ASGI_APPLICATION = "inspi.asgi.application"

# Channel Layers — default in-memory, overridden in production.py for Redis
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer",
    },
}

# Database – overridden in local.py / production.py
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": env("DB_NAME", default="inspi"),
        "USER": env("DB_USER", default="inspi"),
        "PASSWORD": env("DB_PASSWORD", default="inspi"),
        "HOST": env("DB_HOST", default="localhost"),
        "PORT": env("DB_PORT", default="5432"),
    }
}

# Auth
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

AUTHENTICATION_BACKENDS = [
    "django.contrib.auth.backends.ModelBackend",
    "allauth.account.auth_backends.AuthenticationBackend",
]

SITE_ID = 1

# Internationalization
LANGUAGE_CODE = "de-de"
TIME_ZONE = "Europe/Berlin"
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_DIRS = [BASE_DIR / "static"]

# Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# CORS
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=["http://localhost:5173", "http://localhost:5174", "https://shop.rewe.de"],
)
CORS_ALLOW_CREDENTIALS = True

# CSRF – allow frontend origin for session-based auth
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["http://localhost:5173", "http://localhost:5174"])
CSRF_COOKIE_HTTPONLY = False  # allow JS to read CSRF token

# Session
SESSION_COOKIE_SAMESITE = "Lax"

# Django Allauth
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*", "password1*", "password2*"]
ACCOUNT_EMAIL_VERIFICATION = "optional"

# Email Configuration
EMAIL_BACKEND = env("DJANGO_EMAIL_BACKEND", default="django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = env("EMAIL_HOST", default="smtp.gmail.com")
EMAIL_PORT = env.int("EMAIL_PORT", default=587)
EMAIL_USE_TLS = env.bool("EMAIL_USE_TLS", default=True)
EMAIL_HOST_USER = env("EMAIL_HOST_USER", default="inspirator.testmail@gmail.com")
EMAIL_HOST_PASSWORD = env("EMAIL_HOST_PASSWORD", default="")
DEFAULT_FROM_EMAIL = env("DEFAULT_FROM_EMAIL", default="Inspi <inspirator.testmail@gmail.com>")

# Google Cloud / Vertex AI
GOOGLE_CLOUD_PROJECT = env("GOOGLE_CLOUD_PROJECT", default="")
VERTEX_AI_LOCATION = env("VERTEX_AI_LOCATION", default="global")

# Gemini Pricing (Vertex AI Global, USD per 1M tokens, July 2026)
GEMINI_PRICING = {
    "gemini-3.1-flash-lite": {
        "type": "text",
        "input_per_1m_usd": 0.25,
        "output_per_1m_usd": 1.50,
    },
    "gemini-3.1-flash-image-preview": {
        "type": "image",
        "input_per_1m_usd": 0.25,
        "output_per_1m_usd": 1.50,
        "image_output_per_1m_usd": 30.0,
    },
    "gemini-embedding-001": {
        "type": "embedding",
        "input_per_1m_usd": 0.00015,
    },
}
USD_TO_EUR = env.float("USD_TO_EUR", default=0.92)

# Inspi Logo for PDF exports
INSPI_LOGO_PATH = env("INSPI_LOGO_PATH", default=str(BASE_DIR / "static" / "img" / "inspi-logo.png"))

# WhatsApp (neonize)
WHATSAPP_RATE_LIMIT_PER_HOUR = env.int("WHATSAPP_RATE_LIMIT_PER_HOUR", default=50)

# Build neonize PostgreSQL connection string from individual DB env vars
_db = DATABASES["default"]
WHATSAPP_DB_URL = f"postgres://{_db['USER']}:{_db['PASSWORD']}@{_db['HOST']}:{_db['PORT']}/{_db['NAME']}"

# ---------------------------------------------------------------------------
# Ingredient Matching Pipeline — Stage Thresholds
# ---------------------------------------------------------------------------
INGREDIENT_MATCHER_JACCARD_THRESHOLD = env.float("INGREDIENT_MATCHER_JACCARD_THRESHOLD", default=0.90)
INGREDIENT_MATCHER_FUZZY_THRESHOLD = env.float("INGREDIENT_MATCHER_FUZZY_THRESHOLD", default=0.70)
INGREDIENT_MATCHER_EMBEDDING_THRESHOLD = env.float("INGREDIENT_MATCHER_EMBEDDING_THRESHOLD", default=0.50)
INGREDIENT_MATCHER_GREY_ZONE_MIN = env.float("INGREDIENT_MATCHER_GREY_ZONE_MIN", default=0.30)
INGREDIENT_MATCHER_MULTI_MATCH_DIFF = env.float("INGREDIENT_MATCHER_MULTI_MATCH_DIFF", default=0.05)
