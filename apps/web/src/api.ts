import type { AnalyzeCaseResponse, AskRequest, AskResponse, DocumentRecord, IngestResponse } from "@trustworthy-rag/shared";

const API_URL = import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? "http://localhost:8080" : "/api");

async function parseJson<T>(response: Response): Promise<T> {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload.error === "string" ? payload.error : "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export async function fetchDocuments(): Promise<DocumentRecord[]> {
  const response = await fetch(`${API_URL}/documents`);
  const payload = await parseJson<{ documents: DocumentRecord[] }>(response);
  return payload.documents;
}

export async function uploadDocument(file: File): Promise<IngestResponse> {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`${API_URL}/documents`, {
    method: "POST",
    body
  });

  return parseJson<IngestResponse>(response);
}

export async function deleteDocument(documentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/documents/${documentId}`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = typeof payload.error === "string" ? payload.error : "Delete failed";
    throw new Error(message);
  }
}

export async function askQuestion(question: string): Promise<AskResponse> {
  const body: AskRequest = { question };
  const response = await fetch(`${API_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  return parseJson<AskResponse>(response);
}

export async function analyzeCase(input: {
  images?: File[];
  problemDetails: string;
}): Promise<AnalyzeCaseResponse> {
  const body = new FormData();
  body.append("problemDetails", input.problemDetails);
  input.images?.forEach((image) => body.append("images", image));

  const response = await fetch(`${API_URL}/analyze`, {
    method: "POST",
    body
  });

  return parseJson<AnalyzeCaseResponse>(response);
}
