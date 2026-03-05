from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class VisitorBase(BaseModel):
    tenant_id: str
    visitor_name: str
    phone: Optional[str] = None
    purpose: Optional[str] = None

class VisitorCreate(VisitorBase):
    pass

class VisitorResponse(VisitorBase):
    id: str
    tenant_name: Optional[str] = None
    check_in: datetime
    check_out: Optional[datetime] = None
    approved: bool = False
    created_at: datetime

    class Config:
        from_attributes = True
