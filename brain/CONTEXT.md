# CONTEXT.md - Trustworthy RAG System

## Vision

Production-ready Node.js / React / Supabase Vector RAG system with Gemini embeddings and hallucination-resistant answer generation.

## What it does

- Ingests text, PDF, and image documents.
- Extracts source text without embedding large files as a single unit.
- Splits text into overlapping chunks.
- Generates retrieval embeddings with Google Gemini Embedding 2.
- Stores chunks and vectors in Supabase pgvector.
- Retrieves only chunks above a similarity threshold.
- Runs an LLM context gate before answer generation.
- Answers only from retrieved context or returns `NOT_FOUND`.

## Folder structure

```text
trustworthy-rag-system/
  apps/
    api/
    web/
  packages/
    shared/
  supabase/
    schema.sql
  docs/
    ARCHITECTURE.md
  sample-docs/
  brain/
  processing/
```

## Responsibility map

| Path | Job |
|------|-----|
| `apps/api` | Express ingestion, retrieval, gate, and answer API. |
| `apps/web` | React corpus upload and grounded Q&A workbench. |
| `packages/shared` | Shared request/response types. |
| `supabase/schema.sql` | Database tables, pgvector index, and match RPC. |
| `docs/ARCHITECTURE.md` | Operational architecture and hardening checklist. |
| `brain/CONTEXT.md` | Stable system spec after distillation. |
| `brain/PROGRESS.md` | Operational progress cockpit after distillation. |
| `processing/details.md` | Raw captured requirements during construction. |
| `processing/PROGRESS.md` | Construction progress through the war-room build steps. |

## Data shape

- `documents`: uploaded file metadata, status, chunk count, and errors.
- `document_chunks`: document ID, chunk index, text content, vector embedding, and source metadata.
- Query response: answer status, answer text, gate confidence, gate reason, and source chunks.
