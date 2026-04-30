import pdfParse from "pdf-parse";
import { createCanvas } from "@napi-rs/canvas";
import { createWorker } from "tesseract.js";

const MIN_TEXT_LENGTH = 80;
const MIN_WORDS = 12;

function isPoorExtraction(text: string) {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return text.trim().length < MIN_TEXT_LENGTH || words < MIN_WORDS;
}

async function renderPdfPagesForOcr(buffer: Buffer, maxPages = 3) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
  const images: Buffer[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(doc.numPages, maxPages); pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = createCanvas(viewport.width, viewport.height);
    const context = canvas.getContext("2d");
    await page.render({ canvasContext: context as never, viewport }).promise;
    images.push(canvas.toBuffer("image/png"));
  }
  return images;
}

export async function extractPdfOcrText(buffer: Buffer, maxPages = 3) {
  const images = await renderPdfPagesForOcr(buffer, maxPages);
  if (!images.length) return "";
  const worker = await createWorker("eng");
  try {
    const chunks: string[] = [];
    for (const image of images) {
      const result = await worker.recognize(image);
      chunks.push(result.data.text);
    }
    return chunks.join("\n");
  } finally {
    await worker.terminate();
  }
}

export async function extractImageOcrText(buffer: Buffer) {
  const worker = await createWorker("eng");
  try {
    const result = await worker.recognize(buffer);
    return result.data.text;
  } finally {
    await worker.terminate();
  }
}

export async function extractPdfText(buffer: Buffer) {
  const parsed = await pdfParse(buffer);
  const text = parsed.text ?? "";
  if (!isPoorExtraction(text)) {
    return { text, method: "pdf-parse" as const, usedOcr: false };
  }
  const ocrText = await extractPdfOcrText(buffer);
  return {
    text: ocrText.trim().length > text.trim().length ? ocrText : text,
    method: "ocr-fallback" as const,
    usedOcr: true
  };
}
