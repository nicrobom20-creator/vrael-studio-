def test_missed_word_comes_back_until_it_is_known(client):
    created = client.post(
        "/api/auth/register",
        json={"email": "words@example.com", "password": "secretpass", "name": "Лекс"},
    )
    headers = {"Authorization": f"Bearer {created.json()['token']}"}
    saved = client.post("/api/words", headers=headers, json={"front": "Thank you", "back": "Спасибо"})
    assert saved.status_code == 200, saved.text
    due = client.get("/api/words", headers=headers)
    assert due.status_code == 200
    card = due.json()["words"][0]
    assert card["front"] == "Thank you"
    again = client.post(f"/api/words/{card['id']}/grade", headers=headers, json={"ok": False})
    assert again.status_code == 200
    assert again.json()["box"] == 1
    known = client.post(f"/api/words/{card['id']}/grade", headers=headers, json={"ok": True})
    assert known.status_code == 200
    assert known.json()["box"] == 2
    empty = client.get("/api/words", headers=headers)
    assert empty.json()["words"] == []
