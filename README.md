# StudyMate AI

A local, personalized study assistant for college students. **Phase 1: project foundation.** No paid services required.

## What works now

- Responsive React dashboard and seven navigable destinations, with browser back/forward support.
- Clearly labeled sample subjects, materials, exams, and progress. Search sample subjects on My subjects.
- Live backend/database connection status with retry and an unavailable state.
- FastAPI `/api/health`, interactive API docs, SQLAlchemy sessions, and a local SQLite database.

Subject editing, uploads, AI, quizzes, recommendations, and planning are future phases. Navigation destinations explain their availability. No student records or AI answers are fabricated. Demo data lives only in `frontend/src/demo.ts` and the dashboard presentation.

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
2. Check `backend/data/studymate.db` exists. No student tables exist until Phase 2.
3. Open every sidebar destination; use browser Back and Forward.
4. Search for `database` on My subjects; an unmatched search shows an empty state.
5. Resize to phone width and use the navigation menu.
6. Stop the backend, click Retry (or reload), and confirm Backend unavailable. Restart it and retry to reconnect.

## Understanding the foundation

React renders the browser interface; TypeScript catches inconsistent data types before shipping. Vite runs the frontend server and builds browser assets. Tailwind provides the styling pipeline; reusable CSS classes implement the design system. Lucide provides consistent icons.

FastAPI handles HTTP requests in Python. Pydantic defines the health response shape. SQLAlchemy manages database connections; SQLite stores data in a file without running another server. The browser calls `/api/health` using `fetch`; Vite proxies that request to FastAPI, which runs `SELECT 1` before responding.

Important files: `frontend/src/main.tsx` (UI and navigation), `frontend/src/styles.css` (responsive design), `frontend/src/demo.ts` (sample records), `backend/app/main.py` (API), `backend/app/database.py` (database foundation), and `backend/tests/test_health.py` (API tests).

Before Phase 2, learn React state and props, HTTP GET/POST, JSON, primary/foreign keys, and basic SQL tables. See ARCHITECTURE.md and PROJECT_PLAN.md for the next steps.

## Limits

Local development only; production deployment, authentication, dark mode, document storage, and AI are not part of Phase 1. Scanned PDFs will need a separate OCR pipeline when uploads arrive. Never delete the database as a routine reset; future schema changes must preserve student data.
