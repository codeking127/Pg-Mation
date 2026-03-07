from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.firebase_setup import db
from core.security import get_current_user, get_optional_user
from schemas.pg import PGCreate, PGResponse
from datetime import datetime
from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel

class PGUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    monthly_rent: Optional[float] = None
    description: Optional[str] = None
    amenities: Optional[list] = None
    gender_preference: Optional[str] = None
    photos: Optional[list] = None

router = APIRouter(prefix="/pgs", tags=["Properties"])

@router.post("", response_model=PGResponse)
def create_pg(pg: PGCreate, current_user: dict = Depends(get_current_user)):
    user_ref = db.collection("users").document(current_user.get("uid"))
    user_doc = user_ref.get()
    
    if not user_doc.exists or user_doc.to_dict().get("role") not in ["ADMIN", "OWNER"]:
        raise HTTPException(status_code=403, detail="Not authorized to create PGs")

    pg_data = pg.model_dump()
    pg_data["created_at"] = datetime.utcnow()
    pg_data["updated_at"] = datetime.utcnow()
    pg_data["total_beds"] = 0
    pg_data["occupied_beds"] = 0
    pg_data["available_beds"] = 0

    doc_ref = db.collection("pgs").document()
    doc_ref.set(pg_data)

    pg_data["id"] = doc_ref.id
    pg_data["owner_name"] = user_doc.to_dict().get("name")
    return pg_data

@router.get("")
def get_pgs(owner_id: Optional[str] = None, current_user: Optional[dict] = Depends(get_optional_user)):
    role = None
    uid = None
    if current_user:
        uid = current_user.get("uid")
        user_doc = db.collection("users").document(uid).get()
        role = user_doc.to_dict().get("role") if user_doc.exists else None

    query = db.collection("pgs")

    # If the user is an OWNER, strictly lock them to their own PGs regardless of query params
    if role == "OWNER":
        query = query.where(filter=FieldFilter("owner_id", "==", uid))
    elif owner_id:
        query = query.where(filter=FieldFilter("owner_id", "==", owner_id))

    pgs = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id

        # Optionally fetch owner name
        owner_doc = db.collection("users").document(data["owner_id"]).get()
        if owner_doc.exists:
            data["owner_name"] = owner_doc.to_dict().get("name")

        pgs.append(data)
    return {"pgs": pgs}

@router.get("/stats/overview")
def get_pg_stats(current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    role = user_doc.to_dict().get("role") if user_doc.exists else None
    
    # Aggregations
    pgs_query = db.collection("pgs")
    if role == "OWNER":
        pgs_query = pgs_query.where(filter=FieldFilter("owner_id", "==", current_user.get("uid")))
        
    pgs = list(pgs_query.stream())
    total_pgs = len(pgs)
    
    total_beds = sum([doc.to_dict().get("total_beds", 0) for doc in pgs])
    occupied_beds = sum([doc.to_dict().get("occupied_beds", 0) for doc in pgs])
    
    tenants_query = db.collection("tenants")
    complaints_query = db.collection("complaints").where(filter=FieldFilter("status", "in", ["OPEN", "PENDING"]))
    
    if role == "OWNER":
        # simple workaround for counts without complex filtering
        pg_ids = [doc.id for doc in pgs]
        
        tenants = 0
        if pg_ids:
            # Firestore 'in' queries support max 10 elements, but we'll do simple client side filter
            all_t = list(db.collection("tenants").stream())
            owner_tenants = [t for t in all_t if t.to_dict().get("pg_id") in pg_ids]
            tenants = len(owner_tenants)
            
            # Count open complaints belonging to these tenants
            owner_tenant_ids = set([t.id for t in owner_tenants])
            if owner_tenant_ids:
                all_c = list(db.collection("complaints").where(filter=FieldFilter("status", "in", ["OPEN", "PENDING"])).stream())
                open_complaints = len([c for c in all_c if c.to_dict().get("tenant_id") in owner_tenant_ids])
            else:
                open_complaints = 0
        else:
            open_complaints = 0
    else:
        tenants = len(list(tenants_query.stream()))
        open_complaints = len(list(complaints_query.stream()))
        
    total_owners = len(list(db.collection("users").where(filter=FieldFilter("role", "==", "OWNER")).stream())) if role == "ADMIN" else 1

    return {
        "stats": {
            "total_pgs": total_pgs,
            "total_owners": total_owners,
            "total_tenants": tenants,
            "total_beds": total_beds,
            "occupied_beds": occupied_beds,
            "open_complaints": open_complaints
        }
    }

@router.put("/{pg_id}")
def update_pg(pg_id: str, payload: PGUpdate, current_user: dict = Depends(get_current_user)):
    doc_ref = db.collection("pgs").document(pg_id)
    doc = doc_ref.get()

    if not doc.exists:
        raise HTTPException(status_code=404, detail="PG not found")

    user_doc = db.collection("users").document(current_user.get("uid")).get()
    role = user_doc.to_dict().get("role")

    if role != "ADMIN" and doc.to_dict().get("owner_id") != current_user.get("uid"):
        raise HTTPException(status_code=403, detail="Not authorized to update this PG")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    doc_ref.update(update_data)

    updated = doc_ref.get().to_dict()
    updated["id"] = pg_id
    return updated

@router.delete("/{pg_id}")
def delete_pg(pg_id: str, current_user: dict = Depends(get_current_user)):
    doc_ref = db.collection("pgs").document(pg_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="PG not found")
        
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    role = user_doc.to_dict().get("role")
    
    if role != "ADMIN" and doc.to_dict().get("owner_id") != current_user.get("uid"):
        raise HTTPException(status_code=403, detail="Not authorized to delete this PG")
        
    doc_ref.delete()
    return {"message": "PG deleted successfully"}
