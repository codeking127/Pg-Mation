from fastapi import APIRouter, Depends, HTTPException
from typing import List
from core.firebase_setup import db
from core.security import get_current_user
from schemas.visitor import VisitorCreate, VisitorResponse
from datetime import datetime
from pydantic import BaseModel

class ApproveRequest(BaseModel):
    approved: bool

router = APIRouter(prefix="/visitors", tags=["Visitors"])

@router.post("", response_model=VisitorResponse)
def create_visitor(visitor: VisitorCreate, current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    
    tenant_doc = db.collection("tenants").document(visitor.tenant_id).get()
    if not tenant_doc.exists:
        raise HTTPException(status_code=404, detail="Tenant not found")

    vis_data = visitor.model_dump()
    vis_data["check_in"] = datetime.utcnow()
    vis_data["approved"] = False
    vis_data["check_out"] = None
    vis_data["created_at"] = datetime.utcnow()

    doc_ref = db.collection("visitors").document()
    doc_ref.set(vis_data)

    vis_data["id"] = doc_ref.id
    vis_data["tenant_name"] = tenant_doc.to_dict().get("name")
    return vis_data

@router.get("")
def get_visitors(current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    role = user_doc.to_dict().get("role") if user_doc.exists else None

    query = db.collection("visitors").order_by("check_in", direction="DESCENDING")
    
    owner_pg_ids = []
    if role == "OWNER":
        from google.cloud.firestore_v1.base_query import FieldFilter
        owner_pgs = db.collection("pgs").where(filter=FieldFilter("owner_id", "==", current_user.get("uid"))).stream()
        owner_pg_ids = [p.id for p in owner_pgs]
        if not owner_pg_ids:
            return {"visitors": []}
            
    visitors = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        
        # Determine if this belongs to owner's PG
        tenant_id = data.get("tenant_id")
        t_doc = db.collection("tenants").document(tenant_id).get() if tenant_id else None
        pg_id = t_doc.to_dict().get("pg_id") if t_doc and t_doc.exists else None
        
        if role == "OWNER" and pg_id not in owner_pg_ids:
            continue
            
        
        # hydrate tenant
        tenant_doc = db.collection("tenants").document(data.get("tenant_id")).get()
        if tenant_doc.exists:
            data["tenant_name"] = tenant_doc.to_dict().get("name")
            
        visitors.append(data)
    return {"visitors": visitors}

@router.patch("/{id}/approve")
def approve_visitor(id: str, payload: ApproveRequest, current_user: dict = Depends(get_current_user)):
    doc_ref = db.collection("visitors").document(id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Visitor not found")
        
    doc_ref.update({"approved": payload.approved})
    action = "approved" if payload.approved else "rejected"
    return {"message": f"Visitor {action}"}

@router.patch("/{id}/checkout")
def checkout_visitor(id: str, current_user: dict = Depends(get_current_user)):
    doc_ref = db.collection("visitors").document(id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Visitor not found")
        
    doc_ref.update({"check_out": datetime.utcnow()})
    return {"message": "Visitor checked out"}
