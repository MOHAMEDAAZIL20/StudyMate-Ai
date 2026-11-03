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
The user approved Phase 3. Stop after Phase 3; Phase 4 requires explicit approval.

## Remaining phases
2. Semesters, subjects, units, topics; persistent CRUD and topic completion.
3. Validated PDF/PPTX/TXT uploads, original files, extracted text, page/slide metadata, search and deletion. Text-based documents first; scanned PDF OCR is separate.
4. Local embeddings, local vector index, Ollama, document-grounded subject chat, verified references, explicit missing-context/model states.
5. Grounded summaries, MCQs, quizzes, explanations, stored attempts.
6. Mistake-to-Mastery: transparent rule-based weakness score, targeted revision, follow-up quizzes and improvement comparisons. Scores are revision priorities, not scientific mastery measurements.
7. Editable exam revision plans, completion tracking and actual-data analytics.
8. Comprehensive tests, accessibility, responsive polish, free-tool deployment strategy.

## Known limitations
- Academic and document management are enabled. AI and Phase 4+ features remain pending.
- Dashboard now uses saved academic records; topic completion is self-reported progress.
- Python installation exists but command aliases/launcher registration need repair outside the project; documented absolute interpreter works.
- Phase 2 adds academic tables without dropping data. Future column changes require versioned migrations.
- Local frontend dev proxy is required for same-origin API requests; production serving is deferred.


## Phase 2 — Academic workspace
- [x] Persistent semester, subject, unit, and topic creation/rename/deletion.
- [x] Parent validation, name validation/uniqueness, SQLite foreign keys, protected parent deletion.
- [x] Topic completion, search within semester, saved-data dashboard and subject progress.
- [x] Reviewable syllabus text/TXT import, bounded size/topic lengths/count, duplicate handling.
- [x] Empty/loading/error states, save feedback, native editor dialogs, removal confirmation.
- [x] Additive table initialization; existing database preserved; documented migration boundary.
- [x] Automated behavioral coverage for hierarchy, input errors, conflicts, completion persistence, import atomicity/deduplication, and safe deletion.
- [x] Frontend TypeScript + production build; backend 5 tests passed; existing test-adapter deprecation warning remains.
- [x] Browser verification: real empty dashboard, navigation to My subjects, Add semester dialog, whitespace-only name prevents Save, Escape closes dialog. Current preview layout visually inspected.
- [x] Live Vite-proxied `/api/workspace` returned the actual empty academic workspace; `/openapi.json` returned HTTP 200 with the new routes.
- [ ] Full populated browser walkthrough and phone-width visual QA remain manual; API mutation workflows are covered by automated tests.

Document upload preservation, PDF/PPTX syllabus extraction, and material-to-unit associations are deliberately Phase 3. Phase 2 TXT syllabus import creates topic records only. No AI functionality was added. No new dependencies were required.


## Phase 3 — Document management
- [x] PDF/PPTX/TXT uploads, 20 MB file / 21 MB request bounds, extension/content validation, private UUID storage.
- [x] PyMuPDF PDF text; python-pptx slide/group/table text; UTF-8 TXT decoding.
- [x] Original preservation; full text and page/slide metadata persisted in a new documents table.
- [x] Explicit OCR-required/no-text/partial-extraction states; no fake AI or indexing.
- [x] Subject/unit assignment and re-categorization; parent deletion protection.
- [x] Filename/content search, filters, extracted text preview, original downloads, confirmed deletion.
- [x] Upload/loading/error/empty feedback and recent uploads on the dashboard.
- [x] Windows dependency lock and installation/run instructions updated.
- [x] 16 automated backend tests passed, including actual PDF/PPTX extraction, storage/persistence/search, invalid/empty/encrypted/oversized inputs, mismatch validation, deletion, and commit-failure cleanup/restore.
- [x] Frontend TypeScript + production build passed; pip check found no broken requirements.
- [x] Live Vite frontend and proxied document list returned 200; OpenAPI exposes document endpoints.
- [x] Browser checks: library navigation/empty state, actual subject choices, upload dialog, disabled submit without inputs, Escape close; library and dialog visually checked at 390px phone width and viewport reset.
- [ ] Populated library upload/preview/download walkthrough remains manual; real mutations are exercised in isolated API tests so no artificial documents were added to the user's workspace.

Known limits: no OCR, diagrams/images/speaker-note extraction, AI/embeddings, or background processing. Extraction is synchronous and bounded. Cross-filesystem/SQLite crash recovery is not atomic; private orphan/staged files may need review. The existing Starlette test-adapter deprecation warning remains. Scanned PDFs are retained but require future OCR before useful retrieval.


## Phase 4 implementation (verification in progress)
Local AI routes: GET /api/ai/status and POST /api/ai/ask (subject_id, question).
The assistant uses Ollama at 127.0.0.1:11434 for both embeddings and generation. Defaults: nomic-embed-text:latest and qwen2.5:3b; override OLLAMA_EMBED_MODEL and OLLAMA_CHAT_MODEL in backend environment. No paid APIs.
Source sections are split into 1,200-character chunks with 200-character overlap. Embeddings are cached privately in backend/data/embeddings.sqlite3, keyed by model digest and text hash. Exact cosine search selects up to six passages within the current subject. Only current document records participate, so removed/reassigned documents cannot supply new answers. Cached vectors contain no source labels or original text, but remain private derived data. No academic schema was changed.
The 0.35 retrieval cutoff is a prototype heuristic, not a confidence probability. Citation IDs are validated against retrieved passages, and labels come from stored metadata. This does not prove every generated claim is supported; real-model grounding evaluation remains necessary. Prompt instructions discourage following instructions in source documents but are not a formal guarantee.
Limits: 2,000 chunks per subject; first-query indexing is synchronous and may take many minutes. Each Ollama request times out after 120 seconds. The browser allows 30 minutes for a question. Chat turns are held in page memory separately by subject; questions are self-contained and previous turns are not used as evidence. No persisted conversation history yet.
Setup: install Ollama from https://ollama.com/download/windows, run `ollama pull nomic-embed-text:latest`, `ollama pull qwen2.5:3b`, then `ollama serve` if the desktop service is not already running. Start FastAPI/Vite using the existing Windows commands. Open AI assistant, select a subject with text-based materials, and ask a question. Check the expandable source excerpts and ask an unrelated question to test abstention.
Current verification: 19 backend tests pass; TypeScript/Vite build passes. Tests use controlled model responses for citation mapping, subject isolation, removed-document exclusion, absent context, and invalid vectors. Real Ollama answer quality and browser chat workflow are not yet verified. Phase 4 is not marked complete until local model setup and live checks finish. Phase 5 requires separate approval.

Local setup check: approximately 16 GB RAM and 310 GB free disk. Ollama absent; winget installer stalled at zero bytes and was stopped. Official download URL was reachable. Live /api/ai/status returns an honest unavailable state. Real-model setup and browser chat verification remain outstanding.


Verification update (3 November 2026): both configured models are installed and /api/ai/status reports ready. Real local-model checks against isolated fictional notes produced the correct seven-packets/13-second answer with its stored source, and abstained on undocumented encryption. This is a limited smoke test, not comprehensive accuracy validation. Browser assistant loads with actual subject choices and ready status. A Windows SQLite connection-handle cleanup issue discovered during verification was fixed; 20 backend tests now pass, including cache reuse and handle closure. Full populated browser chat and phone-layout checks remain pending. User study records were not modified by this verification.
