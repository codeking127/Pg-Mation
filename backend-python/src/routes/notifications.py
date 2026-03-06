from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from core.firebase_setup import db
from core.security import get_current_user
from datetime import datetime
from google.cloud.firestore_v1.base_query import FieldFilter

router = APIRouter(prefix="/notifications", tags=["Notifications"])

@router.get("/settings")
def get_settings(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    doc = db.collection("notification_settings").document(uid).get()
    
    if doc.exists:
        return {"settings": doc.to_dict()}
    
    # Default settings
    default_settings = {
        "reminder_start_day": 1,
        "reminder_end_day": 5,
        "enabled": False
    }
    return {"settings": default_settings}

@router.put("/settings")
def save_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    db.collection("notification_settings").document(uid).set(settings)
    return {"settings": settings}

@router.get("/tenants")
def get_notification_tenants(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    
    # Get PGs owned by this user
    pgs_query = db.collection("pgs").where(filter=FieldFilter("owner_id", "==", uid)).stream()
    owned_pgs = {doc.id: doc.to_dict().get("name") for doc in pgs_query}
    
    if not owned_pgs:
        return {"tenants": []}
        
    # Get tenants in these PGs
    tenants = []
    all_tenants = db.collection("tenants").stream()
    
    for t_doc in all_tenants:
        t_data = t_doc.to_dict()
        pg_id = t_data.get("pg_id")
        
        if pg_id in owned_pgs:
            tenants.append({
                "tenant_name": t_data.get("name"),
                "pg_name": owned_pgs[pg_id],
                "room_number": t_data.get("room_number"),
                "bed_number": t_data.get("bed_number"),
                "phone": t_data.get("phone")
            })
            
    return {"tenants": tenants}

@router.post("/send-now")
def send_now(current_user: dict = Depends(get_current_user)):
    # Mock sending process for now
    return {
        "message": "Push notifications queued successfully for active tenants.",
        "errors": []
    }
