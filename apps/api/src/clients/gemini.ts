import { GoogleGenAI } from "@google/genai";
import { env } from "../config.js";

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

export type EmbeddingRole = "document" | "query";

export function formatEmbeddingInput(
  input: string,
  role: EmbeddingRole,
  title?: string,
): string {
  if (role === "query") {
    return `task: question answering | query: ${input}`;
  }

  return `title: ${title?.trim() || "none"} | text: ${input}`;
}

export async function embedText(
  input: string,
  role: EmbeddingRole,
  title?: string,
): Promise<number[]> {
  const response = await ai.models.embedContent({
    model: env.GEMINI_EMBEDDING_MODEL,
    contents: formatEmbeddingInput(input, role, title),
    config: { outputDimensionality: env.EMBEDDING_DIMENSIONS },
  });

  const values = response.embeddings?.[0]?.values;
  if (!values?.length) {
    throw new Error("Gemini returned an empty embedding.");
  }

  return values;
}

export interface GateDecision {
  answerable: boolean;
  confidence: number;
  reason: string;
}

function extractText(response: { text?: string | (() => string) }): string {
  if (typeof response.text === "function") {
    return response.text();
  }

  return response.text ?? "";
}

function parseJsonObject<T>(text: string): T {
  const trimmed = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  return JSON.parse(trimmed) as T;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return ["true", "yes", "answerable"].includes(value.trim().toLowerCase());
  }

  return false;
}

function normalizeConfidence(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 1 ? Math.min(value / 100, 1) : Math.max(value, 0);
  }

  if (typeof value === "string") {
    const numeric = Number.parseFloat(value.replace("%", "").trim());
    if (Number.isFinite(numeric)) {
      return numeric > 1 ? Math.min(numeric / 100, 1) : Math.max(numeric, 0);
    }
  }

  return 0;
}

export async function evaluateContext(
  question: string,
  context: string,
): Promise<GateDecision> {
  const prompt = [
    "You are a strict RAG context gate.",
    "Decide whether the supplied context is enough to answer the user's question.",
    "Use only the context. Do not use outside knowledge.",
    "Return JSON only with keys: answerable, confidence, reason.",
    "confidence must be a number from 0 to 1, not a string and not a percent label.",
    "answerable must be false if the answer is partial, implied weakly, or missing.",
    "",
    `Question: ${question}`,
    "",
    `Context:\n${context}`,
  ].join("\n");

  const response = await ai.models.generateContent({
    model: env.GEMINI_GENERATION_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const parsed = parseJsonObject<Partial<GateDecision>>(extractText(response));
  return {
    answerable: normalizeBoolean(parsed.answerable),
    confidence: normalizeConfidence(parsed.confidence),
    reason: parsed.reason || "The gate did not provide a reason.",
  };
}

export async function answerFromContext(
  question: string,
  context: string,
): Promise<string> {
  const prompt = [
    "You are a document-grounded RAG answerer.",
    "Answer the question using only the supplied context.",
    "If the context does not contain the answer, return exactly NOT_FOUND.",
    "Do not add outside facts, assumptions, or unsupported details.",
    "Keep the answer concise and cite source labels like [S1] when relevant.",
    "",
    `Question: ${question}`,
    "",
    `Context:\n${context}`,
  ].join("\n");

  const response = await ai.models.generateContent({
    model: env.GEMINI_GENERATION_MODEL,
    contents: prompt,
  });

  return extractText(response).trim() || "NOT_FOUND";
}

export async function describeProblemImage(input: {
  image: Buffer;
  mimeType: string;
  problemDetails?: string;
}): Promise<string> {
  const prompt = [
    "Describe this plumbing problem image for retrieval against a plumbing issue knowledge base.",
    "Focus on visible symptoms, fixture or pipe type, leak, rust, clog, damage signs, location clues, urgency cues, and likely repair category.",
    "Do not invent hidden causes. Return a concise observation paragraph.",
    input.problemDetails ? `User written details: ${input.problemDetails}` : "",
  ].filter(Boolean).join("\n");

  const response = await ai.models.generateContent({
    model: env.GEMINI_GENERATION_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: input.mimeType,
              data: input.image.toString("base64"),
            },
          },
        ],
      },
    ],
  });

  return extractText(response).trim();
}
