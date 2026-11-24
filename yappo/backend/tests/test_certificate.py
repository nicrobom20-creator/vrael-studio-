def test_certificate_waits_for_the_first_chapter(client):
    created = client.post(
        "/api/auth/register",
        json={"email": "paper@example.com", "password": "secretpass", "name": "Анна"},
    )
    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    client.post("/api/onboarding", headers=headers, json={
        "language": "en",
        "mascot": "parrot",
        "daily_goal": 10,
        "timezone": "Europe/Moscow",
    })
    paper = client.get("/api/certificate", headers=headers)
    assert paper.status_code == 200, paper.text
    assert paper.json()["eligible"] is False
    assert paper.json()["name"] == "Анна"
