from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class RoomBase(BaseModel):
    pg_id: str
    room_number: str = Field(..., max_length=20)
    floor: int = 1
    total_beds: int = 1

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    id: str
    beds: Optional[list] = None
    created_at: datetime

    class Config:
        from_attributes = True

class BedBase(BaseModel):
    room_id: str
    bed_number: str = Field(..., max_length=10)
    status: str = "AVAILABLE" # AVAILABLE, OCCUPIED
    tenant_id: Optional[str] = None

class BedCreate(BedBase):
    pass

class BedResponse(BedBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True
