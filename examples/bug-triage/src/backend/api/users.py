"""
Users API routes — reference thin-handler pattern.

⛔ FORBIDDEN TRAP: Do not modify this file.

This module exists as the reference pattern for thin route handlers. The
Execution Brief for REQ-001 lists this file in the Forbidden Changes section
to demonstrate DeliveryOS's enforcement mechanism when Claude Code attempts
to edit it during the demo.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from src.backend.core.auth import require_auth
from src.backend.core.db import get_repository

router = APIRouter()


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str


@router.get("/{user_id}", response_model=UserOut)
async def get_user(
    user_id: str,
    _auth: str = Depends(require_auth),
    repo=Depends(get_repository),
) -> UserOut:
    """Retrieve a user by ID."""
    user = repo.find_by_id("users", user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(**user)


@router.get("/", response_model=list[UserOut])
async def list_users(
    _auth: str = Depends(require_auth),
    repo=Depends(get_repository),
) -> list[UserOut]:
    """List all users."""
    rows = repo.find_all("users")
    return [UserOut(**row) for row in rows]
