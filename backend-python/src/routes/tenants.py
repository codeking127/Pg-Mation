from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.firebase_setup import db, auth_client
from core.security import get_current_user
from schemas.tenant import TenantCreate, TenantResponse
from datetime import datetime
from google.cloud.firestore_v1.base_query import FieldFilter

router = APIRouter(prefix="/tenants", tags=["Tenants"])

@router.post("", response_model=TenantResponse)
def onboard_tenant(tenant: TenantCreate, current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    role = user_doc.to_dict().get("role") if user_doc.exists else None

    if role not in ["ADMIN", "OWNER"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    # In a full Firebase implementation, you might want to create the Auth user here using Firebase Admin SDK
    # if the tenant doesn't already have an account.
    user_id = "temp_" + str(datetime.utcnow().timestamp()) # Placeholder until Firebase Auth hookup

    if auth_client:
        try:
            new_user = auth_client.create_user(
                email=tenant.email,
                password=tenant.password,
                display_name=tenant.name
            )
            user_id = new_user.uid
            
            # Create user doc
            db.collection("users").document(new_user.uid).set({
                "name": tenant.name,
                "email": tenant.email,
                "role": "TENANT",
                "phone": tenant.phone,
                "created_at": datetime.utcnow()
            })
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    tenant_data = tenant.model_dump(exclude={"password"})
    tenant_data["user_id"] = user_id
    tenant_data["created_at"] = datetime.utcnow()
    # Handle dates for Firestore
    tenant_data["joining_date"] = datetime.combine(tenant.joining_date, datetime.min.time())
    tenant_data["status"] = "ACTIVE"
    
    # If a bed was assigned, mark it as occupied
    if tenant.pg_id and tenant.bed_id:
        room_id = None
        # We need to find the room this bed belongs to
        rooms_query = db.collection("pgs").document(tenant.pg_id).collection("rooms").stream()
        for r in rooms_query:
            b_ref = r.reference.collection("beds").document(tenant.bed_id)
            b_doc = b_ref.get()
            if b_doc.exists:
                room_id = r.id
                # Update bed
                b_ref.update({
                    "status": "OCCUPIED",
                    "tenant_id": user_id
                })
                # Add to tenant data
                tenant_data["room_id"] = room_id
                tenant_data["room_number"] = r.to_dict().get("room_number")
                tenant_data["bed_number"] = b_doc.to_dict().get("bed_number")
                break
                
        # Update PG available beds count
        pg_ref = db.collection("pgs").document(tenant.pg_id)
        pg_data = pg_ref.get().to_dict()
        if pg_data:
            pg_ref.update({
                "available_beds": max(0, pg_data.get("available_beds", 1) - 1)
            })
    
    doc_ref = db.collection("tenants").document(user_id) # Ensure 1-to-1 tenant mapping using uid
    doc_ref.set(tenant_data)
    
    tenant_data["id"] = doc_ref.id
    return tenant_data

@router.get("")
def get_tenants(pg_id: Optional[str] = None):
    query = db.collection("tenants")
    if pg_id:
        query = query.where(filter=FieldFilter("pg_id", "==", pg_id))
        
    tenants = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        
        # Hydrate PG Name
        pg_doc = db.collection("pgs").document(data.get("pg_id")).get()
        if pg_doc.exists:
            data["pg_name"] = pg_doc.to_dict().get("name")
            
        tenants.append(data)
    return {"tenants": tenants}

@router.get("/me")
def get_my_tenant_profile(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    doc = db.collection("tenants").document(uid).get()
    
    if not doc.exists:
        # Fallback to users collection to give a graceful empty profile
        user_doc = db.collection("users").document(uid).get()
        user_data = user_doc.to_dict() if user_doc.exists else {}
        return {
            "tenant": {
                "id": uid,
                "name": user_data.get("name", "Unknown"),
                "email": user_data.get("email", ""),
                "phone": user_data.get("phone", ""),
                "pg_name": "Not assigned to any PG yet",
                "room_number": None,
                "bed_number": None
            }
        }
        
    data = doc.to_dict()
    data["id"] = doc.id
    
    pg_doc = db.collection("pgs").document(data.get("pg_id", "")).get()
    if pg_doc.exists:
        data["pg_name"] = pg_doc.to_dict().get("name")
        
    return {"tenant": data}

@router.patch("/me/profile")
def update_my_tenant_profile(update_data: dict, current_user: dict = Depends(get_current_user)):
    doc_ref = db.collection("tenants").document(current_user.get("uid"))
    if not doc_ref.get().exists:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
        
    # Filter safe fields
    safe_data = {k: v for k, v in update_data.items() if k in ["phone", "aadhar_number", "profile_photo", "aadhar_photo"]}
    if safe_data:
        safe_data["updated_at"] = datetime.utcnow()
        doc_ref.update(safe_data)
        
        # update users collection for phone/photo consistency
        user_ref = db.collection("users").document(current_user.get("uid"))
        if user_ref.get().exists:
            user_safe = {k: v for k, v in safe_data.items() if k in ["phone", "profile_photo"]}
            if user_safe:
                user_ref.update(user_safe)
                
    return {"message": "Profile updated successfully"}

@router.delete("/{tenant_id}")
def delete_tenant(tenant_id: str, current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    role = user_doc.to_dict().get("role") if user_doc.exists else None

    if role not in ["ADMIN", "OWNER"]:
        raise HTTPException(status_code=403, detail="Not authorized")
        
    doc_ref = db.collection("tenants").document(tenant_id)
    t_doc = doc_ref.get()
    if not t_doc.exists:
        raise HTTPException(status_code=404, detail="Tenant not found")
        
    t_data = t_doc.to_dict()
    
    # If OWNER, verify the tenant actually belongs to their PG
    if role == "OWNER":
        pg_doc = db.collection("pgs").document(t_data.get("pg_id", "")).get()
        if not pg_doc.exists or pg_doc.to_dict().get("owner_id") != current_user.get("uid"):
             raise HTTPException(status_code=403, detail="Tenant does not belong to your PG")
             
    # Free up the bed for both OWNER and ADMIN actions
    if t_data.get("room_id") and t_data.get("bed_id"):
         bed_ref = db.collection("pgs").document(t_data.get("pg_id")).collection("rooms").document(t_data.get("room_id")).collection("beds").document(t_data.get("bed_id"))
         if bed_ref.get().exists:
             bed_ref.update({"status": "AVAILABLE", "tenant_id": None})
         
         # Increase available beds count
         pg_ref = db.collection("pgs").document(t_data.get("pg_id"))
         p_data = pg_ref.get().to_dict()
         if p_data:
             pg_ref.update({"available_beds": p_data.get("available_beds", 0) + 1})

    # Optional: Delete auth user using firebase admin sdk if we fully manage them
    
    doc_ref.delete()
    return {"message": "Tenant deleted successfully"}
