# Details - Trustworthy RAG System

## 2026-06-10 - Owner Request

Role requested: world-class full-stack AI engineer specializing in production-ready RAG systems, Node.js, React.js, Supabase Vector Database, Gemini Embedding models, document processing, vector search, and hallucination-resistant LLM workflows.

Objective: design a production-ready RAG Agent using Node.js and React.js that can process 200+ documents, generate embeddings with Google Gemini Embedding 2, store embedding vectors in Supabase Vector Database, retrieve relevant chunks through similarity search, and generate answers only when retrieved context is strong enough.

Core context and requirements:

- The system handles more than 200 documents.
- Supported source content includes text files, PDFs, and image-based content.
- Large documents and PDFs must not be processed in one pass.
- Each document must be split into smaller chunks.
- Embeddings are generated for each chunk using Google Gemini Embedding 2.
- Vectors are uploaded gradually into Supabase Vector Database.
- Main goal is reducing hallucination and producing reliable, document-grounded answers.
- For a user query, the system generates a query embedding first.
- The system performs vector search to retrieve the most relevant chunks.
- A similarity threshold is applied after retrieval.
- Only sufficiently relevant chunks are passed forward.
- An LLM Gate analyzes retrieved context and decides whether the available information is enough to answer the user question.
- If context is insufficient, or retrieved confidence is below the required threshold, the agent must not guess or create unsupported answers.
- Insufficient-context response should be `NOT_FOUND` or `I don't know`.
- If retrieved context is enough, the LLM generates the answer using only that retrieved context.
- The agent must not use external knowledge, assumptions, or prior knowledge outside retrieved chunks.
- Architecture must combine chunking, vector embedding, similarity search, LLM-based context validation, and context-grounded answer generation.

## Inputs

- 200+ source documents.
- Text files.
- PDFs.
- Image-based content requiring OCR or image text extraction.
- User natural-language questions.

## Outputs

- Document-grounded answers.
- `NOT_FOUND` / `I don't know` when evidence is weak or missing.
- Retrieved context should drive every supported answer.

## Intermediate State

- Parsed document text.
- Chunks.
- Per-chunk embeddings.
- Supabase Vector rows.
- Similarity scores.
- Thresholded retrieved chunks.
- LLM Gate decision.

## Hard Constraints

- Do not process large documents or PDFs in one pass.
- Do not pass weakly relevant chunks into answer generation.
- Do not answer when the gate says context is insufficient.
- Do not use external knowledge, assumptions, or model prior knowledge in final answers.
