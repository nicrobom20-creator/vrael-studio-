def test_new_learner_starts_in_bronze(client):
    created = client.post(
        "/api/auth/register",
        json={"email": "league@example.com", "password": "secretpass", "name": "Лига"},
    )
    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    league = client.get("/api/league", headers=headers)
    assert league.status_code == 200, league.text
    body = league.json()
    assert body["code"] == "bronze"
    assert body["title"] == "Бронза"
    assert any(row["you"] for row in body["board"])
