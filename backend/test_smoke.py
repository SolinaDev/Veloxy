"""Teste manual de fumaça da Fase 1 (users + activities).
Roda contra o Postgres de dev real, com override do dependency de auth."""

from fastapi.testclient import TestClient

from app.auth import FirebaseUser, get_current_user, require_verified_email
from app.main import app

TEST_UID = "smoke-test-uid-001"


def fake_user():
    return FirebaseUser(uid=TEST_UID, email="teste@veloxy.dev", email_verified=True)


app.dependency_overrides[get_current_user] = fake_user
app.dependency_overrides[require_verified_email] = fake_user

client = TestClient(app)

# 1. criar perfil
r = client.put(f"/users/{TEST_UID}", json={"displayName": "Corredor Teste"})
assert r.status_code == 200, r.text
print("1. criar perfil:", r.json())

# 2. salvar atividade (5km em 25min = pace rapido, deve dar bonus de XP)
r = client.post("/activities", json={
    "userId": TEST_UID,
    "userName": "Corredor Teste",
    "userAvatar": None,
    "distance": 5.0,
    "time": "25:00",
    "durationSeconds": 1500,
    "pace": "5'00\"",
    "calories": 300,
    "type": "RUNNING",
    "route": [{"lat": -23.5505, "lng": -46.6333}, {"lat": -23.5510, "lng": -46.6340}],
})
assert r.status_code == 200, r.text
activity_id = r.json()["id"]
print("2. salvar atividade:", r.json())

# 3. conferir XP/nivel do usuario (500 base * 1.2 bonus pace = 600 XP esperado)
r = client.get(f"/users/{TEST_UID}")
assert r.status_code == 200, r.text
profile = r.json()
print("3. perfil apos atividade:", profile)
assert profile["totalXP"] == 500, f"esperado 500 XP (5km, pace exato 300s/km, sem bonus), veio {profile['totalXP']}"
assert profile["monthlyKm"] == 5.0

# 4. curtir a atividade
r = client.post(f"/activities/{activity_id}/like", json={"isLiked": False})
assert r.status_code == 200, r.text
print("4. like:", r.json())
assert TEST_UID in r.json()["likes"]

# 5. listar atividades do usuario
r = client.get(f"/activities/user/{TEST_UID}")
assert r.status_code == 200, r.text
print("5. atividades do usuario:", len(r.json()), "corrida(s)")

# 6. feed geral
r = client.get("/activities/feed")
assert r.status_code == 200, r.text
print("6. feed:", len(r.json()), "atividade(s) no feed")

# 7. apagar a corrida e conferir recalculo de XP (deve voltar a 0)
r = client.delete(f"/activities/{activity_id}")
assert r.status_code == 200, r.text
r = client.get(f"/users/{TEST_UID}")
profile = r.json()
print("7. perfil apos apagar corrida:", profile)
assert profile["totalXP"] == 0
assert profile["level"] == "Iniciante"

# 8. endpoint sem token deve rejeitar (remove override temporariamente)
del app.dependency_overrides[get_current_user]
del app.dependency_overrides[require_verified_email]
r = client.get(f"/users/{TEST_UID}")
print("8. sem token:", r.status_code)
assert r.status_code == 403

# 9. fluxo do pet (reaplica override, pois foi removido no passo 8)
app.dependency_overrides[get_current_user] = fake_user
r = client.post(f"/users/{TEST_UID}/pet/choose", json={"species": "guepardo", "name": "Flash"})
assert r.status_code == 200, r.text
print("9. escolher pet:", r.json())
assert r.json()["petSpecies"] == "guepardo"

# 9b. escolher de novo deve falhar (409)
r = client.post(f"/users/{TEST_UID}/pet/choose", json={"species": "lebre", "name": "Outro"})
assert r.status_code == 409, r.text
print("9b. escolher pet de novo:", r.status_code)

# 9c. creditar coins via atividade e comprar acessorio
r = client.post("/activities", json={
    "userId": TEST_UID, "userName": "Corredor Teste", "userAvatar": None,
    "distance": 3.0, "time": "18:00", "durationSeconds": 1080, "pace": "6'00\"",
    "type": "RUNNING",
})
assert r.status_code == 200, r.text
r = client.get(f"/users/{TEST_UID}")
assert r.json()["petCoins"] == 3, r.json()

r = client.post(f"/users/{TEST_UID}/pet/purchase", json={"accessoryId": "chapeu-01", "price": 3})
assert r.status_code == 200, r.text
print("9c. comprar acessorio:", r.json())
assert r.json()["petCoins"] == 0
assert "chapeu-01" in r.json()["petUnlockedAccessoryIds"]

r = client.post(f"/users/{TEST_UID}/pet/purchase", json={"accessoryId": "caro-demais", "price": 999})
assert r.status_code == 400, r.text
print("9d. comprar sem coins suficientes:", r.status_code)

r = client.put(f"/users/{TEST_UID}/pet/equip", json={"slot": "cabeca", "accessoryId": "chapeu-01"})
assert r.status_code == 200, r.text
print("9e. equipar acessorio:", r.json())
assert r.json()["petEquippedCabeca"] == "chapeu-01"

print("\nOK — todos os checks passaram.")

# 10. rotas estaticas nao devem ser capturadas por /{user_id} (bug corrigido)
r = client.get(f"/users/by-ids?ids={TEST_UID}")
assert r.status_code == 200, r.text
print("10. users/by-ids:", r.json())
assert len(r.json()) == 1 and r.json()[0]["uid"] == TEST_UID

r = client.get("/users/ranking/global")
assert r.status_code == 200, r.text
print("10b. ranking/global:", len(r.json()), "usuario(s)")

r = client.get(f"/activities/by-users?user_ids={TEST_UID}")
assert r.status_code == 200, r.text
print("10c. activities/by-users:", len(r.json()), "atividade(s)")

print("\nOK (rotas estaticas) — nenhuma foi capturada por engano pelo path dinamico.")
