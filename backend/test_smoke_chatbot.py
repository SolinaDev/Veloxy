"""Teste manual de fumaça do chatbot de corrida.
Roda contra o Postgres de dev real, com override do dependency de auth."""

from fastapi.testclient import TestClient

from app.auth import FirebaseUser, get_current_user, require_verified_email
from app.main import app

TEST_UID = "smoke-test-chatbot-uid-001"
OUTRO_UID = "smoke-test-chatbot-uid-002"

CURRENT_UID = {"value": TEST_UID}


def fake_user():
    return FirebaseUser(uid=CURRENT_UID["value"], email="corredor@veloxy.dev", email_verified=True)


app.dependency_overrides[get_current_user] = fake_user
app.dependency_overrides[require_verified_email] = fake_user

client = TestClient(app)


def send(msg: str) -> str:
    r = client.post("/chatbot/message", json={"message": msg})
    assert r.status_code == 200, r.text
    return r.json()["reply"]


# 1. saudacao
reply = send("oi")
print("1. saudacao:", reply)
assert "Olá" in reply

# 2. pergunta direta de conhecimento (fartlek) — deve oferecer aprofundamento
reply = send("o que é fartlek?")
print("2. fartlek:", reply)
assert "alternância" in reply.lower() or "ritmos" in reply.lower()

# 2b. pede mais detalhes do ultimo topico
reply = send("me explica mais")
print("2b. fartlek detalhado:", reply)
assert len(reply) > 40

# 3. informa pace com contexto -> deve ser aceito
reply = send("meu pace é 4:25")
print("3. pace informado:", reply)

# 3b. zonas de treino, usando o pace ja memorizado (sem repetir o numero)
reply = send("quais minhas zonas de treino?")
print("3b. zonas:", reply)
assert "Zona 1" in reply and "Zona 5" in reply
assert "4:25" in reply or "referência" in reply.lower()

# 3c. zona especifica
reply = send("como e minha zona de tiro?")
print("3c. zona tiro:", reply)
assert "Zona 5" in reply

# 4. horario nao deve ser confundido com pace (regressao do bug do script original)
reply = send("vou treinar as 6:30 da manha, quanto tempo leva 10km?")
print("4. horario nao vira pace:", reply)
assert "4:25" in reply or "tempo" in reply.lower()

# 5. tempo estimado direto para maratona
reply = send("quanto tempo eu faria a maratona com pace 5:00?")
print("5. tempo maratona:", reply)
assert "h" in reply or "min" in reply

# 6. registrar treino
reply = send("registrar: 5, 30")
print("6. registrar treino:", reply)
assert "5.0km" in reply or "5,0km" in reply or "5.0" in reply

# 6b. registrar treino invalido
reply = send("registrar: abc, xyz")
print("6b. registrar invalido:", reply)
assert "inválido" in reply.lower() or "invalida" in reply.lower() or "número" in reply.lower()

# 7. estatisticas refletem o treino registrado
reply = send("estatísticas")
print("7. estatisticas:", reply)
assert "Treinos realizados: 1" in reply

# 7b. via endpoint dedicado
r = client.get("/chatbot/stats")
assert r.status_code == 200, r.text
stats = r.json()
print("7b. stats endpoint:", stats)
assert stats["treinos_realizados"] == 1
assert stats["melhor_pace_5k"] is not None, "recorde por distancia (5k) deveria ter sido preenchido"

# 8. meta
reply = send("meta: 42, 31/12/2026")
print("8. meta:", reply)
assert "42.0km" in reply or "42,0km" in reply or "42.0" in reply

reply = send("minhas metas")
print("8b. mostrar meta:", reply)
assert "31/12/2026" in reply

# 9. aprender comando + resposta customizada volta em pergunta parecida
reply = send("aprender: qual o melhor tenis pra pisada pronada | Recomendo tenis com suporte de arco.")
print("9. aprender:", reply)
assert "Aprendi" in reply

reply = send("qual o melhor tenis pra pisada pronada")
print("9b. resposta aprendida:", reply)
assert "suporte de arco" in reply

# 10. isolamento entre usuarios — outro usuario NAO deve ver o que o primeiro ensinou
# nem os treinos/metas do primeiro (corrige o vazamento global do script original)
CURRENT_UID["value"] = OUTRO_UID

reply = send("qual o melhor tenis pra pisada pronada")
print("10. outro usuario, mesma pergunta:", reply)
assert "suporte de arco" not in reply, "vazou resposta aprendida de outro usuario!"

reply = send("estatísticas")
print("10b. outro usuario, estatisticas:", reply)
assert "ainda não tem treinos" in reply, "vazou treino de outro usuario!"

reply = send("minhas metas")
print("10c. outro usuario, metas:", reply)
assert "ainda não definiu" in reply, "vazou meta de outro usuario!"

CURRENT_UID["value"] = TEST_UID

# 11. sem token deve rejeitar
del app.dependency_overrides[get_current_user]
del app.dependency_overrides[require_verified_email]
r = client.post("/chatbot/message", json={"message": "oi"})
print("11. sem token:", r.status_code)
assert r.status_code == 403

print("\nOK — todos os checks do chatbot passaram.")
