from fastapi import FastAPI
from backend.database import Base, engine
from backend.routers import auth as auth_router
from backend.routers import dev as dev_router

app = FastAPI(title="It's Peanuts AI")

# create tables
Base.metadata.create_all(bind=engine)

app.include_router(auth_router.router)
app.include_router(dev_router.router)


@app.get("/healthz")
def healthz():
    return {"status": "ok"}





