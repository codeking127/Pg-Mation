from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from core.firebase_setup import db
from core.security import get_current_user
from schemas.complaint import ComplaintCreate, ComplaintResponse
from datetime import datetime

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.post("/", response_model=ComplaintResponse)
def create_complaint(complaint: ComplaintCreate, current_user: dict = Depends(get_current_user)):
    user_uid = current_user.get("uid")
    
    comp_data = complaint.model_dump()
    comp_data["tenant_id"] = user_uid
    comp_data["status"] = "OPEN"
    comp_data["created_at"] = datetime.utcnow()
    comp_data["updated_at"] = datetime.utcnow()

    doc_ref = db.collection("complaints").document()
    doc_ref.set(comp_data)

    comp_data["id"] = doc_ref.id
    return comp_data

@router.get("/", response_model=List[ComplaintResponse])
def get_complaints():
    query = db.collection("complaints").order_by("created_at", direction="DESCENDING")
    
    comps = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        comps.append(data)
    return comps

@router.patch("/{id}/status")
def update_status(id: str, status: str, current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    if user_doc.to_dict().get("role") not in ["ADMIN", "OWNER"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    doc_ref = db.collection("complaints").document(id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    doc_ref.update({"status": status, "updated_at": datetime.utcnow()})
    return {"message": "Status updated"}
