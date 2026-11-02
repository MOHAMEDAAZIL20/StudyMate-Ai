# StudyMate AI roadmap

## Phase 1 — Foundation
- [x] Inspect empty workspace and establish architecture.
- [x] React, TypeScript, Vite, Tailwind, Lucide dashboard shell.
- [x] Responsive navigation, sample subject search, explicit demo labels.
- [x] FastAPI health endpoint and live frontend status.
- [x] SQLAlchemy session foundation and SQLite initialization.
- [x] Environment templates, Windows instructions, and tests.
- [x] Record final verification results below.

## Verification — 2 November 2026
- `npm run build`: passed TypeScript checking and Vite production compilation.
- Backend `python -m pytest -q`: 2 passed. Checks real temporary SQLite connectivity, missing-route behavior, and sanitized database failure responses.
- `python -m pip check`: no broken requirements. npm install audit: zero reported vulnerabilities.
- Live frontend HTTP: 200. Direct `/api/health` and Vite-proxied `/api/health`: both returned connected, version 0.1.0.
- Default SQLite file created at `backend/data/studymate.db`.
- Browser QA could not be completed: in-app preview timed out under sandbox networking and its tab was unavailable after the servers were restarted with socket permission. Manual navigation, keyboard, and mobile visual checks remain pending using README instructions.
- Test dependency warning: installed Starlette deprecates its httpx test adapter in favor of httpx2. Existing tests pass; review that migration with the next dependency update.

## Approval checkpoint
Stop after Phase 1. Begin Phase 2 only after the user's explicit approval.

## Remaining phases
2. Semesters, subjects, units, topics; persistent CRUD and topic completion.
3. Validated PDF/PPTX/TXT uploads, original files, extracted text, page/slide metadata, search and deletion. Text-based documents first; scanned PDF OCR is separate.
4. Local embeddings, local vector index, Ollama, document-grounded subject chat, verified references, explicit missing-context/model states.
5. Grounded summaries, MCQs, quizzes, explanations, stored attempts.
6. Mistake-to-Mastery: transparent rule-based weakness score, targeted revision, follow-up quizzes and improvement comparisons. Scores are revision priorities, not scientific mastery measurements.
7. Editable exam revision plans, completion tracking and actual-data analytics.
8. Comprehensive tests, accessibility, responsive polish, free-tool deployment strategy.

## Known limitations
- No Phase 2+ mutations or AI capabilities are enabled.
- Dashboard sample values are not stored student analytics.
- Python installation exists but command aliases/launcher registration need repair outside the project; documented absolute interpreter works.
- Backend initialization creates the SQLite file, with no domain tables yet. Schema migration strategy belongs to Phase 2.
- Local frontend dev proxy is required for same-origin API requests; production serving is deferred.
