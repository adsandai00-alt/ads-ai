"""FastAPI server for the ADS & AI RAG chatbot.

Endpoints:
- GET  /health          health check
- POST /chat            { message, user_type, session_id, lang? } -> {reply, sources, lang}
- POST /reset           { session_id }                            -> {ok: true}

Session memory is in-process: a dict keyed by session_id holding the last few
turns. Fine for local development; replace with a persistent store if exposed
to multiple users.
"""

from __future__ import annotations

from collections import defaultdict, deque
from typing import Literal

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from rag import answer

MAX_HISTORY_TURNS = 6  # user+assistant pairs kept per session

app = FastAPI(title="ADS & AI RAG chatbot", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_sessions: dict[str, deque] = defaultdict(lambda: deque(maxlen=MAX_HISTORY_TURNS * 2))


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    user_type: Literal["student", "company"] = "student"
    session_id: str = Field(min_length=1, max_length=128)
    lang: Literal["nl", "en"] | None = None


class Source(BaseModel):
    source: str
    heading: str


class ChatResponse(BaseModel):
    reply: str
    sources: list[Source]
    lang: Literal["nl", "en"]


class ResetRequest(BaseModel):
    session_id: str


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    history = list(_sessions[req.session_id])
    try:
        result = answer(
            message=req.message,
            user_type=req.user_type,
            history=history,
            lang_override=req.lang,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"chat failed: {e}")

    _sessions[req.session_id].append({"role": "user", "content": req.message})
    _sessions[req.session_id].append({"role": "assistant", "content": result["reply"]})

    return ChatResponse(**result)


@app.post("/reset")
def reset(req: ResetRequest) -> dict:
    _sessions.pop(req.session_id, None)
    return {"ok": True}
