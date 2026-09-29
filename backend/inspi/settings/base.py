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
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.socialaccount.providers.apple",
    "allauth.socialaccount.providers.microsoft",
    "allauth.socialaccount.providers.facebook",
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
    "core.middleware.AiRequestContextMiddleware",
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

# Session — long-lived so visitors stay signed in; sliding expiry on every request.
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 30
SESSION_SAVE_EVERY_REQUEST = True

# The frontends proxy /api/ and set X-Forwarded-Host so OAuth callback URLs and
# redirects use the visitor's domain (gruppenstunde.de / essensplan.app / localhost).
USE_X_FORWARDED_HOST = True

# Django Allauth — social login only. Local password signup/login is closed via
# the account adapter; ModelBackend stays for the /admin/ emergency login.
SOCIALACCOUNT_ONLY = True
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*"]
ACCOUNT_EMAIL_VERIFICATION = "none"
ACCOUNT_UNIQUE_EMAIL = True
ACCOUNT_ADAPTER = "core.auth.adapters.NoPasswordAccountAdapter"
ACCOUNT_DEFAULT_HTTP_PROTOCOL = env("ACCOUNT_DEFAULT_HTTP_PROTOCOL", default="http")
SOCIALACCOUNT_ADAPTER = "core.auth.adapters.SocialAccountAdapter"
SOCIALACCOUNT_AUTO_SIGNUP = True
SOCIALACCOUNT_EMAIL_REQUIRED = True
SOCIALACCOUNT_EMAIL_VERIFICATION = "none"
SOCIALACCOUNT_EMAIL_AUTHENTICATION = True
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = True
SOCIALACCOUNT_LOGIN_ON_GET = False
SOCIALACCOUNT_STORE_TOKENS = False
SOCIALACCOUNT_QUERY_EMAIL = True
LOGIN_REDIRECT_URL = "/"
# Where allauth sends users on errors; the SPA renders the message.
FRONTEND_LOGIN_URL = "/login"
FRONTEND_ACCOUNT_URL = "/profile/account"

# Only providers with configured credentials are offered (see core.auth.providers).
SOCIALACCOUNT_PROVIDERS = {
    "google": {
        "SCOPE": ["profile", "email"],
        "AUTH_PARAMS": {"prompt": "select_account"},
        "OAUTH_PKCE_ENABLED": True,
        "APPS": [
            {
                "client_id": env("GOOGLE_OAUTH_CLIENT_ID", default=""),
                "secret": env("GOOGLE_OAUTH_CLIENT_SECRET", default=""),
            }
        ],
    },
    "microsoft": {
        "TENANT": "common",
        "SCOPE": ["User.Read", "openid", "email", "profile"],
        "APPS": [
            {
                "client_id": env("MICROSOFT_OAUTH_CLIENT_ID", default=""),
                "secret": env("MICROSOFT_OAUTH_CLIENT_SECRET", default=""),
            }
        ],
    },
    "apple": {
        "APPS": [
            {
                "client_id": env("APPLE_OAUTH_CLIENT_ID", default=""),
                "secret": env("APPLE_OAUTH_KEY_ID", default=""),
                "key": env("APPLE_OAUTH_TEAM_ID", default=""),
                "settings": {"certificate_key": env("APPLE_OAUTH_PRIVATE_KEY", default="")},
            }
        ],
    },
    "facebook": {
        "METHOD": "oauth2",
        "SCOPE": ["email", "public_profile"],
        "FIELDS": ["id", "email", "first_name", "last_name", "name"],
        # Facebook does not guarantee verified emails: never auto-connect by email.
        "VERIFIED_EMAIL": False,
        "EMAIL_AUTHENTICATION": False,
        "APPS": [
            {
                "client_id": env("FACEBOOK_OAUTH_CLIENT_ID", default=""),
                "secret": env("FACEBOOK_OAUTH_CLIENT_SECRET", default=""),
            }
        ],
    },
}
# Drop unconfigured apps so allauth never builds a login URL without credentials.
for _provider_config in SOCIALACCOUNT_PROVIDERS.values():
    _provider_config["APPS"] = [app for app in _provider_config["APPS"] if app["client_id"]]

# Dev login (local + tests only). production.py refuses to start if enabled.
AUTH_DEV_LOGIN_ENABLED = env.bool("AUTH_DEV_LOGIN_ENABLED", default=False)

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

# Gemini Pricing (Vertex AI Global / Flex, USD per 1M tokens, July 2026)
GEMINI_PRICING = {
    "gemini-3.5-flash-lite": {
        "type": "text",
        "input_per_1m_usd": 0.25,
        "output_per_1m_usd": 1.50,
    },
    "gemini-3.1-flash-image": {
        "type": "image",
        "input_per_1m_usd": 0.25,
        "output_per_1m_usd": 1.50,
        "image_output_per_1m_usd": 30.0,
    },
    "gemini-embedding-001": {
        "type": "embedding",
        "input_per_1m_usd": 0.15,
    },
}
USD_TO_EUR = env.float("USD_TO_EUR", default=0.92)

# AI budgets (EUR), enforced in core.services.ai_budget across all instances via the DB.
AI_BUDGET_ANONYMOUS_EUR_PER_HOUR = env.float("AI_BUDGET_ANONYMOUS_EUR_PER_HOUR", default=0.05)
AI_BUDGET_ANONYMOUS_VISITOR_EUR_PER_HOUR = env.float("AI_BUDGET_ANONYMOUS_VISITOR_EUR_PER_HOUR", default=0.02)
AI_BUDGET_USER_EUR_PER_DAY = env.float("AI_BUDGET_USER_EUR_PER_DAY", default=0.30)
AI_BUDGET_STAFF_EUR_PER_DAY = env.float("AI_BUDGET_STAFF_EUR_PER_DAY", default=3.00)
AI_ANONYMOUS_MAX_OUTPUT_TOKENS = env.int("AI_ANONYMOUS_MAX_OUTPUT_TOKENS", default=4096)
AI_ANONYMOUS_MAX_INPUT_CHARS = env.int("AI_ANONYMOUS_MAX_INPUT_CHARS", default=8000)
# Number of trailing X-Forwarded-For entries appended by our own proxies
# (Cloud Run front end → nginx → Cloud Run front end). 0 = use REMOTE_ADDR.
AI_CLIENT_IP_TRUSTED_HOPS = env.int("AI_CLIENT_IP_TRUSTED_HOPS", default=0)

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

# ---------------------------------------------------------------------------
# Portion repair (AI-assisted data quality)
# ---------------------------------------------------------------------------
PORTION_REPAIR_MIN_CONFIDENCE = env.float("PORTION_REPAIR_MIN_CONFIDENCE", default=0.90)
