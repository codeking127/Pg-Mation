import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="PG-Mation API", version="1.0.0")

# Set up CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "https://pg-mation-six.vercel.app",
        "https://pg-mation-8ub4a0cxj-codeking127s-projects.vercel.app"
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routes import users, pgs, rooms, tenants, rent, complaints, visitors, applications, uploads, auth, notifications

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(pgs.router, prefix="/api")
app.include_router(rooms.router, prefix="/api")
app.include_router(tenants.router, prefix="/api")
app.include_router(rent.router, prefix="/api")
app.include_router(complaints.router, prefix="/api")
app.include_router(visitors.router, prefix="/api")
app.include_router(applications.router, prefix="/api")
app.include_router(uploads.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "PG-Mation API is running"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
