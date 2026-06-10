import { Router } from "express";
import { z } from "zod";
import { askQuestion } from "../rag/query.js";

const askSchema = z.object({
  question: z.string().trim().min(3).max(2000)
});

export const queryRouter = Router();

queryRouter.post("/", async (req, res, next) => {
  try {
    const { question } = askSchema.parse(req.body);
    res.json(await askQuestion(question));
  } catch (error) {
    next(error);
  }
});
