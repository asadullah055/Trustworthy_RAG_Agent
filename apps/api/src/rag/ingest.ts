import { unlink } from "node:fs/promises";
import type { DocumentRecord } from "@trustworthy-rag/shared";
import { supabase } from "../clients/supabase.js";
import { embedText } from "../clients/gemini.js";
import { env } from "../config.js";
import { chunkText } from "./chunker.js";
import { extractTextUnits } from "./extractors.js";

interface UploadedFile {
  originalname: string;
  mimetype: string;
  path: string;
  size: number;
}

interface DocumentRow {
  id: string;
  name: string;
  mime_type: string;
  status: string;
  chunk_count: number;
  created_at: string;
  updated_at: string;
  error: string | null;
}

function mapDocument(row: DocumentRow): DocumentRecord {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mime_type,
    status: row.status as DocumentRecord["status"],
    chunkCount: row.chunk_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    error: row.error
  };
}

export async function listDocuments(): Promise<DocumentRecord[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("id,name,mime_type,status,chunk_count,created_at,updated_at,error")
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => mapDocument(row as DocumentRow));
}

export async function deleteDocument(documentId: string): Promise<void> {
  const { error } = await supabase.from("documents").delete().eq("id", documentId);

  if (error) {
    throw error;
  }
}

export async function ingestDocument(file: UploadedFile): Promise<DocumentRecord> {
  const created = await supabase
    .from("documents")
    .insert({
      name: file.originalname,
      mime_type: file.mimetype || "application/octet-stream",
      byte_size: file.size,
      status: "processing",
      chunk_count: 0
    })
    .select("id,name,mime_type,status,chunk_count,created_at,updated_at,error")
    .single();

  if (created.error) {
    throw created.error;
  }

  const document = created.data as DocumentRow;
  let chunkIndex = 0;
  let pendingRows: Record<string, unknown>[] = [];

  try {
    for await (const unit of extractTextUnits(file.path, file.mimetype)) {
      const chunks = chunkText(
        unit.text,
        { maxChars: env.MAX_CHUNK_CHARS, overlapChars: env.CHUNK_OVERLAP_CHARS },
        chunkIndex
      );

      for (const chunk of chunks) {
        const embedding = await embedText(chunk.content, "document", file.originalname);
        pendingRows.push({
          document_id: document.id,
          chunk_index: chunk.index,
          content: chunk.content,
          embedding,
          metadata: unit.metadata
        });

        chunkIndex = chunk.index + 1;

        if (pendingRows.length >= env.INGEST_BATCH_SIZE) {
          await insertChunkBatch(pendingRows);
          pendingRows = [];
        }
      }
    }

    if (pendingRows.length) {
      await insertChunkBatch(pendingRows);
    }

    const updated = await supabase
      .from("documents")
      .update({ status: "ready", chunk_count: chunkIndex, error: null })
      .eq("id", document.id)
      .select("id,name,mime_type,status,chunk_count,created_at,updated_at,error")
      .single();

    if (updated.error) {
      throw updated.error;
    }

    return mapDocument(updated.data as DocumentRow);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown ingestion error";
    await supabase
      .from("documents")
      .update({ status: "failed", error: message, chunk_count: chunkIndex })
      .eq("id", document.id);
    throw error;
  } finally {
    await unlink(file.path).catch(() => undefined);
  }
}

async function insertChunkBatch(rows: Record<string, unknown>[]): Promise<void> {
  const { error } = await supabase.from("document_chunks").insert(rows);
  if (error) {
    throw error;
  }
}
