import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InvoiceDraft } from "./types";

type PdfPage = ReturnType<PDFDocument["addPage"]>;
type Font = Awaited<ReturnType<PDFDocument["embedFont"]>>;

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 42;
const NAVY = rgb(0.06, 0.09, 0.15);
const SLATE = rgb(0.3, 0.36, 0.45);
const MUTED = rgb(0.62, 0.67, 0.75);
const BORDER = rgb(0.86, 0.89, 0.93);
const BAND = rgb(0.96, 0.98, 1);
const ORANGE = rgb(0.95, 0.38, 0.08);
const WHITE = rgb(1, 1, 1);

function money(value?: number) {
  return `$${(Number(value) || 0).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function safe(value?: string | null) {
  return value?.trim() || "";
}

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}

function wrapText(text: string, maxChars: number, maxLines = 3) {
  const words = safe(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
      if (lines.length === maxLines) break;
    } else {
      current = next;
    }
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (!lines.length) lines.push("");
  return lines;
}

function drawText(page: PdfPage, text: string, x: number, y: number, size: number, font: Font, color = NAVY) {
  page.drawText(text, { x, y, size, font, color });
}

function drawLabelValue(page: PdfPage, label: string, value: string, x: number, y: number, fonts: { font: Font; bold: Font }, width = 150) {
  drawText(page, label.toUpperCase(), x, y, 6.5, fonts.bold, MUTED);
  drawText(page, truncate(value || "-", Math.floor(width / 4.8)), x, y - 12, 9, fonts.font, NAVY);
}

function drawInfoCard(page: PdfPage, title: string, lines: string[], x: number, y: number, width: number, height: number, fonts: { font: Font; bold: Font }) {
  page.drawRectangle({ x, y: y - height, width, height, color: WHITE, borderColor: BORDER, borderWidth: 1 });
  drawText(page, title.toUpperCase(), x + 14, y - 18, 7, fonts.bold, ORANGE);
  let cursor = y - 35;
  lines.filter(Boolean).slice(0, 5).forEach((line, index) => {
    drawText(page, truncate(line, index === 0 ? 34 : 44), x + 14, cursor, index === 0 ? 10 : 8.5, index === 0 ? fonts.bold : fonts.font, index === 0 ? NAVY : SLATE);
    cursor -= index === 0 ? 14 : 12;
  });
}

export async function buildInvoicePdf(invoice: InvoiceDraft) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts = { font, bold };
  let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = 0;
  let pageNumber = 1;

  function addPage() {
    page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pageNumber += 1;
    drawContinuationHeader();
  }

  function drawFooter() {
    page.drawLine({ start: { x: MARGIN, y: 32 }, end: { x: PAGE_WIDTH - MARGIN, y: 32 }, thickness: 0.5, color: BORDER });
    drawText(page, safe(invoice.myCompanyName) || "Construct Bill", MARGIN, 18, 7.5, font, MUTED);
    drawText(page, `Page ${pageNumber}`, PAGE_WIDTH - 70, 18, 7.5, font, MUTED);
  }

  function drawMainHeader() {
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 126, width: PAGE_WIDTH, height: 126, color: NAVY });
    page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 126, width: 8, height: 126, color: ORANGE });
    drawText(page, "CONSTRUCTION", MARGIN, 724, 10, bold, ORANGE);
    drawText(page, "INVOICE", MARGIN, 694, 34, bold, WHITE);
    drawText(page, invoice.invoiceNumber, 392, 724, 15, bold, WHITE);
    drawText(page, invoice.status || "DRAFT", 392, 701, 9, bold, ORANGE);
    drawText(page, `Date ${invoice.date || "-"}`, 392, 681, 8.5, font, WHITE);
    drawText(page, `Due ${invoice.deadline || "-"}`, 392, 667, 8.5, font, WHITE);
    y = 632;
  }

  function drawContinuationHeader() {
    y = 742;
    drawText(page, "CONSTRUCTION INVOICE", MARGIN, y, 15, bold, NAVY);
    drawText(page, `${invoice.invoiceNumber} continued`, 388, y + 2, 9, bold, ORANGE);
    y -= 30;
    drawLineTableHeader();
  }

  function drawPartySection() {
    const from = [
      safe(invoice.myCompanyName) || "Your Company",
      safe(invoice.myCompanyGstNumber) ? `GST/HST: ${safe(invoice.myCompanyGstNumber)}` : "",
      safe(invoice.myCompanyAddress)
    ];
    const workFrom = [
      safe(invoice.company) || "Work order company",
      safe(invoice.companyAddress),
      safe(invoice.companyPhone)
    ];
    const soldTo = [
      safe(invoice.soldToName) || "Original client",
      safe(invoice.soldToAddress)
    ];

    drawInfoCard(page, "From", from, MARGIN, y, 166, 86, fonts);
    drawInfoCard(page, "Work Order From", workFrom, 222, y, 166, 86, fonts);
    drawInfoCard(page, "Sold To", soldTo, 402, y, 168, 86, fonts);
    y -= 108;
  }

  function drawMetaSection() {
    page.drawRectangle({ x: MARGIN, y: y - 54, width: PAGE_WIDTH - MARGIN * 2, height: 64, color: BAND, borderColor: BORDER, borderWidth: 1 });
    drawLabelValue(page, "Work order", safe(invoice.workOrderNumber), MARGIN + 14, y - 16, fonts);
    drawLabelValue(page, "Reference", safe(invoice.workOrderId), MARGIN + 130, y - 16, fonts);
    drawLabelValue(page, "Completed by", safe(invoice.contractor), MARGIN + 246, y - 16, fonts);
    drawLabelValue(page, "Work type", safe(invoice.workOrderType || invoice.classification), MARGIN + 392, y - 16, fonts);
    drawText(page, "JOB SITE", MARGIN + 14, y - 46, 6.5, bold, MUTED);
    drawText(page, truncate(`${safe(invoice.address)}${safe(invoice.suite) ? `, Unit ${safe(invoice.suite)}` : ""}` || "-", 78), MARGIN + 70, y - 47, 8.5, font, NAVY);
    y -= 84;
  }

  function drawLineTableHeader() {
    page.drawRectangle({ x: MARGIN, y: y - 7, width: PAGE_WIDTH - MARGIN * 2, height: 27, color: NAVY });
    drawText(page, "AREA", MARGIN + 10, y + 1, 7.5, bold, WHITE);
    drawText(page, "DESCRIPTION", MARGIN + 92, y + 1, 7.5, bold, WHITE);
    drawText(page, "QTY", 372, y + 1, 7.5, bold, WHITE);
    drawText(page, "RATE", 424, y + 1, 7.5, bold, WHITE);
    drawText(page, "TOTAL", 510, y + 1, 7.5, bold, WHITE);
    y -= 27;
  }

  function drawItem(item: InvoiceDraft["items"][number], index: number) {
    const descriptionLines = wrapText(item.description, 48, 3);
    const rowHeight = Math.max(28, 14 + descriptionLines.length * 10);
    if (y - rowHeight < 86) {
      drawFooter();
      addPage();
    }
    if (index % 2 === 0) page.drawRectangle({ x: MARGIN, y: y - rowHeight + 6, width: PAGE_WIDTH - MARGIN * 2, height: rowHeight, color: rgb(0.985, 0.99, 1) });
    drawText(page, truncate(item.area || "GENERAL", 14), MARGIN + 10, y - 8, 8, font, SLATE);
    descriptionLines.forEach((line, lineIndex) => {
      drawText(page, line, MARGIN + 92, y - 8 - lineIndex * 10, 8.2, font, NAVY);
    });
    drawText(page, String(item.qty || 0), 374, y - 8, 8, font, NAVY);
    drawText(page, money(item.unitPrice), 418, y - 8, 8, font, NAVY);
    drawText(page, money(item.lineTotal), 502, y - 8, 8, font, NAVY);
    page.drawLine({ start: { x: MARGIN, y: y - rowHeight + 6 }, end: { x: PAGE_WIDTH - MARGIN, y: y - rowHeight + 6 }, thickness: 0.4, color: BORDER });
    y -= rowHeight;
  }

  function drawTotalsSection() {
    if (y < 178) {
      drawFooter();
      page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      pageNumber += 1;
      y = 742;
    }

    const notes = wrapText(invoice.notes || "Thank you for your business.", 58, 4);
    drawText(page, "PAYMENT TERMS", MARGIN, y - 4, 8, bold, ORANGE);
    drawText(page, invoice.paymentTerms || "Net 30", MARGIN, y - 20, 9, font, NAVY);
    drawText(page, "NOTES", MARGIN, y - 48, 8, bold, ORANGE);
    notes.forEach((line, index) => drawText(page, line, MARGIN, y - 64 - index * 11, 8.2, font, SLATE));

    page.drawRectangle({ x: 368, y: y - 120, width: 202, height: 132, color: WHITE, borderColor: BORDER, borderWidth: 1 });
    page.drawRectangle({ x: 368, y: y - 120, width: 202, height: 36, color: NAVY });
    drawText(page, "TOTAL DUE", 384, y - 106, 9, bold, WHITE);
    drawText(page, money(invoice.total), 468, y - 108, 14, bold, ORANGE);
    drawText(page, "Subtotal", 384, y - 28, 9, font, SLATE);
    drawText(page, money(invoice.subtotal), 500, y - 28, 9, font, NAVY);
    drawText(page, "HST 13%", 384, y - 50, 9, font, SLATE);
    drawText(page, money(invoice.hst), 500, y - 50, 9, font, NAVY);
    page.drawLine({ start: { x: 384, y: y - 66 }, end: { x: 552, y: y - 66 }, thickness: 0.7, color: BORDER });
    drawText(page, "Balance", 384, y - 80, 10, bold, NAVY);
    drawText(page, money(invoice.total), 492, y - 80, 10, bold, NAVY);
  }

  drawMainHeader();
  drawPartySection();
  drawMetaSection();
  drawLineTableHeader();
  invoice.items.forEach(drawItem);
  drawTotalsSection();
  drawFooter();

  return Buffer.from(await pdfDoc.save());
}
