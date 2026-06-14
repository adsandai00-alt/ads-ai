"""Retrieval-quality tests.

Each gold question must surface the expected source markdown file inside the
top-k retrieved chunks. Requires OPENAI_API_KEY and a populated ChromaDB
(run `python ingest.py` first). Skipped automatically if either is missing.
"""

from __future__ import annotations

import json
import os
from pathlib import Path

import pytest

EVAL_PATH = Path(__file__).parent / "eval_questions.json"


def _has_chroma() -> bool:
    chroma_dir = Path(os.getenv("CHROMA_DIR", Path(__file__).resolve().parent.parent / "chroma_db"))
    return chroma_dir.exists() and any(chroma_dir.iterdir())


pytestmark = [
    pytest.mark.skipif(not os.getenv("OPENAI_API_KEY"), reason="OPENAI_API_KEY not set"),
    pytest.mark.skipif(not _has_chroma(), reason="ChromaDB not populated; run ingest.py first"),
]


def _load_eval() -> list[dict]:
    return json.loads(EVAL_PATH.read_text(encoding="utf-8"))


def test_eval_file_loads():
    items = _load_eval()
    assert len(items) >= 10, "Eval set should have at least 10 questions"
    required = {"id", "lang", "user_type", "question", "expected_source"}
    for item in items:
        assert required.issubset(item.keys()), f"Item missing required keys: {item}"


@pytest.mark.parametrize("item", _load_eval(), ids=lambda i: i["id"])
def test_retrieval_surfaces_expected_source(item):
    from rag import retrieve

    chunks = retrieve(item["question"], k=4)
    sources = {c["source"] for c in chunks}
    assert item["expected_source"] in sources, (
        f"Question {item['id']!r}: expected {item['expected_source']} in top-4 sources, got {sources}"
    )


def test_retrieval_topk_hit_rate(capsys):
    """Sanity number: print top-4 hit rate across the whole eval set."""
    from rag import retrieve

    items = _load_eval()
    hits = 0
    for item in items:
        chunks = retrieve(item["question"], k=4)
        if item["expected_source"] in {c["source"] for c in chunks}:
            hits += 1
    rate = hits / len(items)
    with capsys.disabled():
        print(f"\nRetrieval top-4 hit rate: {hits}/{len(items)} = {rate:.0%}")
    assert rate >= 0.8, f"Hit rate {rate:.0%} below 80%; tune chunking or embeddings"
