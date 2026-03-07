from fastapi import APIRouter, Depends, HTTPException, status, Body
from typing import List, Optional
from core.firebase_setup import db
from core.security import get_current_user
from schemas.complaint import ComplaintCreate, ComplaintResponse
from datetime import datetime
from pydantic import BaseModel

class StatusUpdate(BaseModel):
    status: str

router = APIRouter(prefix="/complaints", tags=["Complaints"])

@router.post("", response_model=ComplaintResponse)
def create_complaint(complaint: ComplaintCreate, current_user: dict = Depends(get_current_user)):
    user_uid = current_user.get("uid")
    
    comp_data = complaint.model_dump()
    comp_data["tenant_id"] = user_uid
    comp_data["status"] = "OPEN"
    comp_data["created_at"] = datetime.utcnow()
    comp_data["updated_at"] = datetime.utcnow()

    tenant_doc = db.collection("tenants").document(user_uid).get()
    if tenant_doc.exists:
        t_data = tenant_doc.to_dict()
        comp_data["tenant_name"] = t_data.get("name")
        pg_doc = db.collection("pgs").document(t_data.get("pg_id", "")).get()
        if pg_doc.exists:
            comp_data["pg_name"] = pg_doc.to_dict().get("name")

    doc_ref = db.collection("complaints").document()
    doc_ref.set(comp_data)

    comp_data["id"] = doc_ref.id
    return comp_data

@router.get("")
def get_complaints(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    role = user_doc.to_dict().get("role") if user_doc.exists else None

    query = db.collection("complaints").order_by("created_at", direction="DESCENDING")
    
    if status:
        from google.cloud.firestore_v1.base_query import FieldFilter
        query = query.where(filter=FieldFilter("status", "==", status))
        
    owner_pg_ids = []
    if role == "OWNER":
        from google.cloud.firestore_v1.base_query import FieldFilter
        owner_pgs = db.collection("pgs").where(filter=FieldFilter("owner_id", "==", current_user.get("uid"))).stream()
        owner_pg_ids = [p.id for p in owner_pgs]
        if not owner_pg_ids:
            return {"complaints": []}
            
    comps = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        
        # Determine if this belongs to owner's PG (we need tenant's pg_id)
        tenant_id = data.get("tenant_id")
        t_doc = db.collection("tenants").document(tenant_id).get() if tenant_id else None
        
        pg_id = t_doc.to_dict().get("pg_id") if t_doc and t_doc.exists else None
        
        if role == "OWNER" and pg_id not in owner_pg_ids:
            continue
            
        # Hydrate for old records
        if "tenant_name" not in data:
            t_doc = db.collection("tenants").document(data.get("tenant_id", "")).get()
            if t_doc.exists:
                t_data = t_doc.to_dict()
                data["tenant_name"] = t_data.get("name")
                p_doc = db.collection("pgs").document(t_data.get("pg_id", "")).get()
                if p_doc.exists:
                    data["pg_name"] = p_doc.to_dict().get("name")
                    
        comps.append(data)
    return {"complaints": comps}

@router.patch("/{id}/status")
def update_status(id: str, payload: StatusUpdate, current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    if user_doc.to_dict().get("role") not in ["ADMIN", "OWNER"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    doc_ref = db.collection("complaints").document(id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Complaint not found")
        
    doc_ref.update({"status": payload.status, "updated_at": datetime.utcnow()})
    return {"message": "Status updated"}
