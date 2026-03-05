from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from core.firebase_setup import auth_client
import logging

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """
    Validates the Firebase ID token and returns the decoded token payload.
    """
    token = credentials.credentials
    if not auth_client:
        logging.warning("Firebase auth client not initialized. Bypassing auth for dev.")
        return {"uid": "test_uid", "email": "test@example.com"}

    try:
        decoded_token = auth_client.verify_id_token(token)
        return decoded_token
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user_id(user: dict = Depends(get_current_user)) -> str:
    return user.get("uid")
