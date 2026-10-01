"""Transitional e-mail/password registration (see AUTH_PASSWORD_LOGIN_ENABLED)."""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction

from core.errors import ApiError


def register_password_user(email: str, password1: str, password2: str) -> Any:
    email = email.strip().lower()
    try:
        validate_email(email)
    except ValidationError:
        raise ApiError(422, "invalid_input", "Bitte gib eine gültige E-Mail-Adresse ein.") from None
    if password1 != password2:
        raise ApiError(400, "password_mismatch", "Die Passwörter stimmen nicht überein.")
    user_model = get_user_model()
    if user_model._default_manager.filter(email__iexact=email).exists():
        raise ApiError(
            400,
            "email_taken",
            "Diese E-Mail-Adresse ist bereits registriert. Melde dich an oder nutze einen Anmeldeanbieter.",
        )
    candidate = user_model(username=email, email=email)
    try:
        validate_password(password1, user=candidate)
    except ValidationError as exc:
        raise ApiError(400, "weak_password", " ".join(str(message) for message in exc.messages)) from None

    from profiles.models import UserProfile

    # Explicit Atomic instance: the `transaction.atomic` overloads confuse type checkers.
    with transaction.Atomic(using=None, savepoint=True, durable=False):
        user = user_model._default_manager.create_user(username=email, email=email, password=password1)
        UserProfile._default_manager.get_or_create(user=user)
    return user
