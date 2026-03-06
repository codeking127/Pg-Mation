from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from core.firebase_setup import db, auth_client
import firebase_admin.auth
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Auth"])

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str
    phone: Optional[str] = None

@router.post("/register")
def register_user(user: RegisterRequest):
    """
    Registers a new user in Firebase Auth and stores profile in Firestore.
    """
    try:
        # 1. Create user in Firebase Auth
        try:
            firebase_user = firebase_admin.auth.create_user(
                email=user.email,
                password=user.password,
                display_name=user.name,
                phone_number=user.phone if user.phone and user.phone.startswith("+") else None
            )
            uid = firebase_user.uid
        except Exception as e:
            # If user already exists in Auth, handle it
            if "already exists" in str(e).lower() or "email_exists" in str(e).lower():
                try:
                    existing_user = firebase_admin.auth.get_user_by_email(user.email)
                    uid = existing_user.uid
                except:
                    raise HTTPException(status_code=400, detail=str(e))
            else:
                raise HTTPException(status_code=400, detail=str(e))

        # 2. Store user profile in Firestore
        doc_ref = db.collection("users").document(uid)
        
        user_data = {
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        doc_ref.set(user_data)
        
        return {"message": "User registered successfully", "uid": uid, "role": user.role}
        
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Registration failed: {str(e)}")
