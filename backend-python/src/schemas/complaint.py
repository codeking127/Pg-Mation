from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ComplaintBase(BaseModel):
    title: str
    description: str

class ComplaintCreate(ComplaintBase):
    pass

class ComplaintResponse(ComplaintBase):
    id: str
    tenant_id: str
    status: str = "OPEN" # OPEN, IN_PROGRESS, RESOLVED
    tenant_name: Optional[str] = None
    pg_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
