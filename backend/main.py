from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.routers import auth as auth_router

app = FastAPI(title="It's Peanuts AI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}






