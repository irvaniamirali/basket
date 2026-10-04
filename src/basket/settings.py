from pathlib import Path

import environ
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

env = environ.Env(
    DJANGO_DEBUG=(bool, False),
    ALLOWED_HOSTS=(list, ["localhost", "127.0.0.1"]),
)

env_file = BASE_DIR / ".env"

if env_file.is_file():
    environ.Env.read_env(env_file)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="")

if not SECRET_KEY:
    raise ImproperlyConfigured(
        "DJANGO_SECRET_KEY must be set in the environment or .env file."
    )

DEBUG = env.bool("DJANGO_DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

DATABASE_URL = env("DATABASE_URL", default="")

if not DATABASE_URL:
    raise ImproperlyConfigured(
        "DATABASE_URL must be set in the environment or .env file."
    )

DATABASES = {"default": env.db("DATABASE_URL")}

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "rest_framework.authtoken",
    "apps.core",
    "apps.products",
    "apps.users",
    "apps.cart",
    "apps.orders",
    "apps.payments",
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.TokenAuthentication",
    ],
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 10,
}

ZARINPAL_MERCHANT_ID = env("ZARINPAL_MERCHANT_ID", default="zarinpal")
ZARINPAL_SANDBOX = env.bool("ZARINPAL_SANDBOX", default=DEBUG)
ZARINPAL_CALLBACK_URL = env("ZARINPAL_CALLBACK_URL", default="")
ZARINPAL_TIMEOUT = env.float("ZARINPAL_TIMEOUT", default=10.0)
ZARINPAL_BASE_URL = (
    "https://sandbox.zarinpal.com"
    if ZARINPAL_SANDBOX
    else "https://payment.zarinpal.com"
)

AUTH_USER_MODEL = "users.User"

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "basket.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "basket.wsgi.application"
ASGI_APPLICATION = "basket.asgi.application"

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
