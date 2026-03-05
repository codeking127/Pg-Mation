from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date

class TenantBase(BaseModel):
    name: str
    email: str
    phone: Optional[str] = None
    pg_id: str
    bed_id: Optional[str] = None
    rent_amount: float = 0
    joining_date: date
    emergency_contact: Optional[str] = None

class TenantCreate(TenantBase):
    password: str # For creating the auth user on the fly if needed

class TenantResponse(TenantBase):
    id: str # The user ID (uid) in Firestore
    user_id: str
    pg_name: Optional[str] = None
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    profile_photo: Optional[str] = None
    aadhar_photo: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
