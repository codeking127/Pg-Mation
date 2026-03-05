from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ApplicationBase(BaseModel):
    pg_id: str
    message: Optional[str] = Field(None, max_length=500)

class ApplicationCreate(ApplicationBase):
    pass

class ApplicationResponse(ApplicationBase):
    id: str
    tenant_id: str
    tenant_name: Optional[str] = None
    pg_name: Optional[str] = None
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None
    status: str = "PENDING" # PENDING, APPROVED, REJECTED
    room_number: Optional[str] = None
    bed_number: Optional[str] = None
    rent_amount: Optional[float] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True
