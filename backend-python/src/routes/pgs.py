from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.firebase_setup import db
from core.security import get_current_user
from schemas.pg import PGCreate, PGResponse
from datetime import datetime
from google.cloud.firestore_v1.base_query import FieldFilter

router = APIRouter(prefix="/pgs", tags=["Properties"])

@router.post("/", response_model=PGResponse)
def create_pg(pg: PGCreate, current_user: dict = Depends(get_current_user)):
    user_ref = db.collection("users").document(current_user.get("uid"))
    user_doc = user_ref.get()
    
    if not user_doc.exists or user_doc.to_dict().get("role") not in ["ADMIN", "OWNER"]:
        raise HTTPException(status_code=403, detail="Not authorized to create PGs")

    pg_data = pg.model_dump()
    pg_data["created_at"] = datetime.utcnow()
    pg_data["updated_at"] = datetime.utcnow()
    pg_data["total_beds"] = 0
    pg_data["occupied_beds"] = 0
    pg_data["available_beds"] = 0

    doc_ref = db.collection("pgs").document()
    doc_ref.set(pg_data)

    pg_data["id"] = doc_ref.id
    pg_data["owner_name"] = user_doc.to_dict().get("name")
    return pg_data

@router.get("/")
def get_pgs(owner_id: Optional[str] = None):
    query = db.collection("pgs")
    if owner_id:
        query = query.where(filter=FieldFilter("owner_id", "==", owner_id))
        
    pgs = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        
        # Optionally fetch owner name
        owner_doc = db.collection("users").document(data["owner_id"]).get()
        if owner_doc.exists:
            data["owner_name"] = owner_doc.to_dict().get("name")
            
        pgs.append(data)
    return {"pgs": pgs}

@router.delete("/{pg_id}")
def delete_pg(pg_id: str, current_user: dict = Depends(get_current_user)):
    doc_ref = db.collection("pgs").document(pg_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="PG not found")
        
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    role = user_doc.to_dict().get("role")
    
    if role != "ADMIN" and doc.to_dict().get("owner_id") != current_user.get("uid"):
        raise HTTPException(status_code=403, detail="Not authorized to delete this PG")
        
    doc_ref.delete()
    return {"message": "PG deleted successfully"}
