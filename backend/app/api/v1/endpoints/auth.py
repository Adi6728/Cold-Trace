from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_current_user, hash_password
from app.core.permissions import UserRole
from app.database.session import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse
from app.services.auth_service import authenticate_user, create_token_for_user, find_user_by_email

from app.models.organization import Organization
import re
from sqlalchemy import select

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        user = authenticate_user(db, payload.email, payload.password)
    except HTTPException:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password.")

    token = create_token_for_user(user)
    return TokenResponse(access_token=token, token_type="bearer", expires_in=30 * 60)


@router.get("/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return UserResponse.model_validate(current_user)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    if payload.role == UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Public registration for ADMIN is forbidden."
        )

    org_id = None
    if payload.role != UserRole.USER:
        if not settings.ADMIN_REGISTRATION_KEY or payload.admin_registration_key != settings.ADMIN_REGISTRATION_KEY:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid or missing admin registration key."
            )
            
        if not payload.organization_name:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Organization name is required for privileged roles."
            )
            
        slug = re.sub(r'[^a-z0-9]+', '-', payload.organization_name.lower()).strip('-')
        if not slug:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Invalid organization name."
            )
            
        org = db.scalars(select(Organization).where(Organization.slug == slug)).first()
        if not org:
            org = Organization(name=payload.organization_name, slug=slug)
            db.add(org)
            db.flush()
        
        org_id = org.id

    existing = find_user_by_email(db, payload.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this email already exists."
        )

    user = User(
        email=payload.email.lower(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=True,
        organization_id=org_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return UserResponse.model_validate(user)
