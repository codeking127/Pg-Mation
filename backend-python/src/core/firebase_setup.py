import os
import firebase_admin
from firebase_admin import credentials, firestore, auth, storage

def initialize_firebase():
    # Look for the service account key in the environment or a local file
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    default_cred_path = os.path.join(base_dir, 'firebase-service-account.json')
    
    # Render Secret Files mount path fallback
    render_secret_path = '/etc/secrets/firebase-service-account.json'
    if os.path.exists(render_secret_path):
        default_cred_path = render_secret_path
        
    cred_path = os.getenv('FIREBASE_SERVICE_ACCOUNT_PATH', default_cred_path)
    
    try:
        if not firebase_admin._apps:
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred, {
                    'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET', 'pg-data-8c54e.appspot.com') # Extracted from project ID
                })
                print("Firebase initialized successfully using local service account.")
            else:
                print(f"WARNING: Firebase service account not found at {cred_path}. Trying default credentials.")
                # When testing locally without credentials, just initialize a mock or let it fail gracefully
                try:
                    firebase_admin.initialize_app(options={'storageBucket': os.getenv('FIREBASE_STORAGE_BUCKET', 'pg-data-8c54e.appspot.com')})
                except ValueError:
                    pass
                print("Firebase initialized successfully using default credentials.")
    except Exception as e:
        print(f"Error initializing Firebase: {e}")

# Call init right away or expose app/db
initialize_firebase()

db = firestore.client()
try:
    auth_client = auth
except:
    auth_client = None

def get_db():
    return db
