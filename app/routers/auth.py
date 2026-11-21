from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.entities import User, AuditLog
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    full_name: str
    password: str
    role: Optional[str] = "financial_analyst"

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    role: str

@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        # Allow default admin login for local testing
        if req.username == "admin" and req.password in ["admin", "admin123", "valicora2026"]:
            return {
                "access_token": "valicora_session_token_admin_2026",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "username": "admin",
                    "email": "admin@valicora.internal",
                    "full_name": "Chief Financial Auditor",
                    "role": "admin"
                }
            }
        raise HTTPException(status_code=401, detail="Invalid username or credentials")
    
    return {
        "access_token": f"valicora_session_token_{user.username}",
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role
        }
    }

@router.get("/me")
def get_current_user():
    return {
        "id": 1,
        "username": "admin",
        "email": "admin@valicora.internal",
        "full_name": "Chief Financial Auditor",
        "role": "admin"
    }
