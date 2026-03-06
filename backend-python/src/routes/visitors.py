from fastapi import APIRouter, Depends, HTTPException
from typing import List
from core.firebase_setup import db
from core.security import get_current_user
from schemas.visitor import VisitorCreate, VisitorResponse
from datetime import datetime

router = APIRouter(prefix="/visitors", tags=["Visitors"])

@router.post("", response_model=VisitorResponse)
def create_visitor(visitor: VisitorCreate, current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    
    tenant_doc = db.collection("tenants").document(visitor.tenant_id).get()
    if not tenant_doc.exists:
        raise HTTPException(status_code=404, detail="Tenant not found")

    vis_data = visitor.model_dump()
    from datetime import timezone
    vis_data["check_in"] = datetime.now(timezone.utc)
    vis_data["approved"] = False
    vis_data["check_out"] = None
    vis_data["created_at"] = datetime.now(timezone.utc)

    doc_ref = db.collection("visitors").document()
    doc_ref.set(vis_data)

    vis_data["id"] = doc_ref.id
    vis_data["tenant_name"] = tenant_doc.to_dict().get("name")
    return vis_data

@router.get("")
def get_visitors():
    query = db.collection("visitors").order_by("check_in", direction="DESCENDING")
    
    visitors = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        
        # hydrate tenant
        tenant_doc = db.collection("tenants").document(data.get("tenant_id")).get()
        if tenant_doc.exists:
            data["tenant_name"] = tenant_doc.to_dict().get("name")
            
        visitors.append(data)
    return {"visitors": visitors}

@router.patch("/{id}/approve")
def approve_visitor(id: str, current_user: dict = Depends(get_current_user)):
    doc_ref = db.collection("visitors").document(id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Visitor not found")
        
    doc_ref.update({"approved": True})
    return {"message": "Visitor approved"}

@router.patch("/{id}/checkout")
def checkout_visitor(id: str, current_user: dict = Depends(get_current_user)):
    doc_ref = db.collection("visitors").document(id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Visitor not found")
        
    doc_ref.update({"check_out": datetime.utcnow()})
    return {"message": "Visitor checked out"}
