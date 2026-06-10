import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Database,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X
} from "lucide-react";
import type { AskResponse, DocumentRecord } from "@trustworthy-rag/shared";
import { analyzeCase, askQuestion, deleteDocument, fetchDocuments, uploadDocument } from "./api.js";

export function App() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [question, setQuestion] = useState("");
  const [searchImages, setSearchImages] = useState<File[]>([]);
  const [answer, setAnswer] = useState<AskResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const readyCount = useMemo(() => documents.filter((document) => document.status === "ready").length, [documents]);
  const sourceCount = answer?.sources.length ?? 0;
  const searchImagePreviews = useMemo(
    () => searchImages.map((image) => ({ image, url: URL.createObjectURL(image) })),
    [searchImages]
  );

  useEffect(() => () => {
    searchImagePreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [searchImagePreviews]);

  async function refreshDocuments() {
    setError(null);
    setDocuments(await fetchDocuments());
  }

  useEffect(() => {
    refreshDocuments().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : "Could not load documents");
    });
  }, []);

  async function handleUploadFiles(files: File[]) {
    if (!files.length) {
      return;
    }

    setUploading(true);
    setError(null);
    try {
      for (const file of files) {
        await uploadDocument(file);
      }
      await refreshDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleAsk() {
    if (!question.trim()) {
      return;
    }

    setBusy(true);
    setError(null);
    setAnswer(null);
    try {
      setAnswer(
        searchImages.length
          ? await analyzeCase({ images: searchImages, problemDetails: question.trim() })
          : await askQuestion(question.trim())
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Query failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(document: DocumentRecord) {
    const confirmed = window.confirm(`Delete "${document.name}" and all of its chunks from the database?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(document.id);
    setError(null);
    try {
      await deleteDocument(document.id);
      await refreshDocuments();
      setAnswer(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <span className="brand-mark">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h1>Trustworthy RAG Agent</h1>
            <p>Gemini Embedding 2 + Supabase pgvector</p>
          </div>
        </div>
        <div className="status-row">
          <span className="status live">Gate enforced</span>
          <span className={readyCount > 0 ? "status live" : "status"}>{readyCount} ready</span>
          <button className="secondary-button" onClick={() => void refreshDocuments()} title="Refresh documents">
            <RefreshCw size={16} />
            Refresh
          </button>
        </div>
      </header>

      <section className="workspace-grid">
        <aside className="upload-panel" aria-label="Documents">
          <div className="panel-heading">
            <div>
              <h2>Knowledge Intake</h2>
              <p>{documents.length} document{documents.length === 1 ? "" : "s"} indexed</p>
            </div>
            <span className="count-pill">{readyCount} ready</span>
          </div>

          <label className="drop-zone">
            <UploadCloud size={28} />
            <span>{uploading ? "Processing..." : "Upload PDF, text, or image"}</span>
            <input
              type="file"
              accept=".txt,.md,.pdf,.png,.jpg,.jpeg,.webp,text/*,application/pdf,image/*"
              multiple
              disabled={uploading}
              onChange={(event) => void handleUploadFiles(Array.from(event.target.files ?? []))}
            />
          </label>

          <div className="metric-grid">
            <div>
              <strong>{documents.length}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{readyCount}</strong>
              <span>Ready</span>
            </div>
          </div>

          <div className="document-list">
            {documents.map((document) => (
              <article key={document.id} className="document-item">
                <FileText size={18} />
                <div>
                  <strong>{document.name}</strong>
                  <span>{document.status} - {document.chunkCount} chunks</span>
                </div>
                <button
                  className="delete-button"
                  type="button"
                  title="Delete document"
                  disabled={deletingId === document.id}
                  onClick={() => void handleDelete(document)}
                >
                  {deletingId === document.id ? <Loader2 className="spin" size={16} /> : <Trash2 size={16} />}
                </button>
              </article>
            ))}
            {!documents.length && (
              <div className="empty-state compact">
                <Database size={28} />
                <span>No documents indexed yet.</span>
              </div>
            )}
          </div>
        </aside>

        <section className="analysis-panel" aria-label="Question answering">
          <div className="panel-heading">
            <div>
              <h2>Grounded Answer</h2>
              <p>{sourceCount} source{sourceCount === 1 ? "" : "s"} retrieved</p>
            </div>
            <span className={answer?.status === "answered" ? "count-pill live" : "count-pill"}>
              {answer?.status === "answered" ? "answered" : "waiting"}
            </span>
          </div>

          <div className="ask-box">
            <label className="search-image-zone">
              <UploadCloud size={22} />
              <span>{searchImages.length ? `${searchImages.length} image${searchImages.length === 1 ? "" : "s"} selected` : "Optional images"}</span>
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/*"
                multiple
                disabled={busy}
                onChange={(event) => setSearchImages((current) => [...current, ...Array.from(event.target.files ?? [])])}
              />
            </label>

            {searchImagePreviews.length > 0 && (
              <div className="search-image-grid">
                {searchImagePreviews.map(({ image, url }, index) => (
                  <figure className="search-image-preview" key={`${image.name}-${index}`}>
                    <img src={url} alt={image.name || `Search image ${index + 1}`} />
                    <button
                      type="button"
                      aria-label={`Remove ${image.name}`}
                      onClick={() => setSearchImages((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >
                      <X size={14} />
                    </button>
                  </figure>
                ))}
              </div>
            )}

            <textarea
              value={question}
              placeholder="Describe the problem or ask a question. This field is required."
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
                  void handleAsk();
                }
              }}
            />
            <button className="primary-button" onClick={() => void handleAsk()} disabled={busy || !question.trim()} title="Ask question">
              {busy ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              <span>{busy ? "Checking" : "Ask"}</span>
            </button>
          </div>

          {error && (
            <div className="error-line">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {answer ? (
            <section className={`answer-panel ${answer.status === "not_found" ? "not-found" : ""}`}>
              <div className="answer-heading">
                <div>
                  <p className="eyebrow">{answer.status === "answered" ? "Answer" : "Not found"}</p>
                  <h3>{answer.status === "answered" ? "Grounded response" : "Evidence was not strong enough"}</h3>
                </div>
                <span>{Math.round(answer.confidence * 100)}%</span>
              </div>
              <p className="answer-text">{answer.answer}</p>
              <p className="gate-reason">{answer.gateReason}</p>
            </section>
          ) : (
            <div className="empty-state tall">
              <Search size={36} />
              <span>Ask a question after uploading documents.</span>
            </div>
          )}
        </section>
      </section>

    </main>
  );
}
