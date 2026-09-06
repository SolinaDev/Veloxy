"""Smoke test da Fase 1 — dominio groups (grupos, posts, comentarios, chat).
Roda contra o Postgres de dev real, com override do dependency de auth."""

from fastapi.testclient import TestClient

from app.auth import FirebaseUser, get_current_user
from app.main import app

UID_A = "smoke-group-uid-a"
UID_B = "smoke-group-uid-b"

client = TestClient(app)


def as_user(uid: str, email: str):
    app.dependency_overrides[get_current_user] = lambda: FirebaseUser(uid=uid, email=email, email_verified=True)


# perfis dos dois usuarios envolvidos
as_user(UID_A, "a@veloxy.dev")
r = client.put(f"/users/{UID_A}", json={"displayName": "Ana Corredora"})
assert r.status_code == 200, r.text

as_user(UID_B, "b@veloxy.dev")
r = client.put(f"/users/{UID_B}", json={"displayName": "Bruno Corredor"})
assert r.status_code == 200, r.text

# 1. Ana cria o grupo
as_user(UID_A, "a@veloxy.dev")
r = client.post("/groups", json={"name": "Corrida de Sabado", "city": "SP", "description": "Treino leve", "tag": "Iniciante"})
assert r.status_code == 200, r.text
group = r.json()
print("1. criar grupo:", group)
assert group["createdBy"] == UID_A
assert group["creatorName"] == "Ana Corredora"
assert group["memberIds"] == [UID_A]
assert group["membersCount"] == 1
group_id = group["id"]

# 2. Bruno entra no grupo
as_user(UID_B, "b@veloxy.dev")
r = client.post(f"/groups/{group_id}/join")
assert r.status_code == 200, r.text
group = r.json()
print("2. bruno entra:", group["memberIds"], group["membersCount"])
assert UID_B in group["memberIds"]
assert group["membersCount"] == 2

# 3. listar grupos
r = client.get("/groups")
assert r.status_code == 200, r.text
print("3. listar grupos:", len(r.json()), "grupo(s)")

# 4. Bruno posta no feed do grupo
r = client.post(f"/groups/{group_id}/posts", json={"text": "Bora treinar!"})
assert r.status_code == 200, r.text
post = r.json()
print("4. criar post:", post)
assert post["authorName"] == "Bruno Corredor"  # nome vem do join, nao do client
post_id = post["id"]

# 5. listar posts (nome do autor deve continuar aparecendo)
r = client.get(f"/groups/{group_id}/posts")
assert r.status_code == 200, r.text
posts = r.json()
print("5. listar posts:", posts)
assert posts[0]["authorName"] == "Bruno Corredor"

# 6. Ana curte o post
as_user(UID_A, "a@veloxy.dev")
r = client.post(f"/groups/{group_id}/posts/{post_id}/like", json={"isLiked": False})
assert r.status_code == 200, r.text
print("6. like:", r.json())
assert UID_A in r.json()["likes"]

# 7. Ana comenta
r = client.post(f"/groups/{group_id}/posts/{post_id}/comments", json={"text": "Partiu!"})
assert r.status_code == 200, r.text
comment = r.json()
print("7. comentario:", comment)
assert comment["authorName"] == "Ana Corredora"

# 8. commentsCount do post deve ter incrementado
r = client.get(f"/groups/{group_id}/posts")
assert r.json()[0]["commentsCount"] == 1
print("8. commentsCount apos comentario:", r.json()[0]["commentsCount"])

# 9. chat do grupo
r = client.post(f"/groups/{group_id}/messages", json={"text": "Chegando em 10min"})
assert r.status_code == 200, r.text
print("9. mensagem:", r.json())
assert r.json()["senderName"] == "Ana Corredora"

r = client.get(f"/groups/{group_id}/messages")
assert len(r.json()) == 1
print("9b. listar mensagens:", r.json())

# 10. weeklyKm do grupo atualiza ao salvar uma corrida de um membro
r = client.post("/activities", json={
    "userId": UID_A, "userName": "Ana Corredora", "userAvatar": None,
    "distance": 7.5, "time": "40:00", "durationSeconds": 2400, "pace": "5'20\"",
    "type": "RUNNING",
})
assert r.status_code == 200, r.text
r = client.get(f"/groups/{group_id}")
group = r.json()
print("10. weeklyKm apos corrida:", group["weeklyKm"], group["weeklyKmWeek"])
assert group["weeklyKm"] == 7.5
assert group["weeklyKmWeek"] is not None

# 11. joined-groups (usado pelo bridge do getUserProfile no frontend)
r = client.get(f"/groups/joined/{UID_A}")
assert r.status_code == 200, r.text
print("11. grupos de Ana:", r.json())
assert group_id in r.json()

# 12. Bruno sai do grupo
as_user(UID_B, "b@veloxy.dev")
r = client.post(f"/groups/{group_id}/leave")
assert r.status_code == 200, r.text
print("12. bruno sai:", r.json()["memberIds"], r.json()["membersCount"])
assert UID_B not in r.json()["memberIds"]
assert r.json()["membersCount"] == 1

# 13. so o criador pode trocar a foto do grupo
r = client.put(f"/groups/{group_id}/photo", json={"photoURL": "https://x/foto.png"})
assert r.status_code == 403, r.text
print("13. bruno (nao-criador) tenta trocar foto:", r.status_code)

as_user(UID_A, "a@veloxy.dev")
r = client.put(f"/groups/{group_id}/photo", json={"photoURL": "https://x/foto.png"})
assert r.status_code == 200, r.text
print("13b. ana (criadora) troca foto:", r.json()["photoURL"])

print("\nOK — fluxo completo de groups passou.")
