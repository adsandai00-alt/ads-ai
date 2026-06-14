# CLAUDE.md

Guidance for Claude Code sessions working in this repository.

## Project at a glance

This repo hosts the public website for the **Applied Data Science & AI (ADS & AI)** programme at **De Haagse Hogeschool**. The site is in **Dutch** and is deployed to GitHub Pages. Its primary call-to-action is the "Dien een opdracht in" form, through which companies submit project ideas for student teams.

A local **RAG chatbot** lives under `chatbot/`. It answers questions in Dutch + English for two audiences:
- **Students** — about the programme, the three project types, and how working on assignments is organised.
- **Companies** — about what makes a good assignment and an optional sanity check of their idea against the programme's requirements.

The chatbot is currently **local-only**; the static site is the public deliverable.

## Repository layout

```
ads-ai/
├── index.html              # static site (Dutch). Form posts to StaticForms API.
├── script.js               # form validation + chat widget client
├── styles.css              # all site styles (uses CSS vars defined in :root)
├── chatbot/                # Python RAG backend — see chatbot/README.md
│   ├── app.py              # FastAPI: POST /chat, POST /reset, GET /health
│   ├── rag.py              # detect_language, retrieve, answer
│   ├── ingest.py           # one-shot: builds chatbot/chroma_db/
│   ├── prompts.py          # system prompts × (student|company) × (nl|en)
│   ├── knowledge/          # Markdown KB, chunked on `##` headings
│   ├── tests/              # pytest + eval_questions.json (regression set)
│   └── README.md           # setup / testing / improvement guide
└── .github/workflows/static.yml   # GitHub Pages deploy
```

## Tech stack

- **Frontend**: vanilla HTML5 + CSS3 + JavaScript. **No build step, no framework.**
- **Backend (chatbot)**: Python 3, FastAPI, Uvicorn, ChromaDB (persistent), OpenAI (`gpt-4o-mini` for chat, `text-embedding-3-small` for embeddings).
- **Tests**: pytest, with a JSON-based retrieval-quality eval set.

## Common commands

```powershell
# preview the static site locally
# (open index.html in a browser, or use VS Code Live Server on :5500)

# one-time chatbot setup
cd chatbot
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env       # then paste OPENAI_API_KEY into .env
python ingest.py             # builds chroma_db/

# run the chatbot backend (every dev session)
uvicorn app:app --reload --port 8000

# re-index after editing any knowledge/*.md file
python ingest.py

# run tests
pytest
```

On macOS / Linux: `source .venv/bin/activate` instead of `Activate.ps1`.

## Conventions

- **Language.** User-facing copy on the site is in Dutch — keep new strings in Dutch. The chatbot replies in whichever language the user wrote in (auto-detected).
- **Knowledge chunking.** `chatbot/ingest.py` splits Markdown on `##` headings. Put **each Q&A or topic under its own `##`** so retrieval lands on a focused chunk.
- **Re-index after editing knowledge.** Running `python ingest.py` is required after any change to `chatbot/knowledge/*.md`; otherwise the bot returns stale answers.
- **Eval set is the regression suite.** When you add knowledge, also add a question to `chatbot/tests/eval_questions.json` that targets it.
- **CSS variables.** The chat widget reuses `--primary-color` / `--accent-color` etc. from `:root` in `styles.css`. New UI should do the same — do not hardcode hex codes.
- **Don't commit.** `.env`, `chatbot/.venv/`, `chatbot/chroma_db/` are gitignored. Keep them out of commits.

## Intentional simplicities (do not "improve" without checking)

- **Static site has no build step.** Do not introduce npm, a bundler, or a framework just to add a feature. Plain HTML/CSS/JS is the design choice.
- **Chatbot backend is local-only.** CORS is wide-open (`*`) on purpose — locking it down or adding auth only makes sense once the backend has a public deploy target.
- **In-memory session history.** Sessions live in a per-process Python dict (last 6 turns). Replace with SQLite only when going multi-user.
- **StaticForms API key in `index.html` is real and intentional.** The form posts directly to StaticForms; there is no backend proxy. Don't migrate that flow without a deliberate plan.

## Where to go next

- Architecture, full setup, improvement loop: `chatbot/README.md`.
- Edit the chatbot's knowledge: `chatbot/knowledge/*.md` (re-run `python ingest.py` after).
- Edit the gold regression set: `chatbot/tests/eval_questions.json`.
