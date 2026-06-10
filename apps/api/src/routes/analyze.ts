import { Router } from "express";
import multer from "multer";
import { describeProblemImage } from "../clients/gemini.js";
import { askQuestion } from "../rag/query.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 8,
    fileSize: Number(process.env.MAX_CASE_IMAGE_BYTES || 8 * 1024 * 1024),
  },
});

export const analyzeRouter = Router();

analyzeRouter.post("/", upload.array("images", 8), async (req, res, next) => {
  try {
    const problemDetails = typeof req.body.problemDetails === "string" ? req.body.problemDetails.trim() : "";
    const files = Array.isArray(req.files) ? req.files : [];

    if (!problemDetails) {
      res.status(400).json({ error: "Problem description is required." });
      return;
    }

    const visualObservations = await Promise.all(
      files.map((file, index) =>
        describeProblemImage({
          image: file.buffer,
          mimeType: file.mimetype,
          problemDetails,
        }).then((observation) => `Image ${index + 1}: ${observation}`)
      )
    );
    const visualObservation = visualObservations.join("\n\n");

    const caseQuery = [
      "A plumber submitted a field case.",
      "Use the indexed plumbing PDF or document knowledge base to identify the closest matching problem.",
      "Return the actual problem, possible cause, possible solution or repair work, urgency, and estimated cost.",
      "If a detail such as estimated cost is not present in the retrieved context, say it is not available in the context instead of inventing it.",
      "If the indexed context does not support a match, return NOT_FOUND.",
      problemDetails ? `Problem details: ${problemDetails}` : "",
      visualObservation ? `Image observation: ${visualObservation}` : "",
    ].filter(Boolean).join("\n");

    const answer = await askQuestion(caseQuery);
    res.json({ ...answer, visualObservation, caseQuery });
  } catch (error) {
    next(error);
  }
});
