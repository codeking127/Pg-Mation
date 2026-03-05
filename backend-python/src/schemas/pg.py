from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PGBase(BaseModel):
    name: str = Field(..., max_length=150)
    address: str
    owner_id: str
    city: Optional[str] = None
    pincode: Optional[str] = None
    amenities: Optional[list[str]] = None
    total_capacity: int = 0

class PGCreate(PGBase):
    pass

class PGResponse(PGBase):
    id: str
    owner_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    total_beds: int = 0
    occupied_beds: int = 0
    available_beds: int = 0

    class Config:
        from_attributes = True
