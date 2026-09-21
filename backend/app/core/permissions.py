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
    USER = "USER"

from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.database.session import get_db

bearer_scheme = HTTPBearer(auto_error=False)

def require_roles(*allowed_roles: UserRole):
    def dependency(
        credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
        db: Session = Depends(get_db),
    ) -> "User":
        from app.core.security import get_current_user
        current_user = get_current_user(credentials, db)
        
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions.",
            )
        return current_user

    return dependency
