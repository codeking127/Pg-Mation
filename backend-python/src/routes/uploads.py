from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from core.security import get_current_user
from firebase_admin import storage
import uuid

router = APIRouter(prefix="/uploads", tags=["Uploads"])

@router.post("/image")
async def upload_image(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    """
    Uploads an image to Firebase Storage and returns the public URL.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        bucket = storage.bucket()
        # Generate a unique filename to prevent overwrites
        file_extension = file.filename.split(".")[-1]
        unique_filename = f"uploads/{current_user.get('uid')}/{uuid.uuid4()}.{file_extension}"
        
        blob = bucket.blob(unique_filename)
        
        # Upload the file
        blob.upload_from_file(file.file, content_type=file.content_type)
        
        # Make the file public (optional based on your app's security rules)
        blob.make_public()
        
        return {"url": blob.public_url}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
