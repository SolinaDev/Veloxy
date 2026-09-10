from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import activities, events, groups, pet, products, users

app = FastAPI(title="Veloxy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://veloxy-run.web.app",
        "https://veloxy-run.firebaseapp.com",
        "http://localhost:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(activities.router)
app.include_router(pet.router)
app.include_router(groups.router)
app.include_router(events.router)
app.include_router(products.router)


@app.get("/health")
def health():
    return {"status": "ok"}
