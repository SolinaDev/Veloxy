# Veloxy API

Backend próprio (FastAPI + PostgreSQL) substituindo Firestore e Storage.
Firebase Auth e Hosting continuam — ver `docs/` do repo raiz para o plano completo de migração.

## Setup local

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp .env.example .env  # ajustar DATABASE_URL e FIREBASE_PROJECT_ID
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload
```

## Estrutura

- `app/models/` — SQLAlchemy models (schema Postgres da Fase 0 do plano de migração).
- `app/auth.py` — valida o ID token do Firebase Auth direto contra o JWKS do Google, sem Admin SDK.
- `alembic/` — migrations versionadas do schema.

## Autenticação

A API não emite nem gerencia login — isso continua 100% no Firebase Auth do frontend.
Cada request autenticada envia `Authorization: Bearer <id_token>` e o middleware em
`app/auth.py` valida a assinatura e expiração. `require_verified_email` bloqueia
endpoints sensíveis para contas de email/senha que não confirmaram o email (Fase 1.5).
