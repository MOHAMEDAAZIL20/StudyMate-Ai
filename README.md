# StudyMate AI

A local, personalized study assistant for college students. **Phase 3: document management.** No paid services required.

## What works now

- Responsive React dashboard and seven navigable destinations, with browser back/forward support.
- Create and rename semesters, subjects, units, and topics; delete individual items with confirmation and parent-child protection.
- Search subjects, units, and topics within a semester; mark topics complete.
- Import syllabus topics by pasting text or reviewing a UTF-8 TXT file.
- Dashboard counts and subject progress come from actual saved records.
- Upload PDF, PPTX, and TXT materials with subject/unit categorization; preserve originals and extracted text.
- Search filenames and content, preview text by page/slide, download originals, change categories, and confirm removal.
- Recent uploads appear on the dashboard.
- Live backend/database connection status with retry and an unavailable state.
- FastAPI `/api/health`, interactive API docs, SQLAlchemy sessions, and a local SQLite database.

AI, quizzes, recommendations, and exam planning are future phases. No student records are seeded. Old Phase 1 fixtures remain isolated in `frontend/src/demo.ts` and are not displayed. Syllabus TXT import in My subjects creates topic names; Study materials uploads preserve original files and source text. These are separate actions; uploading a syllabus does not automatically create or complete topics.

## Windows setup

Use PowerShell. Node 24 LTS and Python 3.13 are the verified environment. Node must satisfy Vite's requirement of 20.19+ or 22.12+; use a supported LTS release. See [Vite requirements](https://vite.dev/guide/) and [FastAPI installation](https://fastapi.tiangolo.com/).

Dependencies are already installed in this checkout. For a fresh checkout:

```powershell
cd C:\StudyMate-Codex
py -3.13 -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-lock.txt
cd frontend
npm ci
```

On this machine `python` points to an unusable Windows alias and `py` reports no registered interpreter. If creating the environment again, use the installed interpreter explicitly:

```powershell
& "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe" -m venv .venv
```

No activation or PowerShell execution policy change is needed. The lock file contains the exact verified backend and test dependencies. `requirements.txt` and `requirements-dev.txt` define supported ranges for deliberate upgrades.

## Run in two terminals

Terminal 1 — Python API and database:

```powershell
cd C:\StudyMate-Codex\backend
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000 --env-file .env.example
```

Terminal 2 — frontend:

```powershell
cd C:\StudyMate-Codex\frontend
npm run dev
```

