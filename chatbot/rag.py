"""Retrieval-Augmented Generation pipeline.

- detect_language(text) -> "nl" | "en"
- retrieve(query, k) -> list of chunks
- answer(message, user_type, history) -> {reply, sources, lang}
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv
from langdetect import DetectorFactory, detect
from openai import OpenAI

from prompts import Language, UserType, system_prompt

load_dotenv()
DetectorFactory.seed = 0  # deterministic langdetect

CHROMA_DIR = os.getenv("CHROMA_DIR", str(Path(__file__).parent / "chroma_db"))
EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
CHAT_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
TOP_K = int(os.getenv("TOP_K", "4"))
COLLECTION_NAME = "ads_ai_kb"

_client: OpenAI | None = None
_collection: Any | None = None


def _openai() -> OpenAI:
    global _client
    if _client is None:
        _client = OpenAI()
    return _client


def _chroma_collection():
    global _collection
    if _collection is None:
        chroma = chromadb.PersistentClient(path=CHROMA_DIR, settings=Settings(anonymized_telemetry=False))
        _collection = chroma.get_collection(COLLECTION_NAME)
    return _collection


def detect_language(text: str) -> Language:
    """Return 'nl' or 'en'. Defaults to 'nl' on detection failure."""
    try:
        code = detect(text)
    except Exception:
        return "nl"
    return "en" if code == "en" else "nl"


def retrieve(query: str, k: int = TOP_K) -> list[dict]:
    """Top-k chunks for the query. Returns [{text, source, heading, distance}]."""
    emb = _openai().embeddings.create(model=EMBED_MODEL, input=[query]).data[0].embedding
    res = _chroma_collection().query(query_embeddings=[emb], n_results=k)
    out: list[dict] = []
    docs = res["documents"][0]
    metas = res["metadatas"][0]
    dists = res["distances"][0] if res.get("distances") else [None] * len(docs)
    for doc, meta, dist in zip(docs, metas, dists):
        out.append({
            "text": doc,
            "source": meta.get("source", ""),
            "heading": meta.get("heading", ""),
            "distance": dist,
        })
    return out


def _format_context(chunks: list[dict]) -> str:
    lines = []
    for i, c in enumerate(chunks, 1):
        lines.append(f"[bron {i}: {c['source']} > {c['heading']}]\n{c['text']}")
    return "\n\n---\n\n".join(lines)


def answer(
    message: str,
    user_type: UserType,
    history: list[dict] | None = None,
    lang_override: Language | None = None,
) -> dict:
    """Generate an answer.

    history: list of {"role": "user"|"assistant", "content": str} from prior turns.
    Returns {"reply": str, "sources": [{source, heading}], "lang": "nl"|"en"}.
    """
    lang: Language = lang_override or detect_language(message)
    chunks = retrieve(message)
    context = _format_context(chunks)

    sys = system_prompt(user_type, lang)
    context_msg_nl = f"Hieronder vind je context uit onze kennisbank. Gebruik UITSLUITEND deze context.\n\n{context}"
    context_msg_en = f"Below is context from our knowledge base. Use ONLY this context.\n\n{context}"
    context_msg = context_msg_nl if lang == "nl" else context_msg_en

    msgs: list[dict] = [{"role": "system", "content": sys}]
    msgs.extend(history or [])
    msgs.append({"role": "system", "content": context_msg})
    msgs.append({"role": "user", "content": message})

    resp = _openai().chat.completions.create(
        model=CHAT_MODEL,
        messages=msgs,
        temperature=0.2,
    )
    reply = resp.choices[0].message.content or ""

    return {
        "reply": reply.strip(),
        "sources": [{"source": c["source"], "heading": c["heading"]} for c in chunks],
        "lang": lang,
    }
