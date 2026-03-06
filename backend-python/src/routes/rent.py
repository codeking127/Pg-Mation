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
    from datetime import timezone
    inv_data["created_at"] = datetime.now(timezone.utc)
    inv_data["paid"] = False
    inv_data["due_date"] = datetime.combine(invoice.due_date, datetime.min.time())

    doc_ref = db.collection("invoices").document()
    doc_ref.set(inv_data)

    inv_data["id"] = doc_ref.id
    return inv_data

@router.get("/invoices")
def get_invoices(tenant_id: Optional[str] = None):
    query = db.collection("invoices")
    if tenant_id:
        from google.cloud.firestore_v1.base_query import FieldFilter
        query = query.where(filter=FieldFilter("tenant_id", "==", tenant_id))

    invoices = []
    for doc in query.stream():
        data = doc.to_dict()
        data["id"] = doc.id
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
        "paid_at": datetime.now(timezone.utc)
    })
    return {"message": "Invoice marked as paid"}
