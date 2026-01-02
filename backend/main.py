from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi

from backend.database import engine
from backend.models import Base
from backend.routers import auth as auth_router

app = FastAPI(title="It's Peanuts AI", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables automatically on boot
Base.metadata.create_all(bind=engine)

app.include_router(auth_router.router)


def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    schema = get_openapi(
        title=app.title,
        version=app.version,
        routes=app.routes,
    )

    # Voeg OAuth2 password-flow toe zodat Swagger "Authorize" laat zien
    schema.setdefault("components", {}).setdefault("securitySchemes", {})
    schema["components"]["securitySchemes"]["OAuth2PasswordBearer"] = {
        "type": "oauth2",
        "flows": {
            "password": {
                "tokenUrl": "/auth/login",
                "scopes": {},
            }
        },
    }

    # Optioneel: je kunt ook globale security zetten; ik laat dit uit
    # zodat alleen endpoints met Depends(OAuth2PasswordBearer) beveiligd zijn.

    app.openapi_schema = schema
    return app.openapi_schema


app.openapi = custom_openapi


@app.get("/healthz")
def healthz():
    return {"status": "ok"}











