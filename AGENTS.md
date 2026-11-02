# StudyMate AI development instructions

- Read README.md, ARCHITECTURE.md, and PROJECT_PLAN.md before changes.
- Implement one major phase at a time. Stop for user approval between phases. Current scope: Phase 1 only.
- Preserve the React/TypeScript/Vite/Tailwind/Lucide frontend and Python/FastAPI/Pydantic/SQLAlchemy/SQLite backend. Explain proposed stack changes first.
- Keep free local AI (embeddings, vector store, Ollama) for Phase 4. Never fake model responses.
- Use clear names, reusable components, typed API contracts, and small modules. Keep demo fixtures distinct from user data.
- Validate all future mutations and upload type/size; preserve original uploads and source metadata. No public document directories.
- Never silently delete data. No destructive commands without user approval. Verify absolute paths before recursive moves/deletes. Do not recreate databases to fix schema mismatches.
- Keep secrets, virtual environments, dependencies, and runtime database/files out of source control.
- Maintain Windows PowerShell instructions; avoid requiring virtual environment activation.
- Test backend changes with `..\.venv\Scripts\python.exe -m pytest -q` from backend; frontend changes with `npm run build` from frontend. Add meaningful behavioral tests for new backend functionality.
- Run live endpoint checks when API wiring changes. Verify navigation, empty/error states, phone layout, and keyboard accessibility when UI changes. Report unperformed checks honestly.
- Update roadmap and relevant documentation after each phase. State what changed, verification evidence, run commands, limitations, and beginner learning targets.
