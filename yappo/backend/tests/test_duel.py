def test_shadow_duel_pays_when_you_beat_two(client):
    created = client.post(
        "/api/auth/register",
        json={"email": "duel@example.com", "password": "secretpass", "name": "Боец"},
    )
    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    result = client.post("/api/duels/shadow", headers=headers, json={"answers": {
        "thanks": "Thank you",
        "tea": "A tea, please.",
        "from": "I'm from Russia.",
        "where": "nope",
        "much": "nope",
    }})
    assert result.status_code == 200, result.text
    assert result.json()["your_score"] == 3
    assert result.json()["shadow"] == 2
    assert result.json()["prize"] == 15

    opened = client.post("/api/duels", headers=headers)
    assert opened.status_code == 200
    assert len(opened.json()["code"]) == 6
