import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { deleteDocument, ingestDocument, listDocuments } from "../rag/ingest.js";

const upload = multer({
  dest: process.env.VERCEL ? "/tmp" : "uploads/",
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_BYTES || 12 * 1024 * 1024)
  }
});

export const documentsRouter = Router();

documentsRouter.get("/", async (_req, res, next) => {
  try {
    res.json({ documents: await listDocuments() });
  } catch (error) {
    next(error);
  }
});

documentsRouter.post("/", upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Upload a file using the form field named file." });
      return;
    }

    const document = await ingestDocument(req.file);
    res.status(201).json({ document });
  } catch (error) {
    next(error);
  }
});

documentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
    await deleteDocument(id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
