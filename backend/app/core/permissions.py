from __future__ import annotations

from enum import Enum
from typing import TYPE_CHECKING

from fastapi import Depends, HTTPException, status

if TYPE_CHECKING:
    from app.models.user import User


class UserRole(str, Enum):
    ADMIN = "ADMIN"
    MANUFACTURER = "MANUFACTURER"
    LOGISTICS = "LOGISTICS"
    WAREHOUSE = "WAREHOUSE"
    HOSPITAL = "HOSPITAL"
    AUDITOR = "AUDITOR"


def _get_current_user():
    from app.core.security import get_current_user

    return get_current_user()


def require_roles(*allowed_roles: UserRole):
    def dependency(current_user: "User" = Depends(_get_current_user)) -> "User":
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )
        return current_user

    return dependency
