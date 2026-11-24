def test_chest_opens_once_a_day(client):
    created = client.post(
        "/api/auth/register",
        json={"email": "chest@example.com", "password": "secretpass", "name": "Сундук"},
    )
    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    first = client.post("/api/chest", headers=headers)
    assert first.status_code == 200, first.text
    assert 12 <= first.json()["coins"] <= 24
    second = client.post("/api/chest", headers=headers)
    assert second.status_code == 409
