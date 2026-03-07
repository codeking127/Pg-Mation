from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from core.firebase_setup import db
from core.security import get_current_user
from schemas.room import RoomCreate, RoomResponse, BedCreate, BedResponse
from datetime import datetime

router = APIRouter(prefix="/rooms", tags=["Rooms & Beds"])

@router.post("/", response_model=RoomResponse)
def create_room(room: RoomCreate, current_user: dict = Depends(get_current_user)):
    # Verify owner
    pg_doc = db.collection("pgs").document(room.pg_id).get()
    if not pg_doc.exists:
        raise HTTPException(status_code=404, detail="PG not found")
        
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    if pg_doc.to_dict().get("owner_id") != current_user.get("uid") and user_doc.to_dict().get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")

    room_data = room.model_dump()
    room_data["created_at"] = datetime.utcnow()

    # Firestore structure: /pgs/{pg_id}/rooms/{room_id}
    room_ref = db.collection("pgs").document(room.pg_id).collection("rooms").document()
    room_ref.set(room_data)

    room_data["id"] = room_ref.id
    
    # Auto-generate beds for this room
    batch = db.batch()
    for i in range(1, room.total_beds + 1):
        bed_ref = room_ref.collection("beds").document()
        bed_data = {
            "room_id": room_ref.id,
            "bed_number": f"B{i}",
            "status": "AVAILABLE",
            "tenant_id": None,
            "created_at": datetime.utcnow()
        }
        batch.set(bed_ref, bed_data)
        
    batch.commit()
    
    # Update PG total capacity
    db.collection("pgs").document(room.pg_id).update({
        "total_beds": pg_doc.to_dict().get("total_beds", 0) + room.total_beds,
        "available_beds": pg_doc.to_dict().get("available_beds", 0) + room.total_beds
    })

    return room_data

@router.get("/{pg_id}")
def get_rooms(pg_id: str):
    rooms_query = db.collection("pgs").document(pg_id).collection("rooms").stream()
    rooms = []
    
    for doc in rooms_query:
        r_data = doc.to_dict()
        r_data["id"] = doc.id
        
        # Fetch beds inside the room subcollection
        beds_query = doc.reference.collection("beds").stream()
        r_data["beds"] = [{"id": b.id, **b.to_dict()} for b in beds_query]
        
        rooms.append(r_data)
        
    return {"rooms": rooms}

@router.post("/beds", response_model=BedResponse)
def create_bed(bed: BedCreate, current_user: dict = Depends(get_current_user)):
    # Find the room to put the bed in. 
    # Since room is a subcollection of PG, we need the PG ID or search group collection.
    # In Firestore, it's easier if bed payload includes pg_id, or we do a collection group query.
    pass # Implementation requires either querying rooms across all PGs or passing pg_id.

@router.get("/{pg_id}/available-beds")
def get_available_beds(pg_id: str):
    rooms_query = db.collection("pgs").document(pg_id).collection("rooms").stream()
    beds = []
    
    for r_doc in rooms_query:
        room_data = r_doc.to_dict()
        beds_query = r_doc.reference.collection("beds").where("status", "==", "AVAILABLE").stream()
        
        for b_doc in beds_query:
            b_data = b_doc.to_dict()
            b_data["id"] = b_doc.id
            b_data["room_number"] = room_data.get("room_number")
            beds.append(b_data)
            
    return {"beds": beds}
