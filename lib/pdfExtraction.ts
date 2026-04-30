import pdfParse from "pdf-parse";
import { createCanvas, loadImage } from "@napi-rs/canvas";
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
  const worker = await createWorker("eng", undefined, { langPath: process.cwd(), gzip: false });
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

async function prepareImageForOcr(buffer: Buffer) {
  const image = await loadImage(buffer);
  const maxWidth = 1400;
  const scale = image.width > maxWidth ? maxWidth / image.width : 1;
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);
  const canvas = createCanvas(width, height);
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, width, height);

  const pixels = context.getImageData(0, 0, width, height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const grey = pixels.data[index] * 0.299 + pixels.data[index + 1] * 0.587 + pixels.data[index + 2] * 0.114;
    const boosted = grey > 170 ? 255 : grey < 80 ? 0 : grey * 0.75;
    pixels.data[index] = boosted;
    pixels.data[index + 1] = boosted;
    pixels.data[index + 2] = boosted;
  }
  context.putImageData(pixels, 0, 0);
  return canvas.toBuffer("image/png");
}

export async function extractImageOcrText(buffer: Buffer) {
  const prepared = await prepareImageForOcr(buffer);
  const worker = await createWorker("eng", undefined, { langPath: process.cwd(), gzip: false });
  try {
    await worker.setParameters({ preserve_interword_spaces: "1" });
    const result = await worker.recognize(prepared);
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