Open [StudyMate](http://127.0.0.1:5173), [health](http://127.0.0.1:8000/api/health), or [API docs](http://127.0.0.1:8000/docs). Stop each server with Ctrl+C. Bind to loopback only; this prototype has no authentication.

Optional configuration: copy `backend/.env.example` to `backend/.env` and change `--env-file` to `.env`. Copy `frontend/.env.example` to `frontend/.env.local` if needed. Restart servers after environment changes. For development leave `VITE_API_BASE_URL` blank: Vite forwards `/api` requests to FastAPI on port 8000. Vite preview only serves the production UI and does not provide that development API proxy.

## Verify

```powershell
cd C:\StudyMate-Codex\backend
..\.venv\Scripts\python.exe -m pytest -q
cd ..\frontend
npm run build
```

1. Confirm health returns `status: ok` and `database: connected`.
2. Check `backend/data/studymate.db` exists. The database now contains semesters, subjects, units, and topics.
3. Open every sidebar destination; use browser Back and Forward.
4. Follow the Phase 2 walkthrough below, then search for one of your saved subject or topic names.
5. Resize to phone width and use the navigation menu.
6. Stop the backend, click Retry (or reload), and confirm Backend unavailable. Restart it and retry to reconnect.

## Understanding the foundation

React renders the browser interface; TypeScript catches inconsistent data types before shipping. Vite runs the frontend server and builds browser assets. Tailwind provides the styling pipeline; reusable CSS classes implement the design system. Lucide provides consistent icons.

FastAPI handles HTTP requests in Python. Pydantic defines the health response shape. SQLAlchemy manages database connections; SQLite stores data in a file without running another server. The browser calls `/api/health` using `fetch`; Vite proxies that request to FastAPI, which runs `SELECT 1` before responding.

Important files: `frontend/src/main.tsx` (UI and navigation), `frontend/src/styles.css` (responsive design), `frontend/src/demo.ts` (sample records), `backend/app/main.py` (API), `backend/app/database.py` (database foundation), and `backend/tests/test_health.py` (API tests).

Before Phase 4, learn embeddings, text chunking, vector similarity, and the difference between retrieving source text and generating an answer. See ARCHITECTURE.md and PROJECT_PLAN.md for the next steps.

## Limits

Local development only; production deployment, authentication, dark mode, OCR, and AI remain future work. Scanned PDFs require an additional OCR pipeline. Never delete the database as a routine reset; future schema changes must preserve student data.


## Phase 2 walkthrough

1. Open **My subjects** → **Add semester**, for example Semester 3.
2. Use the **+** beside Subjects to add a subject, then **Add unit**.
3. Add a topic or choose **Import syllabus text**. Paste one topic per line or select a UTF-8 `.txt` file up to 100 KB. Review the text; import supports up to 200 lines of 120 characters each. Duplicates in that unit are skipped without changing existing completion.
4. Tick a topic checkbox. Refresh the page: completion persists. Open Overview to see the stored counts and progress.
5. Use pencil controls to rename records. Search matches subject, unit, and topic names within the selected semester.
6. Removal asks for confirmation. Remove individual topics before their unit, units before their subject, and subjects before their semester. The API refuses cascading deletion.
7. Stop and restart FastAPI, then reload: your hierarchy remains in SQLite. Avoid deleting the database file.

API routes: `GET /api/workspace`; `POST /api/{semesters|subjects|units|topics}`; `PUT` and `DELETE /api/{resource}/{id}`; `POST /api/units/{id}/syllabus`. Explore validated request bodies at `/docs`. PUT renames records; for topics it includes the completed flag. Parent reassignment is intentionally not supported.

New important files: `backend/app/models.py` (tables and foreign keys), `schemas.py` (input validation), `academics.py` (resource endpoints); `frontend/src/api.ts` (typed HTTP client), `AcademicWorkspace.tsx` (workspace, dashboard, and editors).

React sends JSON through Vite to FastAPI. Pydantic validates input, SQLAlchemy commits a transaction, and React reloads the saved workspace. A foreign key stores the parent record's ID, so every topic belongs to a real unit. Checkbox completion is self-reported progress, not a measure of mastery.

The Phase 2 database upgrade is additive: startup creates four previously absent tables and never drops or recreates existing tables. It does not support changing existing table columns. Back up the SQLite file with the backend stopped before future schema changes; a versioned migration system must be introduced before altering this schema.


## Phase 3 walkthrough

If updating from Phase 2, install the updated lock file before restarting the backend:

```powershell
cd C:\StudyMate-Codex
.\.venv\Scripts\python.exe -m pip install -r backend\requirements-lock.txt
```

Run the same two-terminal commands above. Open **Study materials**:

1. Ensure a subject exists in My subjects, then choose **Upload material**.
2. Select its subject and optionally a unit. Choose a text-based PDF, PPTX, or UTF-8 TXT file up to 20 MB, then upload. The UI reports uploading/extracting and any failure.
3. Open **Preview text**. PDF page and PPTX slide numbers match the original. Use **Download original** to retrieve the preserved bytes. This is a text preview, not a visual reproduction of slide/PDF layouts.
4. Search for a filename or phrase in its extracted text; narrow by subject/unit. Search is literal and case behavior follows SQLite LIKE (case-insensitive for ASCII).
5. Use **Categorize** to move the material to another subject/unit. Incompatible unit/subject combinations are rejected.
6. Refresh or restart the backend: records, original files, and extracted text remain. Recent uploads appear on Overview.
7. A scanned/image-only PDF is stored with **Needs OCR**; empty text/PPTX content shows **No readable text**. Mixed PDFs can show warnings for pages without text. Original files remain downloadable. Text extraction does not assess factual accuracy.
8. Removal asks for confirmation and removes the document record, extracted text, and original. It does not remove syllabus topics. Subjects/units with attached documents are protected until documents are moved or removed.

Storage: metadata, complete extracted text, and page/slide sections are in SQLite; UUID-named originals are in `backend/data/uploads/`. Both are excluded from Git. No private filesystem paths are returned by the document API. Keep this unauthenticated prototype bound to 127.0.0.1.

Limits: 20 MB per file, 21 MB total multipart request including overhead, 1,000 PDF pages/PPTX slides, and 2 million extracted characters (plus section separators). PPTX expanded ZIP content is capped at 100 MB/10,000 entries. PDFs must be unlocked; TXT must be UTF-8. Images, handwritten notes, diagrams, and slide speaker notes are not extracted. No OCR or AI is invoked. A timeout or connection loss can leave a completed upload on the server; refresh the library before retrying to avoid duplicates.

New files: `backend/app/documents.py` (upload/storage/API), `extraction.py` (PyMuPDF/python-pptx extraction), `frontend/src/StudyMaterials.tsx` (library/editors), and `backend/tests/test_documents.py` (real parser and storage tests). React sends files as multipart FormData; FastAPI validates size/category/content, extracts text, writes the original, and commits metadata. The same endpoint layer retrieves previews and downloads; the upload directory is never mounted as public static content.

Back up the whole `backend/data` directory with the backend stopped. Phase 3 adds a documents table without altering or dropping existing academic tables. File operations and SQLite commits are coordinated but not one atomic transaction across crashes: a crash can leave an orphan original or `.deleting` file. Keep these private and inspect against document records before manual cleanup; do not delete the uploads directory as a reset. Failed upload cleanup or final deletion cleanup issues produce a backend warning. A rare failure to unlink a staged file can leave private residual bytes even though its record is removed.

Dependency note: PyMuPDF is supplied under AGPL/commercial licensing. This project uses the free open-source distribution; review its official license before distributing a derived application. See [PyMuPDF licensing](https://pymupdf.io/licensing). `python-pptx` reads slide text/tables; `python-multipart` parses browser uploads. The lock file records the tested Windows/Python 3.13 environment.


## Phase 4 implementation (verification in progress)
Local AI routes: GET /api/ai/status and POST /api/ai/ask (subject_id, question).
The assistant uses Ollama at 127.0.0.1:11434 for both embeddings and generation. Defaults: nomic-embed-text:latest and qwen2.5:3b; override OLLAMA_EMBED_MODEL and OLLAMA_CHAT_MODEL in backend environment. No paid APIs.
Source sections are split into 1,200-character chunks with 200-character overlap. Embeddings are cached privately in backend/data/embeddings.sqlite3, keyed by model digest and text hash. Exact cosine search selects up to six passages within the current subject. Only current document records participate, so removed/reassigned documents cannot supply new answers. Cached vectors contain no source labels or original text, but remain private derived data. No academic schema was changed.
The 0.35 retrieval cutoff is a prototype heuristic, not a confidence probability. Citation IDs are validated against retrieved passages, and labels come from stored metadata. This does not prove every generated claim is supported; real-model grounding evaluation remains necessary. Prompt instructions discourage following instructions in source documents but are not a formal guarantee.
Limits: 2,000 chunks per subject; first-query indexing is synchronous and may take many minutes. Each Ollama request times out after 120 seconds. The browser allows 30 minutes for a question. Chat turns are held in page memory separately by subject; questions are self-contained and previous turns are not used as evidence. No persisted conversation history yet.
Setup: install Ollama from https://ollama.com/download/windows, run `ollama pull nomic-embed-text:latest`, `ollama pull qwen2.5:3b`, then `ollama serve` if the desktop service is not already running. Start FastAPI/Vite using the existing Windows commands. Open AI assistant, select a subject with text-based materials, and ask a question. Check the expandable source excerpts and ask an unrelated question to test abstention.
Current verification: 19 backend tests pass; TypeScript/Vite build passes. Tests use controlled model responses for citation mapping, subject isolation, removed-document exclusion, absent context, and invalid vectors. Real Ollama answer quality and browser chat workflow are not yet verified. Phase 4 is not marked complete until local model setup and live checks finish. Phase 5 requires separate approval.


Verification update (3 November 2026): both configured models are installed and /api/ai/status reports ready. Real local-model checks against isolated fictional notes produced the correct seven-packets/13-second answer with its stored source, and abstained on undocumented encryption. This is a limited smoke test, not comprehensive accuracy validation. Browser assistant loads with actual subject choices and ready status. A Windows SQLite connection-handle cleanup issue discovered during verification was fixed; 20 backend tests now pass, including cache reuse and handle closure. Full populated browser chat and phone-layout checks remain pending. User study records were not modified by this verification.
