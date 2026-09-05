from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import activities, groups, pet, users

app = FastAPI(title="Veloxy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restringir ao domínio do Hosting antes de ir para produção
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(users.router)
app.include_router(activities.router)
app.include_router(pet.router)
app.include_router(groups.router)


@app.get("/health")
def health():
    return {"status": "ok"}
