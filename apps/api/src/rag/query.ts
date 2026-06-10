import type { AskResponse, SourceChunk } from "@trustworthy-rag/shared";
import { env } from "../config.js";
import { embedText, evaluateContext, answerFromContext } from "../clients/gemini.js";
import { supabase } from "../clients/supabase.js";

interface MatchRow {
  chunk_id: string;
  document_id: string;
  document_name: string;
  chunk_index: number;
  similarity: number;
  content: string;
  metadata: Record<string, unknown>;
}

function buildContext(chunks: SourceChunk[]): string {
  return chunks
    .map((chunk, index) => {
      const label = `S${index + 1}`;
      const location = chunk.metadata.pageNumber ? ` page ${chunk.metadata.pageNumber}` : "";
      return `[${label}] ${chunk.documentName}${location}, chunk ${chunk.chunkIndex}\n${chunk.content}`;
    })
    .join("\n\n");
}

export async function askQuestion(question: string): Promise<AskResponse> {
  const queryEmbedding = await embedText(question, "query");

  const { data, error } = await supabase.rpc("match_document_chunks", {
    query_embedding: queryEmbedding,
    match_count: env.MATCH_COUNT,
    similarity_threshold: env.SIMILARITY_THRESHOLD
  });

  if (error) {
    throw error;
  }

  const sources = ((data ?? []) as MatchRow[]).map<SourceChunk>((row) => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentName: row.document_name,
    chunkIndex: row.chunk_index,
    similarity: row.similarity,
    content: row.content,
    metadata: row.metadata ?? {}
  }));

  if (!sources.length) {
    return {
      status: "not_found",
      answer: "NOT_FOUND",
      confidence: 0,
      gateReason: "No retrieved chunks met the similarity threshold.",
      sources: []
    };
  }

  const context = buildContext(sources);
  const gate = await evaluateContext(question, context);

  if (!gate.answerable || gate.confidence < env.GATE_MIN_CONFIDENCE) {
    return {
      status: "not_found",
      answer: "NOT_FOUND",
      confidence: gate.confidence,
      gateReason: gate.reason,
      sources
    };
  }

  const answer = await answerFromContext(question, context);
  if (answer.trim().toUpperCase() === "NOT_FOUND") {
    return {
      status: "not_found",
      answer: "NOT_FOUND",
      confidence: gate.confidence,
      gateReason: "The answer model could not ground the answer in the approved context.",
      sources
    };
  }

  return {
    status: "answered",
    answer,
    confidence: gate.confidence,
    gateReason: gate.reason,
    sources
  };
}
