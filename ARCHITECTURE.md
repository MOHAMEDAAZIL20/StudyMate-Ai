# Architecture

## Phase 1 components

```text
Browser: React + TypeScript + Lucide + Tailwind/CSS
    | fetch /api/health
Vite: 127.0.0.1:5173, development API proxy
    |
FastAPI: 127.0.0.1:8000
    | request-scoped SQLAlchemy Session
SQLite: backend/data/studymate.db
```

Frontend and backend are separate processes. Vite forwards relative `/api` requests so CORS configuration is unnecessary for this local setup. FastAPI checks database connectivity and returns a Pydantic response. No frontend database access. No public document routes. SQLAlchemy engine configuration is read from `DATABASE_URL` at process startup; the default path is independent of the working directory. Custom SQLite paths require their parent directory to exist.

## Structure

- `frontend/src/`: navigation, presentation, demo fixtures, styles.
- `backend/app/`: API and database infrastructure.
- `backend/tests/`: isolated API tests.
- `backend/data/`: ignored runtime state; never commit.
- Future `backend/app/ai/`: extraction orchestration, embeddings, retrieval, Ollama client. Not implemented yet.

## Database design

Phase 1 defines the declarative Base, engine, and request-session dependency. There are no domain tables or fake seeded records. Phase 2 will add semesters → subjects → units → topics with foreign keys, validated CRUD, and an explicit migration approach. Later tables: documents, extracted chunks, conversations, quizzes/questions/attempts/answers, exams, revision tasks. Preserve user data during upgrades; do not use drop-and-recreate as migration.

## API

- `GET /api/health`: 200 `{ "status": "ok", "database": "connected", "version": "0.1.0" }`; database query failures return 503 with a generic message.
- `/docs` and `/openapi.json`: generated FastAPI reference.
- Future resource endpoints use `/api/semesters`, `/api/subjects`, etc.; no CRUD endpoints exist yet.

## Planned RAG pipeline (Phase 4)

Validate upload → preserve original → extract page/slide text → chunk with source metadata → local embeddings → local vector index → subject-filtered retrieval → Ollama answer from retrieved context → citations mapped to actual source chunks.

If context is insufficient, say so. If the model is missing, show setup instructions. Never invent references. Generated quiz answers require explanations and source context and must not be marketed as guaranteed correct. No paid API requirement.

## Prototype boundary

Single-user loopback development. Authentication and hosted access are deferred. Demo content stays separate from persistent user records. AI and recommendations are deliberately absent until their approved phases. Weakness scores will be explainable revision-priority rules based on mistakes and recency, not claims of measured mastery.
