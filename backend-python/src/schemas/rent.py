from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class RentInvoiceBase(BaseModel):
    tenant_id: str
    amount: float
    month_year: str # e.g. "2025-03"
    due_date: date

class RentInvoiceCreate(RentInvoiceBase):
    pass

class RentInvoiceResponse(RentInvoiceBase):
    id: str
    paid: bool = False
    paid_at: Optional[datetime] = None
    tenant_name: Optional[str] = None
    pg_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
