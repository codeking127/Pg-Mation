from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.firebase_setup import db
from core.security import get_current_user
from schemas.user import UserCreate, UserResponse
from datetime import datetime

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
        # If the user exists in Firebase Auth but has no Firestore document (e.g., from old console tools),
        # automatically create one for them here so they can log in.
        try:
            from core.firebase_setup import auth_client
            firebase_user = auth_client.get_user(uid)
            user_data = {
                "name": firebase_user.display_name or "Unknown User",
                "email": firebase_user.email,
                "phone": firebase_user.phone_number,
                "role": "TENANT", # Default fallback
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            # If it's the specific admin email, explicitly grant ADMIN role
            if firebase_user.email == "admin@pg.com":
                 user_data["role"] = "ADMIN"
                 
            db.collection("users").document(uid).set(user_data)
            
            # Auto-scaffold a tenant profile if role is TENANT
            if user_data["role"] == "TENANT":
                tenant_ref = db.collection("tenants").document(uid)
                if not tenant_ref.get().exists:
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
            raise HTTPException(status_code=404, detail="User not found and could not be auto-created")
        
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
