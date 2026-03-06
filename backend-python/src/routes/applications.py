from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.firebase_setup import db
from core.security import get_current_user
from schemas.application import ApplicationCreate, ApplicationResponse
from datetime import datetime
from google.cloud.firestore_v1.base_query import FieldFilter

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.post("/", response_model=ApplicationResponse)
def apply_pg(app_in: ApplicationCreate, current_user: dict = Depends(get_current_user)):
    user_uid = current_user.get("uid")

    pg_doc = db.collection("pgs").document(app_in.pg_id).get()
    if not pg_doc.exists:
        raise HTTPException(status_code=404, detail="PG not found")

    user_doc = db.collection("users").document(user_uid).get()
    
    app_data = app_in.model_dump()
    app_data["tenant_id"] = user_uid
    app_data["tenant_name"] = user_doc.to_dict().get("name") if user_doc.exists else None
    app_data["pg_name"] = pg_doc.to_dict().get("name")
    app_data["owner_id"] = pg_doc.to_dict().get("owner_id")
    app_data["status"] = "PENDING"
    app_data["created_at"] = datetime.utcnow()

    doc_ref = db.collection("applications").document()
    doc_ref.set(app_data)

    app_data["id"] = doc_ref.id
    return app_data

@router.get("")
def get_applications(is_owner: bool = False, is_tenant: bool = False, current_user: dict = Depends(get_current_user)):
    query = db.collection("applications").order_by("created_at", direction="DESCENDING")
    
    uid = current_user.get("uid")
    if is_owner:
        query = query.where(filter=FieldFilter("owner_id", "==", uid))
    if is_tenant:
        query = query.where(filter=FieldFilter("tenant_id", "==", uid))

    apps = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        apps.append(data)
    return {"applications": apps}

@router.patch("/{id}/status")
def update_application_status(id: str, status: str, current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    if user_doc.to_dict().get("role") not in ["ADMIN", "OWNER"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    doc_ref = db.collection("applications").document(id)
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Application not found")
        
    doc_ref.update({
        "status": status, 
        "reviewed_at": datetime.utcnow()
    })
    return {"message": "Application status updated"}
