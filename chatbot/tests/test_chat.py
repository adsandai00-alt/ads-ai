"""End-to-end chat tests.

Hit the FastAPI app via TestClient. Skipped without OPENAI_API_KEY or a
populated ChromaDB.
"""

from __future__ import annotations

import os
import uuid
from pathlib import Path

import pytest


def _has_chroma() -> bool:
    chroma_dir = Path(os.getenv("CHROMA_DIR", Path(__file__).resolve().parent.parent / "chroma_db"))
    return chroma_dir.exists() and any(chroma_dir.iterdir())


pytestmark = [
    pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="OPENAI_API_KEY not set"),
    pytest.mark.skipif(not _has_chroma(), reason="ChromaDB not populated; run ingest.py first"),
]


@pytest.fixture
def client():
    from fastapi.testclient import TestClient
    from app import app
    return TestClient(app)


def test_health(client):
    assert client.get("/health").json() == {"ok": True}


def test_chat_student_nl_projecttypen(client):
    res = client.post("/chat", json={
        "message": "Welke soorten opdrachten kan ik doen?",
        "user_type": "student",
        "session_id": str(uuid.uuid4()),
    })
    assert res.status_code == 200
    data = res.json()
    assert data["lang"] == "nl"
    text = data["reply"].lower()
    assert any(kw in text for kw in ["machine learning", "deep learning", "autonomous"]), \
        f"Reply missing project type keywords: {data['reply']}"
    assert any(s["source"] == "project_types.md" for s in data["sources"])


def test_chat_company_en_assignment_fit(client):
    res = client.post("/chat", json={
        "message": "What makes a good ML assignment for your students?",
        "user_type": "company",
        "session_id": str(uuid.uuid4()),
    })
    assert res.status_code == 200
    data = res.json()
    assert data["lang"] == "en"
    text = data["reply"].lower()
    assert "dataset" in text
    assert any("problem" in text for _ in [0]) or "probleemstelling" in text


def test_chat_unknown_falls_back_to_contact(client):
    """A question the KB cannot answer should still gracefully point at Mirabai."""
    res = client.post("/chat", json={
        "message": "Hoeveel parkeerplekken zijn er op de campus?",
        "user_type": "student",
        "session_id": str(uuid.uuid4()),
    })
    assert res.status_code == 200
    text = res.json()["reply"]
    # Either says it doesn't know, or names Mirabai (the contact path).
    assert "Mirabai" in text or "weet" in text.lower() or "geen" in text.lower()


def test_session_reset(client):
    sid = str(uuid.uuid4())
    client.post("/chat", json={
        "message": "Wat is jaar 1 van de opleiding?",
        "user_type": "student",
        "session_id": sid,
    })
    res = client.post("/reset", json={"session_id": sid})
    assert res.json() == {"ok": True}
