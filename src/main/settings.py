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
    raise ImproperlyConfigured("DJANGO_SECRET_KEY must be set in the environment or .env file.")

DEBUG = env.bool("DJANGO_DEBUG")
ALLOWED_HOSTS = env.list("ALLOWED_HOSTS")

DATABASE_URL = env("DATABASE_URL", default="")

if not DATABASE_URL:
    raise ImproperlyConfigured("DATABASE_URL must be set in the environment or .env file.")

DATABASES = {"default": env.db("DATABASE_URL")}

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "apps.core",
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

ROOT_URLCONF = "main.urls"

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

WSGI_APPLICATION = "main.wsgi.application"
ASGI_APPLICATION = "main.asgi.application"

LANGUAGE_CODE = "en-us"
TIME_ZONE = env("TIME_ZONE", default="UTC")
USE_I18N = True
USE_TZ = True

STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
