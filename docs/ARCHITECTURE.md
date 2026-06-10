# Architecture

## Trust Contract

This system treats retrieval as a security boundary. The answer model never receives unfiltered search results. A question can be answered only when both checks pass:

- Similarity search returns chunks above `SIMILARITY_THRESHOLD`.
- The LLM gate returns `answerable=true` and confidence above `GATE_MIN_CONFIDENCE`.

If either check fails, the API returns `NOT_FOUND`.

## Components

### React Workbench

The web app supports the two core operator workflows:

- Upload source documents.
- Ask grounded questions and inspect retrieved sources.

### API

The API owns ingestion, retrieval, gatekeeping, and answer generation.

Key modules:

- `rag/extractors.ts`: text, PDF, and image text extraction.
- `rag/chunker.ts`: overlap chunking with soft sentence boundaries.
- `rag/ingest.ts`: document rows, chunk embeddings, gradual vector inserts.
- `rag/query.ts`: query embedding, vector RPC, gate, final answer.

### Supabase Vector

Supabase stores:

- `documents`: ingestion status and file metadata.
- `document_chunks`: chunk text, metadata, and pgvector embedding.

The `match_document_chunks` RPC performs cosine similarity search and filters by threshold inside the database.

## Hallucination Controls

- Query and document embeddings use retrieval-specific formatting for `gemini-embedding-2`.
- Weak chunks are filtered before context construction.
- The gate has a separate prompt from answer generation.
- The answer prompt requires `NOT_FOUND` when context is insufficient.
- The API treats `NOT_FOUND` from the answer model as a failed answer.

## Production Hardening Checklist

- Add authentication for upload and query endpoints.
- Move ingestion to a background queue for large corpora.
- Store original files in object storage.
- Add per-document tenant ownership and row-level access policies.
- Add observability for retrieval score distributions and gate decisions.
- Add human review flows for low-confidence answers.
- Add integration tests with a known corpus and adversarial questions.
- Use a paid OCR service if image quality or handwriting is important.

## Vercel Demo Mode

The repo includes `api/index.ts` and `vercel.json` so the React app and Express API can deploy together as a single Vercel project.

This mode is intended for demos with small PDFs. The API stores uploaded files in serverless temporary storage and processes them during the request. That is acceptable for a short demo, but not for high-volume production ingestion.

For production, keep Vercel for the frontend and run the API/ingestion worker on a persistent compute platform.
