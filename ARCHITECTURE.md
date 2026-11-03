# Architecture

## Current components (Phase 3)

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

The academic hierarchy is semesters -> subjects -> units -> topics. Each child stores its parent ID with a restrictive foreign key; SQLite foreign keys are enabled on every connection. Names are validated and unique within their parent. Topics include a self-reported completion boolean. No records are automatically seeded.

Phase 3 adds documents: subject_id (required), unit_id (optional), display filename, opaque storage key, file type, byte size, UTC creation timestamp, extraction status/warning, full extracted text, and JSON source sections (1-based page/slide numbers and text). The API validates that a chosen unit belongs to the chosen subject. Documents prevent academic parent deletion. Later tables will cover chunks, conversations, quizzes/attempts, and revision plans.

## API

- `GET /api/health`: 200 `{ "status": "ok", "database": "connected", "version": "0.1.0" }`; database query failures return 503 with a generic message.
- `/docs` and `/openapi.json`: generated FastAPI reference.
- `GET /api/workspace`: ordered lists of all four academic resources for this local single-user workspace.
- `POST /api/semesters`, `/api/subjects`, `/api/units`, `/api/topics`: create validated records.
- `PUT /api/{resource}/{id}`: rename; topics require the completed flag as well. No parent reassignment.
- `DELETE /api/{resource}/{id}`: 204 on success, 409 if children remain, 404 if missing.
- `POST /api/units/{id}/syllabus`: atomic topic-name import (1–200 names); skips existing case-insensitive duplicates and preserves completion.
- Validation errors: 422; duplicate conflicts: 409; missing records/parents: 404.

Phase 2 migration: `create_all` adds only absent tables to the existing Phase 1 database. Existing tables and data are never dropped. This is an additive bootstrap, not a general migration engine. Introduce versioned migrations before changing existing columns or constraints.

## Planned RAG pipeline (Phase 4)

Validate upload → preserve original → extract page/slide text → chunk with source metadata → local embeddings → local vector index → subject-filtered retrieval → Ollama answer from retrieved context → citations mapped to actual source chunks.

If context is insufficient, say so. If the model is missing, show setup instructions. Never invent references. Generated quiz answers require explanations and source context and must not be marketed as guaranteed correct. No paid API requirement.

## Prototype boundary

Single-user loopback development. Authentication and hosted access are deferred. Demo content stays separate from persistent user records. AI and recommendations are deliberately absent until their approved phases. Weakness scores will be explainable revision-priority rules based on mistakes and recency, not claims of measured mastery.

## Frontend academic workspace

`api.ts` centralizes typed JSON requests and request timeouts. `AcademicWorkspace.tsx` provides actual-data overview and hierarchy editors. Native dialog elements provide modal focus management and Escape handling. Mutations disable controls while saving, surface validation/API failures, and reload authoritative database records. Empty and failed-load states do not fall back to sample records. Search is local to the selected semester. TXT syllabus files are parsed in the browser for review; only topic strings are sent to the API. No original files are stored in Phase 2.


## Phase 3 document flow

POST /api/documents receives multipart `file`, `subject_id`, optional `unit_id`. A request-body guard caps input at 21 MB before full multipart spooling; the handler caps file bytes at 20 MB. Filename extensions are allowlisted and actual content is parsed rather than trusting client MIME headers. PyMuPDF reads unlocked PDFs; python-pptx extracts slide text, grouped shapes, and tables; TXT is decoded as UTF-8. PPTX archive expansion and section/text counts are bounded.

Successful uploads (including valid no-text files) preserve original bytes in a UUID-owned file outside static serving, then commit a Document row. Parser failures store no document; database failures roll back and clean up only that upload's owned file. Ready/no_text/needs_ocr are honest extraction states, not embedding/indexing states. Scanned/mixed pages retain source numbers for future OCR/RAG.

- GET /api/documents: metadata list, newest first, optional literal q/subject_id/unit_id filters.
- GET /api/documents/{id}: text and page/slide sections; no storage keys exposed.
- GET /api/documents/{id}/original: validated ID lookup, attachment download, no-store/nosniff headers.
- PUT /api/documents/{id}: validated subject/unit reassignment.
- DELETE /api/documents/{id}: stage original, commit record deletion, then unlink staged file. If commit fails, restore original. UI requires confirmation.

File operations cannot share SQLite atomicity. Crashes or failed cleanup can leave private orphan/staged files; this is documented and must not trigger broad automatic deletion. Backups include SQLite and originals together. This remains single-user loopback access without authentication; controlled API download is not public static hosting.

Phase 3 adds only the documents table and its indexes via additive initialization; no existing columns/data are reset. Future changes to existing schemas require versioned migrations. Frontend FormData uploads have a 120-second client timeout; ordinary JSON API calls have a 10-second timeout. RecentMaterials reads actual upload metadata for the overview dashboard.


## Phase 4 implementation (verification in progress)
Local AI routes: GET /api/ai/status and POST /api/ai/ask (subject_id, question).
The assistant uses Ollama at 127.0.0.1:11434 for both embeddings and generation. Defaults: nomic-embed-text:latest and qwen2.5:3b; override OLLAMA_EMBED_MODEL and OLLAMA_CHAT_MODEL in backend environment. No paid APIs.
Source sections are split into 1,200-character chunks with 200-character overlap. Embeddings are cached privately in backend/data/embeddings.sqlite3, keyed by model digest and text hash. Exact cosine search selects up to six passages within the current subject. Only current document records participate, so removed/reassigned documents cannot supply new answers. Cached vectors contain no source labels or original text, but remain private derived data. No academic schema was changed.
The 0.35 retrieval cutoff is a prototype heuristic, not a confidence probability. Citation IDs are validated against retrieved passages, and labels come from stored metadata. This does not prove every generated claim is supported; real-model grounding evaluation remains necessary. Prompt instructions discourage following instructions in source documents but are not a formal guarantee.
Limits: 2,000 chunks per subject; first-query indexing is synchronous and may take many minutes. Each Ollama request times out after 120 seconds. The browser allows 30 minutes for a question. Chat turns are held in page memory separately by subject; questions are self-contained and previous turns are not used as evidence. No persisted conversation history yet.
Setup: install Ollama from https://ollama.com/download/windows, run `ollama pull nomic-embed-text:latest`, `ollama pull qwen2.5:3b`, then `ollama serve` if the desktop service is not already running. Start FastAPI/Vite using the existing Windows commands. Open AI assistant, select a subject with text-based materials, and ask a question. Check the expandable source excerpts and ask an unrelated question to test abstention.
Current verification: 19 backend tests pass; TypeScript/Vite build passes. Tests use controlled model responses for citation mapping, subject isolation, removed-document exclusion, absent context, and invalid vectors. Real Ollama answer quality and browser chat workflow are not yet verified. Phase 4 is not marked complete until local model setup and live checks finish. Phase 5 requires separate approval.


Verification update (3 November 2026): both configured models are installed and /api/ai/status reports ready. Real local-model checks against isolated fictional notes produced the correct seven-packets/13-second answer with its stored source, and abstained on undocumented encryption. This is a limited smoke test, not comprehensive accuracy validation. Browser assistant loads with actual subject choices and ready status. A Windows SQLite connection-handle cleanup issue discovered during verification was fixed; 20 backend tests now pass, including cache reuse and handle closure. Full populated browser chat and phone-layout checks remain pending. User study records were not modified by this verification.
