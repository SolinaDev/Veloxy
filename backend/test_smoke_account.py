"""Smoke test da exclusao de conta (DELETE /users/{uid}).
Roda contra o Postgres de dev real, com override do dependency de auth.
Os uids levam um sufixo aleatorio para o script poder rodar varias vezes."""

import uuid

from fastapi.testclient import TestClient

from app.auth import FirebaseUser, get_current_user, require_verified_email
from app.main import app

SUFFIX = uuid.uuid4().hex[:8]
UID_A = f"smoke-account-a-{SUFFIX}"
UID_B = f"smoke-account-b-{SUFFIX}"


def straight_route(km: float) -> list[dict]:
    """Rota reta de `km` quilometros - POST /activities exige rota coerente
    com a distancia (app/activity_rules.py). 1 grau de latitude ~ 111.195 km."""
    return [{"lat": -23.55, "lng": -46.63}, {"lat": -23.55 + km / 111.195, "lng": -46.63}]


client = TestClient(app)


def as_user(uid: str):
    user = lambda: FirebaseUser(uid=uid, email=f"{uid}@veloxy.dev", email_verified=True)  # noqa: E731
    app.dependency_overrides[get_current_user] = user
    app.dependency_overrides[require_verified_email] = user


def save_run(uid: str, name: str) -> str:
    r = client.post("/activities", json={
        "userId": uid, "userName": name, "userAvatar": None,
        "distance": 5.0, "time": "30:00", "durationSeconds": 1800, "pace": "6'00\"",
        "type": "RUNNING", "route": straight_route(5.0),
    })
    assert r.status_code == 200, r.text
    return r.json()["id"]


# Ana cria dois grupos: um que Bruno tambem participa e um so dela
as_user(UID_A)
assert client.put(f"/users/{UID_A}", json={"displayName": "Ana"}).status_code == 200
shared_group = client.post("/groups", json={"name": "Compartilhado", "city": "SP"}).json()["id"]
solo_group = client.post("/groups", json={"name": "So da Ana", "city": "SP"}).json()["id"]
save_run(UID_A, "Ana")

as_user(UID_B)
assert client.put(f"/users/{UID_B}", json={"displayName": "Bruno"}).status_code == 200
assert client.post(f"/groups/{shared_group}/join").status_code == 200
bruno_run = save_run(UID_B, "Bruno")
bruno_post = client.post(f"/groups/{shared_group}/posts", json={"text": "Post do Bruno"}).json()["id"]

# Ana interage com o conteudo do Bruno
as_user(UID_A)
assert client.post(f"/activities/{bruno_run}/like", json={"isLiked": False}).status_code == 200
assert client.post(f"/groups/{shared_group}/posts/{bruno_post}/like", json={"isLiked": False}).status_code == 200
assert client.post(f"/groups/{shared_group}/posts/{bruno_post}/comments", json={"text": "Boa!"}).status_code == 200
assert client.post(f"/groups/{shared_group}/messages", json={"text": "Oi"}).status_code == 200

# 1. Bruno nao pode excluir a conta da Ana
as_user(UID_B)
r = client.delete(f"/users/{UID_A}")
assert r.status_code == 403, r.text
print("1. excluir conta de outro:", r.status_code)

# 2. Ana exclui a propria conta
as_user(UID_A)
r = client.delete(f"/users/{UID_A}")
assert r.status_code == 204, r.text
print("2. excluir propria conta:", r.status_code)

# 3. o que era so da Ana sumiu
as_user(UID_B)
assert client.get(f"/users/{UID_A}").status_code == 404
assert client.get(f"/activities/user/{UID_A}").json() == []
assert client.get(f"/groups/{solo_group}").status_code == 404
print("3. perfil, corridas e grupo vazio da Ana removidos")

# 4. o grupo compartilhado passou para o Bruno, com o conteudo dele intacto
group = client.get(f"/groups/{shared_group}").json()
assert group["createdBy"] == UID_B, group
assert group["memberIds"] == [UID_B], group
assert client.get(f"/groups/{shared_group}/messages").json() == []
posts = client.get(f"/groups/{shared_group}/posts").json()
assert [p["id"] for p in posts] == [bruno_post], posts
assert posts[0]["likes"] == [] and posts[0]["commentsCount"] == 0, posts[0]
assert client.get(f"/groups/{shared_group}/posts/{bruno_post}/comments").json() == []
print("4. grupo compartilhado herdado pelo Bruno:", group["creatorName"])

# 5. a curtida da Ana saiu da corrida do Bruno
runs = client.get(f"/activities/user/{UID_B}").json()
assert runs[0]["likes"] == [], runs[0]
print("5. curtidas da Ana removidas")

# limpeza: Bruno tambem exclui a conta (apaga o grupo que ficou vazio)
assert client.delete(f"/users/{UID_B}").status_code == 204

print("\nOK — exclusao de conta passou.")
