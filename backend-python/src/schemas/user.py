from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr
    role: str = Field(..., description="Role must be ADMIN, OWNER, TENANT, or SECURITY")
    phone: Optional[str] = None
    is_active: bool = True

class UserCreate(UserBase):
    pass # In Firebase, password is handled client-side. We just create the Firestore document.

class UserResponse(UserBase):
    id: str # This will map to the Firebase UID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
