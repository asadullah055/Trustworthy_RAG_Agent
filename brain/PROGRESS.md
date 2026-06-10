# PROGRESS.md - Trustworthy RAG System

> Light progress file. **Past:** compressed to one line each. **Current:** the active step in full detail. **Future:** planned steps in full detail.

**Legend:** [ ] not started | [~] WIP | [x] done / shipped | [!] blocked | [>] deferred

---

## Current

**Implementation Verification**

What: Verify the newly scaffolded RAG implementation and prepare it for first local run.

Why: The core API, web app, schema, and docs now exist. Dependencies and builds are verified; environment credentials still need runtime validation.

Acceptance: Dependencies install, TypeScript builds, Supabase schema is applied, `.env` is configured, sample document ingestion works, and a sample query returns a grounded answer or `NOT_FOUND`.

Sub-tasks:
- [x] Capture requirements in `processing/details.md`.
- [x] Propose operational scaffold.
- [x] Scaffold API, web app, shared types, Supabase schema, and docs.
- [x] Verify install and builds.
- [ ] Apply Supabase schema.
- [ ] Configure `.env`.
- [ ] Run sample ingestion and query.
- [ ] Render `MANUAL.pdf` if still required.

## Future

- Add authentication and tenant-aware authorization.
- Move ingestion into a queue for large corpora.
- Add integration tests with adversarial questions.

## Past

- 2026-06-10: Captured the RAG requirements and created the first implementation scaffold.
