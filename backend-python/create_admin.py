import os
import sys

# Ensure the src directory is in the path to import core
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

from core.firebase_setup import auth_client, db
from datetime import datetime

def create_super_admin():
    email = "admin@pg.com"
    password = "Admin@123"
    name = "Super Admin"
    role = "ADMIN"

    try:
        # 1. Check if user already exists in Auth
        try:
            user = auth_client.get_user_by_email(email)
            print(f"User {email} already exists in Firebase Auth with UID: {user.uid}")
            uid = user.uid
        except Exception:
            # User doesn't exist, create them
            print(f"Creating new user {email} in Firebase Auth...")
            user = auth_client.create_user(
                email=email,
                password=password,
                display_name=name
            )
            uid = user.uid
            print(f"Successfully created user in Auth with UID: {uid}")

        # 2. Add/Update the user document in Firestore
        print(f"Adding/Updating Firestore document for UID: {uid}...")
        doc_ref = db.collection('users').document(uid)
        doc_ref.set({
            "name": name,
            "email": email,
            "role": role,
            "phone": None,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        })
        print("Successfully created Super Admin in Firestore!")
        print("-" * 30)
        print(f"Email: {email}")
        print(f"Password: {password}")
        print("-" * 30)

    except Exception as e:
        print(f"Error creating Super Admin: {e}")

if __name__ == "__main__":
    if auth_client and db:
        create_super_admin()
    else:
        print("Firebase is not initialized correctly. Check service account credentials.")
