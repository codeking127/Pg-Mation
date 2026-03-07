from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from core.firebase_setup import db
from core.security import get_current_user
from schemas.rent import RentInvoiceCreate, RentInvoiceResponse
from datetime import datetime

router = APIRouter(prefix="/rent", tags=["Rent & Invoices"])

@router.post("/invoices", response_model=RentInvoiceResponse)
def create_invoice(invoice: RentInvoiceCreate, current_user: dict = Depends(get_current_user)):
    user_doc = db.collection("users").document(current_user.get("uid")).get()
    
    if user_doc.to_dict().get("role") not in ["ADMIN", "OWNER"]:
        raise HTTPException(status_code=403, detail="Not authorized")

    inv_data = invoice.model_dump()
    inv_data["created_at"] = datetime.utcnow()
    inv_data["paid"] = False
    inv_data["due_date"] = datetime.combine(invoice.due_date, datetime.min.time())

    # Get Tenant details to denormalize for list views
    tenant_doc = db.collection("tenants").document(invoice.tenant_id).get()
    if tenant_doc.exists:
        t_data = tenant_doc.to_dict()
        inv_data["tenant_name"] = t_data.get("name")
        pg_doc = db.collection("pgs").document(t_data.get("pg_id", "")).get()
        if pg_doc.exists:
            inv_data["pg_name"] = pg_doc.to_dict().get("name")

    doc_ref = db.collection("invoices").document()
    doc_ref.set(inv_data)

    inv_data["id"] = doc_ref.id
    return inv_data

@router.get("/invoices")
def get_invoices(tenant_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = db.collection("invoices")
    if tenant_id:
        from google.cloud.firestore_v1.base_query import FieldFilter
        query = query.where(filter=FieldFilter("tenant_id", "==", tenant_id))

    invoices = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        
        # Hydrate dynamic if missing from old records
        if "tenant_name" not in data:
            t_doc = db.collection("tenants").document(data.get("tenant_id", "")).get()
            if t_doc.exists:
                t_data = t_doc.to_dict()
                data["tenant_name"] = t_data.get("name")
                p_doc = db.collection("pgs").document(t_data.get("pg_id", "")).get()
                if p_doc.exists:
                    data["pg_name"] = p_doc.to_dict().get("name")
                    
        invoices.append(data)
    return {"invoices": invoices}

@router.get("/invoices/my")
def get_my_invoices(current_user: dict = Depends(get_current_user)):
    from google.cloud.firestore_v1.base_query import FieldFilter
    query = db.collection("invoices").where(filter=FieldFilter("tenant_id", "==", current_user.get("uid")))
    
    invoices = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
        
        # Hydrate dynamic if missing from old records
        if "tenant_name" not in data:
            t_doc = db.collection("tenants").document(data.get("tenant_id", "")).get()
            if t_doc.exists:
                t_data = t_doc.to_dict()
                data["tenant_name"] = t_data.get("name")
                p_doc = db.collection("pgs").document(t_data.get("pg_id", "")).get()
                if p_doc.exists:
                    data["pg_name"] = p_doc.to_dict().get("name")
                    
        invoices.append(data)
    return {"invoices": invoices}

@router.patch("/invoices/{invoice_id}/pay")
def mark_paid(invoice_id: str, current_user: dict = Depends(get_current_user)):
    doc_ref = db.collection("invoices").document(invoice_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    doc_ref.update({
        "paid": True,
        "paid_at": datetime.utcnow()
    })
    return {"message": "Invoice marked as paid"}
