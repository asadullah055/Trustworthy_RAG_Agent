export type IngestStatus = "queued" | "processing" | "ready" | "failed";

export interface DocumentRecord {
  id: string;
  name: string;
  mimeType: string;
  status: IngestStatus;
  chunkCount: number;
  createdAt: string;
  updatedAt: string;
  error?: string | null;
}

export interface SourceChunk {
  chunkId: string;
  documentId: string;
  documentName: string;
  chunkIndex: number;
  similarity: number;
  content: string;
  metadata: Record<string, unknown>;
}

export interface AskRequest {
  question: string;
}

export interface AskResponse {
  status: "answered" | "not_found";
  answer: string;
  confidence: number;
  gateReason: string;
  sources: SourceChunk[];
}

export interface IngestResponse {
  document: DocumentRecord;
}

export interface AnalyzeCaseResponse extends AskResponse {
  visualObservation: string;
  caseQuery: string;
}
