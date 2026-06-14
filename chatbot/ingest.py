"""One-shot ingestion script.

Reads every .md file under chatbot/knowledge/, splits on ## headings,
embeds each chunk with OpenAI text-embedding-3-small, and stores the
results in a persistent ChromaDB collection named "ads_ai_kb".

Idempotent: deletes the collection if it already exists, then rebuilds.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

KNOWLEDGE_DIR = Path(__file__).parent / "knowledge"
CHROMA_DIR = os.getenv("CHROMA_DIR", str(Path(__file__).parent / "chroma_db"))
EMBED_MODEL = os.getenv("OPENAI_EMBED_MODEL", "text-embedding-3-small")
COLLECTION_NAME = "ads_ai_kb"

_HEADING_RE = re.compile(r"^##\s+(.+?)\s*$", re.MULTILINE)


def split_markdown(text: str, source: str) -> list[dict]:
    """Split a markdown document into chunks on ## headings.

    Returns list of {text, source, heading}. The top of the file (before the
    first ##) becomes a chunk with heading = the file's first # title or "intro".
    """
    title_match = re.search(r"^#\s+(.+?)\s*$", text, re.MULTILINE)
    file_title = title_match.group(1).strip() if title_match else source

    parts: list[dict] = []
    matches = list(_HEADING_RE.finditer(text))

    if not matches:
        parts.append({"text": text.strip(), "source": source, "heading": file_title})
        return parts

    # Intro region (before first ##)
    intro = text[: matches[0].start()].strip()
    if intro and len(intro) > 80:
        parts.append({"text": intro, "source": source, "heading": file_title})

    for i, m in enumerate(matches):
        heading = m.group(1).strip()
        start = m.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        if body:
            parts.append({"text": body, "source": source, "heading": heading})

    return parts


def embed_batch(client: OpenAI, texts: list[str]) -> list[list[float]]:
    resp = client.embeddings.create(model=EMBED_MODEL, input=texts)
    return [d.embedding for d in resp.data]


def main() -> int:
    if not os.getenv("OPENAI_API_KEY"):
        raise SystemExit("OPENAI_API_KEY not set. Copy .env.example to .env and fill it in.")

    client = OpenAI()
    chroma = chromadb.PersistentClient(path=CHROMA_DIR, settings=Settings(anonymized_telemetry=False))

    # Idempotent rebuild
    try:
        chroma.delete_collection(COLLECTION_NAME)
    except Exception:
        pass
    collection = chroma.create_collection(
        name=COLLECTION_NAME,
        metadata={"hnsw:space": "cosine"},
    )

    chunks: list[dict] = []
    for md in sorted(KNOWLEDGE_DIR.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        chunks.extend(split_markdown(text, source=md.name))

    if not chunks:
        raise SystemExit(f"No chunks found under {KNOWLEDGE_DIR}.")

    texts = [c["text"] for c in chunks]
    embeddings = embed_batch(client, texts)

    collection.add(
        ids=[f"{c['source']}::{i}" for i, c in enumerate(chunks)],
        documents=texts,
        embeddings=embeddings,
        metadatas=[{"source": c["source"], "heading": c["heading"]} for c in chunks],
    )

    print(f"Indexed {len(chunks)} chunks from {len(list(KNOWLEDGE_DIR.glob('*.md')))} files into '{COLLECTION_NAME}'.")
    for c in chunks:
        print(f"  - {c['source']}  >  {c['heading']}  ({len(c['text'])} chars)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
