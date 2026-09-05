from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Veloxy API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restringir ao domínio do Hosting antes de ir para produção
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health():
    return {"status": "ok"}
