def test_rome_is_a_premium_city(client):
    created = client.post(
        "/api/auth/register",
        json={"email": "rome@example.com", "password": "secretpass", "name": "Рим"},
    )
    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    client.post("/api/onboarding", headers=headers, json={
        "language": "en", "mascot": "parrot", "daily_goal": 10, "timezone": "Europe/Moscow",
    })
    path = client.get("/api/path", headers=headers)
    assert path.status_code == 200, path.text
    rome = path.json()["chapters"][-1]
    assert rome["id"] == "en-4"
    assert rome["premium"] is True
    assert rome["unlocked"] is False
    assert all(node["status"] == "locked" for node in rome["nodes"])
    closed = client.get("/api/lessons/en-4-vocab", headers=headers)
    assert closed.status_code == 403
