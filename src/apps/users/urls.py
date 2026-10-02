from django.urls import path

from apps.users.views import LogoutView, ProfileView, RegistrationView, token_view

app_name = "users"

urlpatterns = [
    path("register/", RegistrationView.as_view(), name="register"),
    path("token/", token_view, name="token"),
    path("me/", ProfileView.as_view(), name="profile"),
    path("logout/", LogoutView.as_view(), name="logout"),
]
