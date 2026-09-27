def test_request_without_token_is_rejected(client):
    assert client.get("/users/ana").status_code == 403


def test_invalid_token_is_rejected(client):
    response = client.get("/users/ana", headers={"Authorization": "Bearer nao-e-um-jwt"})
    assert response.status_code == 401


def test_unverified_email_cannot_save_runs(client, login):
    from tests.helpers import run_payload

    login("ana", email_verified=False)
    response = client.post("/activities", json=run_payload("ana"))
    assert response.status_code == 403
    assert "Confirme seu email" in response.json()["detail"]


def test_static_routes_are_not_captured_by_user_id(client, make_user):
    make_user("ana")
    assert client.get("/users/by-ids?ids=ana").json()[0]["uid"] == "ana"
    assert client.get("/users/ranking/global").status_code == 200
    assert client.get("/activities/by-users?user_ids=ana").status_code == 200
