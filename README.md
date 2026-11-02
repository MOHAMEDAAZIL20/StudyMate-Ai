# StudyMate AI

A local, personalized study assistant for college students. **Phase 2: persistent academic workspace.** No paid services required.

## What works now

- Responsive React dashboard and seven navigable destinations, with browser back/forward support.
- Create and rename semesters, subjects, units, and topics; delete individual items with confirmation and parent-child protection.
- Search subjects, units, and topics within a semester; mark topics complete.
- Import syllabus topics by pasting text or reviewing a UTF-8 TXT file.
- Dashboard counts and subject progress come from actual saved records.
- Live backend/database connection status with retry and an unavailable state.
- FastAPI `/api/health`, interactive API docs, SQLAlchemy sessions, and a local SQLite database.

Document uploads, AI, quizzes, recommendations, and exam planning are future phases. No student records are seeded. The old Phase 1 fixtures remain isolated in `frontend/src/demo.ts` and are no longer displayed. TXT syllabus selection only imports topic names; it does not preserve an original document. Document storage and PDF/PPTX extraction arrive in Phase 3.

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

Before Phase 3, learn HTTP multipart uploads, file validation, Python file paths, and database transactions. See ARCHITECTURE.md and PROJECT_PLAN.md for the next steps.

## Limits

Local development only; production deployment, authentication, dark mode, document storage, and AI are not part of Phase 1. Scanned PDFs will need a separate OCR pipeline when uploads arrive. Never delete the database as a routine reset; future schema changes must preserve student data.


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
