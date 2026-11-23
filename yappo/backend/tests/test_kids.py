def test_kids_mode_is_saved_on_the_profile(client):
    created = client.post(
        "/api/auth/register",
        json={"email": "kids@example.com", "password": "secretpass", "name": "Малыш"},
    )
    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    saved = client.patch("/api/settings", headers=headers, json={
        "language": "en",
        "mascot": "bunny",
        "daily_goal": 5,
        "timezone": "Europe/Moscow",
        "kids_mode": True,
    })
    assert saved.status_code == 200, saved.text
    assert saved.json()["kids_mode"] is True
