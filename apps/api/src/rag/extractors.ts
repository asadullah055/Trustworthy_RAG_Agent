import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { createWorker } from "tesseract.js";

export interface ExtractedUnit {
  text: string;
  metadata: Record<string, unknown>;
}

export async function* extractTextUnits(filePath: string, mimeType: string): AsyncGenerator<ExtractedUnit> {
  const extension = extname(filePath).toLowerCase();

  if (mimeType === "application/pdf" || extension === ".pdf") {
    yield* extractPdfByPage(filePath);
    return;
  }

  if (mimeType.startsWith("image/") || [".png", ".jpg", ".jpeg", ".webp"].includes(extension)) {
    yield await extractImageText(filePath);
    return;
  }

  yield* extractPlainText(filePath);
}

async function* extractPlainText(filePath: string): AsyncGenerator<ExtractedUnit> {
  const stream = createReadStream(filePath, { encoding: "utf8", highWaterMark: 64 * 1024 });
  let part = 0;

  for await (const block of stream) {
    yield {
      text: block,
      metadata: { sourceType: "text", part }
    };
    part += 1;
  }
}

async function* extractPdfByPage(filePath: string): AsyncGenerator<ExtractedUnit> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const bytes = await readFile(filePath);
  const document = await pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableFontFace: true,
    isEvalSupported: false
  }).promise;

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    yield {
      text,
      metadata: { sourceType: "pdf", pageNumber }
    };
  }
}

async function extractImageText(filePath: string): Promise<ExtractedUnit> {
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(filePath);
    return {
      text: result.data.text,
      metadata: { sourceType: "image", ocr: "tesseract.js" }
    };
  } finally {
    await worker.terminate();
  }
}
