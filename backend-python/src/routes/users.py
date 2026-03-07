from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.firebase_setup import db
from core.security import get_current_user
from pydantic import BaseModel
from schemas.user import UserCreate, UserResponse
from datetime import datetime

class CompleteRegistrationRequest(BaseModel):
    role: str

class UserStatusUpdate(BaseModel):
    status: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    profile_photo: Optional[str] = None

class PhotoUpdate(BaseModel):
    profile_photo: str


router = APIRouter(prefix="/users", tags=["Users"])

@router.post("", response_model=UserResponse)
def create_user(user: UserCreate, current_user: dict = Depends(get_current_user)):
    """
    Creates a new user document in Firestore.
    The client should first create the user in Firebase Auth, then pass the UID here 
    if they need standard endpoints, or we can trigger it from a Cloud Function.
    For this migration, we'll allow admin to create users or users to self-register.
    """
    # Assuming the current_user is creating this or self-registering.
    # We should get the UID. For now, we simulate generating a document.
    
    # Check if we should use the auth token's UID
    uid = current_user.get("uid")
    
    doc_ref = db.collection("users").document(uid)
    if doc_ref.get().exists:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_data = user.model_dump()
    user_data["created_at"] = datetime.utcnow()
    user_data["updated_at"] = datetime.utcnow()
    
    doc_ref.set(user_data)
    
    user_data["id"] = uid
    return user_data

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    doc = db.collection("users").document(uid).get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="USER_NEEDS_ROLE_REGISTRATION")
        
    data = doc.to_dict()
    data["id"] = doc.id
    return data

@router.get("")
def get_users(role: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    # Add admin check here
    query = db.collection("users")
    if role:
        query = query.where("role", "==", role)
        
    users = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        users.append(data)
        
    return {"users": users}

@router.post("/complete-registration", response_model=UserResponse)
def complete_registration(req: CompleteRegistrationRequest, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    doc_ref = db.collection("users").document(uid)
    
    if doc_ref.get().exists:
        raise HTTPException(status_code=400, detail="User is already registered")
        
    try:
        from core.firebase_setup import auth_client
        firebase_user = auth_client.get_user(uid)
        
        user_data = {
            "name": firebase_user.display_name or "Unknown User",
            "email": firebase_user.email,
            "phone": firebase_user.phone_number,
            "role": req.role,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # If it's the specific admin email, override the role
        if firebase_user.email == "admin@pg.com":
            user_data["role"] = "ADMIN"
             
        doc_ref.set(user_data)
        
        if user_data["role"] == "TENANT":
            tenant_ref = db.collection("tenants").document(uid)
            tenant_ref.set({
                "user_id": uid,
                "name": user_data["name"],
                "email": user_data["email"],
                "phone": user_data["phone"],
                "created_at": datetime.utcnow()
            })
            
        user_data["id"] = uid
        return user_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to complete registration: {str(e)}")

@router.delete("/{user_id}")
def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    admin_doc = db.collection("users").document(current_user.get("uid")).get()
    if not admin_doc.exists or admin_doc.to_dict().get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user_ref = db.collection("users").document(user_id)
    if not user_ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_ref.delete()
    
    # Also attempt to delete tenant profile if it exists
    tenant_ref = db.collection("tenants").document(user_id)
    if tenant_ref.get().exists:
        tenant_ref.delete()
        
    return {"message": "User deleted successfully"}

@router.put("/{user_id}/status")
def update_user_status(user_id: str, payload: UserStatusUpdate, current_user: dict = Depends(get_current_user)):
    admin_doc = db.collection("users").document(current_user.get("uid")).get()
    if not admin_doc.exists or admin_doc.to_dict().get("role") != "ADMIN":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    user_ref = db.collection("users").document(user_id)
    if not user_ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")
        
    user_ref.update({
        "status": payload.status,
        "updated_at": datetime.utcnow()
    })
    
    return {"message": "User status updated"}

@router.put("/{user_id}")
def update_user(user_id: str, payload: UserUpdate, current_user: dict = Depends(get_current_user)):
    caller_uid = current_user.get("uid")
    caller_doc = db.collection("users").document(caller_uid).get()
    caller_role = caller_doc.to_dict().get("role") if caller_doc.exists else None

    # Only admins or the user themselves can update the profile
    if caller_role != "ADMIN" and caller_uid != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    user_ref = db.collection("users").document(user_id)
    if not user_ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    user_ref.update(update_data)

    return {"message": "User updated successfully"}

@router.patch("/me/photo")
def update_my_photo(payload: PhotoUpdate, current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    user_ref = db.collection("users").document(uid)
    if not user_ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    user_ref.update({"profile_photo": payload.profile_photo, "updated_at": datetime.utcnow()})

    # Keep tenant profile in sync if applicable
    tenant_ref = db.collection("tenants").document(uid)
    if tenant_ref.get().exists:
        tenant_ref.update({"profile_photo": payload.profile_photo, "updated_at": datetime.utcnow()})

    return {"message": "Profile photo updated"}

@router.patch("/me/photo/remove")
def remove_my_photo(current_user: dict = Depends(get_current_user)):
    uid = current_user.get("uid")
    user_ref = db.collection("users").document(uid)
    if not user_ref.get().exists:
        raise HTTPException(status_code=404, detail="User not found")

    user_ref.update({"profile_photo": None, "updated_at": datetime.utcnow()})

    tenant_ref = db.collection("tenants").document(uid)
    if tenant_ref.get().exists:
        tenant_ref.update({"profile_photo": None, "updated_at": datetime.utcnow()})

    return {"message": "Profile photo removed"}
