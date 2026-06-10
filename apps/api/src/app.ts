import express from "express";
import cors from "cors";
import helmet from "helmet";
import { ZodError } from "zod";
import { env } from "./config.js";
import { documentsRouter } from "./routes/documents.js";
import { queryRouter } from "./routes/query.js";
import { analyzeRouter } from "./routes/analyze.js";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return "Unexpected server error";
}

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN }));
  app.use(express.json({ limit: "1mb" }));

  app.get(["/health", "/api/health"], (_req, res) => {
    res.json({ ok: true, service: "trustworthy-rag-api" });
  });

  app.use(["/documents", "/api/documents"], documentsRouter);
  app.use(["/query", "/api/query"], queryRouter);
  app.use(["/analyze", "/api/analyze"], analyzeRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({ error: "Invalid request", details: error.flatten() });
      return;
    }

    const message = getErrorMessage(error);
    const status = message.includes("API key") ? 401 : 500;
    res.status(status).json({ error: message });
  });

  return app;
}

const app = createApp();

export default app;
