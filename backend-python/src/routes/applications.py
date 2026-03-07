from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.firebase_setup import db
from core.security import get_current_user
from schemas.application import ApplicationCreate, ApplicationResponse, ApplicationReview
from datetime import datetime
from google.cloud.firestore_v1.base_query import FieldFilter

router = APIRouter(prefix="/applications", tags=["Applications"])

@router.post("", response_model=ApplicationResponse)
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
    query = db.collection("applications")
    
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
    
    # Sort in memory to avoid requiring complex Firestore composite indexes
    apps.sort(key=lambda x: x.get("created_at", datetime.min), reverse=True)
    
    return {"applications": apps}

@router.patch("/{id}/status")
def update_application_status(id: str, review: ApplicationReview, current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    if user_doc.to_dict().get("role") not in ["ADMIN", "OWNER"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    doc_ref = db.collection("applications").document(id)
    app_doc = doc_ref.get()
    if not app_doc.exists:
        raise HTTPException(status_code=404, detail="Application not found")
        
    app_data = app_doc.to_dict()
    update_data = {
        "status": review.status, 
        "reviewed_at": datetime.utcnow()
    }
    
    if review.status == "APPROVED" and review.room_id and review.bed_id:
        pg_id = app_data.get("pg_id")
        tenant_id = app_data.get("tenant_id")
        
        # 1. Update bed status to OCCUPIED
        bed_ref = db.collection("pgs").document(pg_id).collection("rooms").document(review.room_id).collection("beds").document(review.bed_id)
        bed_doc = bed_ref.get()
        if bed_doc.exists:
            bed_ref.update({
                "status": "OCCUPIED",
                "tenant_id": tenant_id
            })
            update_data["bed_number"] = bed_doc.to_dict().get("bed_number")
            
        # 2. Update PG available beds count
        pg_ref = db.collection("pgs").document(pg_id)
        pg_data = pg_ref.get().to_dict()
        if pg_data:
            pg_ref.update({
                "available_beds": max(0, pg_data.get("available_beds", 1) - 1)
            })
            
        # 3. Add room number to application
        room_doc = db.collection("pgs").document(pg_id).collection("rooms").document(review.room_id).get()
        if room_doc.exists:
             update_data["room_number"] = room_doc.to_dict().get("room_number")
             
        if review.rent_amount:
             update_data["rent_amount"] = review.rent_amount
             
        # 4. Update tenant profile with active PG connection
        tenant_profile_ref = db.collection("tenants").document(tenant_id)
        if tenant_profile_ref.get().exists:
            tenant_profile_ref.update({
                "pg_id": pg_id,
                "room_id": review.room_id,
                "bed_id": review.bed_id,
                "status": "ACTIVE"
            })
            
    doc_ref.update(update_data)
    return {"message": "Application status updated"}
