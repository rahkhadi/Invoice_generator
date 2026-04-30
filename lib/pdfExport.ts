import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { InvoiceDraft } from "./types";

function money(value?: number) {
  return `$${(Number(value) || 0).toFixed(2)}`;
}

function safe(value?: string | null) {
  return value?.trim() || "";
}

function drawClippedText(page: any, text: string, options: any, max = 62) {
  const clipped = text.length > max ? `${text.slice(0, max - 3)}...` : text;
  page.drawText(clipped, options);
}

export async function buildInvoicePdf(invoice: InvoiceDraft) {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.07, 0.1, 0.16);
  const orange = rgb(0.98, 0.45, 0.08);
  let page = pdfDoc.addPage([612, 792]);
  let y = 740;

  function drawInvoiceHeader() {
    y = 740;
    page.drawText("CONSTRUCTION INVOICE", { x: 48, y, size: 21, font: bold, color: navy });
    page.drawText(invoice.invoiceNumber, { x: 410, y: y + 4, size: 12, font: bold, color: orange });
    y -= 34;

    page.drawText("From", { x: 48, y, size: 10, font: bold, color: orange });
    page.drawText("Work Order From", { x: 320, y, size: 10, font: bold, color: orange });
    y -= 16;
    drawClippedText(page, safe(invoice.myCompanyName) || "Your Company", { x: 48, y, size: 11, font: bold, color: navy }, 42);
    drawClippedText(page, safe(invoice.company) || "Work order company", { x: 320, y, size: 11, font: bold, color: navy }, 38);
    y -= 15;
    drawClippedText(page, `GST/HST: ${safe(invoice.myCompanyGstNumber) || ""}`, { x: 48, y, size: 9, font, color: navy }, 44);
    drawClippedText(page, safe(invoice.companyAddress), { x: 320, y, size: 9, font, color: navy }, 44);
    y -= 14;
    drawClippedText(page, safe(invoice.myCompanyAddress), { x: 48, y, size: 9, font, color: navy }, 46);
    drawClippedText(page, safe(invoice.companyPhone), { x: 320, y, size: 9, font, color: navy }, 44);
    y -= 22;

    page.drawText(`Status: ${invoice.status}`, { x: 48, y, size: 9, font, color: navy });
    page.drawText(`Date: ${invoice.date || ""}`, { x: 160, y, size: 9, font, color: navy });
    page.drawText(`Deadline: ${invoice.deadline || ""}`, { x: 278, y, size: 9, font, color: navy });
    page.drawText(`Order #: ${invoice.workOrderNumber || ""}`, { x: 410, y, size: 9, font, color: navy });
    y -= 14;
    page.drawText(`Id #: ${invoice.workOrderId || ""}`, { x: 48, y, size: 9, font, color: navy });
    page.drawText(`Completed by: ${invoice.contractor || ""}`, { x: 160, y, size: 9, font, color: navy });
    page.drawText(`W/o Type: ${invoice.workOrderType || ""}`, { x: 360, y, size: 9, font, color: navy });
    y -= 16;
    drawClippedText(page, `Sold to: ${safe(invoice.soldToName)}`, { x: 48, y, size: 9, font, color: navy }, 72);
    y -= 13;
    drawClippedText(page, `Sold to address: ${safe(invoice.soldToAddress)}`, { x: 48, y, size: 8, font, color: navy }, 94);
    y -= 13;
    drawClippedText(page, `Job site: ${safe(invoice.address)} ${safe(invoice.suite) ? `Unit ${safe(invoice.suite)}` : ""}`, { x: 48, y, size: 9, font, color: navy }, 94);
    y -= 13;
    page.drawText(`Classification: ${invoice.classification || ""}`, { x: 48, y, size: 9, font, color: navy });
    y -= 22;
  }

  function drawTableHeader() {
    page.drawRectangle({ x: 48, y: y - 6, width: 516, height: 24, color: navy });
    page.drawText("Area", { x: 56, y, size: 9, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Description", { x: 135, y, size: 9, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Qty", { x: 370, y, size: 9, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Rate", { x: 420, y, size: 9, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Total", { x: 500, y, size: 9, font: bold, color: rgb(1, 1, 1) });
    y -= 24;
  }

  function addContinuationPage() {
    page = pdfDoc.addPage([612, 792]);
    y = 740;
    page.drawText("CONSTRUCTION INVOICE", { x: 48, y, size: 16, font: bold, color: navy });
    page.drawText(`${invoice.invoiceNumber} continued`, { x: 390, y: y + 2, size: 10, font: bold, color: orange });
    y -= 34;
    drawTableHeader();
  }

  drawInvoiceHeader();
  drawTableHeader();

  for (const item of invoice.items) {
    if (y < 92) addContinuationPage();
    const description = item.description.length > 42 ? `${item.description.slice(0, 39)}...` : item.description;
    page.drawText(item.area || "GENERAL", { x: 56, y, size: 8, font, color: navy });
    page.drawText(description, { x: 135, y, size: 8, font, color: navy });
    page.drawText(String(item.qty), { x: 372, y, size: 8, font, color: navy });
    page.drawText(money(item.unitPrice), { x: 420, y, size: 8, font, color: navy });
    page.drawText(money(item.lineTotal), { x: 500, y, size: 8, font, color: navy });
    y -= 18;
  }

  if (y < 170) {
    page = pdfDoc.addPage([612, 792]);
    y = 740;
  } else {
    y -= 12;
  }
  page.drawText("Payment Terms", { x: 48, y, size: 10, font: bold, color: navy });
  page.drawText(invoice.paymentTerms || "Net 30", { x: 48, y: y - 16, size: 9, font, color: navy });
  page.drawText("Notes", { x: 48, y: y - 40, size: 10, font: bold, color: navy });
  page.drawText((invoice.notes || "").slice(0, 110), { x: 48, y: y - 56, size: 9, font, color: navy });
  page.drawText(`Subtotal ${money(invoice.subtotal)}`, { x: 410, y, size: 11, font, color: navy });
  page.drawText(`HST 13% ${money(invoice.hst)}`, { x: 410, y: y - 20, size: 11, font, color: navy });
  page.drawText(`Total ${money(invoice.total)}`, { x: 410, y: y - 48, size: 15, font: bold, color: orange });

  return Buffer.from(await pdfDoc.save());
}
