"""Smoke test da Fase 1 — dominio events.
Eventos nao tem endpoint de criacao (igual ao Firestore: gerenciados fora do
app), entao inserimos um evento direto no banco antes de testar a API."""

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.auth import FirebaseUser, get_current_user
from app.database import SessionLocal
from app.main import app
from app.models import Event, User

UID = "smoke-event-uid"

app.dependency_overrides[get_current_user] = lambda: FirebaseUser(uid=UID, email="e@veloxy.dev", email_verified=True)
client = TestClient(app)

# perfil do usuario
r = client.put(f"/users/{UID}", json={"displayName": "Corredor de Evento"})
assert r.status_code == 200, r.text

# insere um evento real direto no banco (sem endpoint de criacao — igual Firestore)
db = SessionLocal()
event = Event(
    title="Corrida de Teste",
    date="24 SET",
    location="Parque Ibirapuera",
    city="Sao Paulo",
    category="10K",
    event_timestamp=datetime.now(timezone.utc) + timedelta(days=10),
)
db.add(event)
db.commit()
db.refresh(event)
event_id = event.id
db.close()

# 1. listar eventos
r = client.get("/events")
assert r.status_code == 200, r.text
events = r.json()
print("1. listar eventos:", events)
assert len(events) == 1
assert events[0]["title"] == "Corrida de Teste"
assert events[0]["participantsCount"] == 0

# 2. inscrever no evento
r = client.post(f"/events/{event_id}/join")
assert r.status_code == 200, r.text
print("2. inscrever:", r.json())
assert r.json()["participantsCount"] == 1
assert UID in r.json()["participantsIds"]

# 3. inscrever de novo deve ser idempotente (nao duplicar)
r = client.post(f"/events/{event_id}/join")
assert r.status_code == 200, r.text
print("3. inscrever de novo (idempotente):", r.json()["participantsCount"])
assert r.json()["participantsCount"] == 1

# 4. enrolled (bridge do getUserProfile)
r = client.get(f"/events/enrolled/{UID}")
assert r.status_code == 200, r.text
print("4. eventos inscritos:", r.json())
assert str(event_id) in r.json()

print("\nOK — fluxo completo de events passou.")
